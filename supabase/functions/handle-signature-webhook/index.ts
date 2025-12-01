import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { signatureId, signerRole, signatureMethod, ipAddress } = await req.json();

    console.log('[Mock Mode] Received signature webhook:', { signatureId, signerRole, signatureMethod });

    if (!signatureId || !signerRole) {
      throw new Error('Missing required fields');
    }

    // Map old signature methods to new SAS/AES/QES format
    const normalizeSignatureMethod = (method: string | undefined): string => {
      if (!method) return 'SAS';
      const upperMethod = method.toUpperCase();
      if (['SAS', 'AES', 'QES'].includes(upperMethod)) return upperMethod;
      // Map legacy values
      if (['certificado_digital', 'clave', 'mock'].includes(method.toLowerCase())) return 'SAS';
      if (['electronic_signature', 'docuseal'].includes(method.toLowerCase())) return 'AES';
      if (method.toLowerCase() === 'qualified_signature') return 'QES';
      return 'SAS'; // Default to SAS
    };

    const normalizedMethod = normalizeSignatureMethod(signatureMethod);

    // Get current signature
    const { data: signature, error: fetchError } = await supabaseAdmin
      .from('contract_signatures')
      .select('*')
      .eq('id', signatureId)
      .single();

    if (fetchError || !signature) {
      throw new Error('Signature not found');
    }

    const now = new Date().toISOString();
    const updateData: any = {};
    let eventType = '';

    // Update based on signer role
    if (signerRole === 'manager') {
      updateData.manager_signed_at = now;
      updateData.manager_signature_method = normalizedMethod;
      updateData.manager_signature_ip = ipAddress || '127.0.0.1';
      eventType = 'manager_signed';
    } else if (signerRole === 'tenant') {
      updateData.tenant_signed_at = now;
      updateData.tenant_signature_method = normalizedMethod;
      updateData.tenant_signature_ip = ipAddress || '127.0.0.1';
      eventType = 'tenant_signed';
    }

    // Check if both signed
    const bothSigned = 
      (signerRole === 'manager' && signature.tenant_signed_at) ||
      (signerRole === 'tenant' && signature.manager_signed_at);

    if (bothSigned) {
      updateData.workflow_status = 'completed';
      updateData.completed_at = now;
      updateData.signed_document_url = `https://mock-storage.example.com/signed-contract-${signatureId}.pdf`;
    }

    // Update signature
    const { error: updateError } = await supabaseAdmin
      .from('contract_signatures')
      .update(updateData)
      .eq('id', signatureId);

    if (updateError) {
      console.error('Error updating signature:', updateError);
      throw new Error('Failed to update signature');
    }

    // Log event
    await supabaseAdmin.from('signature_events').insert({
      contract_signature_id: signatureId,
      event_type: eventType,
      event_data: {
        signer_role: signerRole,
        signature_method: signatureMethod,
        mode: 'mock',
      },
      ip_address: ipAddress || '127.0.0.1',
    });

    // Log completion if both signed
    if (bothSigned) {
      await supabaseAdmin.from('signature_events').insert({
        contract_signature_id: signatureId,
        event_type: 'completed',
        event_data: {
          mode: 'mock',
          both_signed: true,
        },
      });
    }

    console.log('[Mock Mode] Signature processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        signatureId,
        status: bothSigned ? 'completed' : 'in_progress',
        message: bothSigned 
          ? 'Both parties have signed. Contract is complete!' 
          : `${signerRole} signed successfully. Waiting for other party.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
