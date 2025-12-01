import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tenancyId, propertyId, documentId } = await req.json();

    console.log('Initiating YouSign signature:', { tenancyId, propertyId, documentId, userId: user.id });

    // Verify user is property manager
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('country, manager_id, title, address')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    if (property.manager_id !== user.id) {
      throw new Error('Unauthorized: Only property manager can initiate signatures');
    }

    // Require document selection
    if (!documentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please select a document to sign from your tenancy documents.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch document record
    const { data: document, error: docError } = await supabase
      .from('property_documents')
      .select('file_path, file_name, file_type, document_title')
      .eq('id', documentId)
      .eq('tenancy_id', tenancyId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found or does not belong to this tenancy');
    }

    // Download file from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('property-documents')
      .download(document.file_path);

    if (storageError || !fileData) {
      throw new Error('Failed to retrieve document from storage');
    }

    const fileBuffer = await fileData.arrayBuffer();

    // Fetch tenancy and tenant details
    const { data: tenancy, error: tenancyError } = await supabase
      .from('property_tenants')
      .select(`
        id,
        tenant_id,
        profiles!property_tenants_tenant_id_fkey(id, first_name, last_name, email, phone)
      `)
      .eq('id', tenancyId)
      .single();

    if (tenancyError || !tenancy) {
      throw new Error('Tenancy not found');
    }

    const tenant = Array.isArray(tenancy.profiles) ? tenancy.profiles[0] : tenancy.profiles;

    // Fetch manager profile
    const { data: managerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', user.id)
      .single();

    if (!managerProfile) {
      throw new Error('Manager profile not found');
    }

    // Import YouSign client
    const { createYouSignClient } = await import('../_shared/yousign-client.ts');
    const yousignClient = createYouSignClient();

    // Create signature request
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // 30 days to sign

    const signatureRequest = await yousignClient.createSignatureRequest({
      name: `${document.document_title} - ${property.title}`,
      delivery_mode: 'email',
      external_id: tenancyId,
      expiration_date: expirationDate.toISOString().split('T')[0],
    });

    console.log('YouSign signature request created:', signatureRequest.id);

    // Upload document
    const uploadedDoc = await yousignClient.uploadDocument(
      signatureRequest.id,
      fileBuffer,
      document.file_name
    );

    console.log('Document uploaded to YouSign:', uploadedDoc.id);

    // Add manager as first signer
    const managerSigner = await yousignClient.addSigner(
      signatureRequest.id,
      uploadedDoc.id,
      {
        info: {
          first_name: managerProfile.first_name || 'Manager',
          last_name: managerProfile.last_name || '',
          email: managerProfile.email,
          phone_number: managerProfile.phone,
          locale: 'en',
        },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'otp_email',
        fields: [
          {
            type: 'signature',
            page: 1,
            x: 100,
            y: 650,
            width: 180,
            height: 60,
          },
        ],
      }
    );

    console.log('Manager signer added:', managerSigner.id);

    // Add tenant as second signer
    const tenantSigner = await yousignClient.addSigner(
      signatureRequest.id,
      uploadedDoc.id,
      {
        info: {
          first_name: tenant.first_name || 'Tenant',
          last_name: tenant.last_name || '',
          email: tenant.email,
          phone_number: tenant.phone,
          locale: 'en',
        },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'otp_email',
        fields: [
          {
            type: 'signature',
            page: 1,
            x: 320,
            y: 650,
            width: 180,
            height: 60,
          },
        ],
      }
    );

    console.log('Tenant signer added:', tenantSigner.id);

    // Activate the signature request (start the process)
    const activatedRequest = await yousignClient.activateSignatureRequest(signatureRequest.id);

    console.log('YouSign signature request activated:', activatedRequest.status);

    // Create signature record in database
    const { data: signature, error: signatureError } = await supabase
      .from('contract_signatures')
      .insert({
        tenancy_id: tenancyId,
        property_id: propertyId,
        signing_method_provider: 'yousign',
        signature_method: 'AES',
        workflow_status: 'pending',
        qualified_signature_provider: 'yousign',
        qualified_signature_session_id: signatureRequest.id,
        qualified_signature_metadata: {
          yousign_request_id: signatureRequest.id,
          yousign_document_id: uploadedDoc.id,
          manager_signer_id: managerSigner.id,
          tenant_signer_id: tenantSigner.id,
          manager_signature_link: managerSigner.signature_link,
          tenant_signature_link: tenantSigner.signature_link,
          status: activatedRequest.status,
        },
        source_document_id: documentId,
        initiated_by: user.id,
        expires_at: expirationDate.toISOString(),
      })
      .select()
      .single();

    if (signatureError) {
      console.error('Error creating signature record:', signatureError);
      throw new Error('Failed to create signature record');
    }

    // Log initiation event
    await supabase
      .from('qualified_signature_logs')
      .insert({
        contract_signature_id: signature.id,
        session_id: signatureRequest.id,
        provider_code: 'yousign',
        event_type: 'initiated',
      });

    return new Response(
      JSON.stringify({
        success: true,
        signatureId: signature.id,
        yousignRequestId: signatureRequest.id,
        managerSignatureLink: managerSigner.signature_link,
        tenantSignatureLink: tenantSigner.signature_link,
        message: 'YouSign signature request created. Both parties will receive email invitations.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error initiating YouSign signature:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
