import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { signatureId } = await req.json();
    console.log('Finalizing DocuSeal signature:', signatureId);

    if (!signatureId) {
      throw new Error('Missing signatureId');
    }

    // Fetch signature record
    const { data: signature, error: sigError } = await supabaseClient
      .from('contract_signatures')
      .select(`
        *,
        property_tenants!inner(property_id, tenant_id),
        properties!inner(manager_id)
      `)
      .eq('id', signatureId)
      .single();

    if (sigError || !signature) {
      console.error('Error fetching signature:', sigError);
      throw new Error('Signature not found');
    }

    // Verify user authorization
    const isManager = signature.properties.manager_id === user.id;
    const isTenant = signature.property_tenants.tenant_id === user.id;

    if (!isManager && !isTenant) {
      throw new Error('Not authorized for this signature');
    }

    if (!signature.docuseal_submission_id) {
      throw new Error('DocuSeal submission not found');
    }

    const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');
    const docusealApiUrl = Deno.env.get('DOCUSEAL_API_URL') || 'https://api.docuseal.co';

    if (!docusealApiKey) {
      throw new Error('DOCUSEAL_API_KEY not configured');
    }

    // Fetch submission status from DocuSeal
    const submissionResponse = await fetch(
      `${docusealApiUrl}/submissions/${signature.docuseal_submission_id}`,
      {
        headers: {
          'X-Auth-Token': docusealApiKey,
        },
      }
    );

    if (!submissionResponse.ok) {
      throw new Error(`DocuSeal API error: ${submissionResponse.statusText}`);
    }

    const submissionData = await submissionResponse.json();
    console.log('DocuSeal submission status:', submissionData);

    const updateData: any = {};

    // Check if manager signed
    const managerSubmitter = submissionData.submitters?.find((s: any) => s.role === 'Manager');
    if (managerSubmitter?.completed_at && !signature.manager_signed_at) {
      updateData.manager_signed_at = new Date(managerSubmitter.completed_at).toISOString();
      updateData.manager_signature_method = 'docuseal';
      updateData.manager_signature_ip = managerSubmitter.ip || null;
      updateData.docuseal_manager_document_url = managerSubmitter.document_url || null;
      console.log('Manager signature recorded');
    }

    // Check if tenant signed
    const tenantSubmitter = submissionData.submitters?.find((s: any) => s.role === 'Tenant');
    if (tenantSubmitter?.completed_at && !signature.tenant_signed_at) {
      updateData.tenant_signed_at = new Date(tenantSubmitter.completed_at).toISOString();
      updateData.tenant_signature_method = 'docuseal';
      updateData.tenant_signature_ip = tenantSubmitter.ip || null;
      updateData.docuseal_tenant_document_url = tenantSubmitter.document_url || null;
      console.log('Tenant signature recorded');
    }

    // If both signed, download and store the final PDF
    if (managerSubmitter?.completed_at && tenantSubmitter?.completed_at) {
      console.log('Both parties signed, downloading PDF...');

      // Download signed PDF
      const pdfResponse = await fetch(submissionData.audit_log_url || submissionData.document_url, {
        headers: {
          'X-Auth-Token': docusealApiKey,
        },
      });

      if (!pdfResponse.ok) {
        throw new Error('Failed to download signed PDF');
      }

      const pdfBlob = await pdfResponse.blob();
      const pdfBuffer = await pdfBlob.arrayBuffer();

      // Upload to Supabase Storage
      const fileName = `contract-${signature.id}-signed.pdf`;
      const filePath = `${signature.property_id}/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('property-documents')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from('property-documents')
        .getPublicUrl(filePath);

      updateData.signed_document_url = urlData.publicUrl;
      updateData.workflow_status = 'completed';
      updateData.completed_at = new Date().toISOString();
      updateData.docuseal_audit_log_url = submissionData.audit_log_url;

      console.log('PDF uploaded successfully:', filePath);
    } else {
      updateData.workflow_status = 'in_progress';
    }

    // Update signature record
    const { data: updated, error: updateError } = await supabaseClient
      .from('contract_signatures')
      .update(updateData)
      .eq('id', signatureId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating signature:', updateError);
      throw updateError;
    }

    console.log('Signature finalized successfully:', updated);

    return new Response(
      JSON.stringify({
        success: true,
        signature: updated,
        both_signed: !!updateData.completed_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in finalize-docuseal-signature:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
