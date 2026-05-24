import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAPIClient } from "../_shared/openapi-client.ts";

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

    const { signatureId, otpCode } = await req.json();

    console.log(`Verifying OTP for signature ${signatureId}`);

    // Get signature record
    const { data: signature, error: sigError } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('id', signatureId)
      .single();

    if (sigError || !signature) {
      throw new Error('Signature not found');
    }

    const openapiSignatureId = signature.qualified_signature_metadata?.openapi_signature_id;
    if (!openapiSignatureId) {
      throw new Error('Missing OpenAPI signature ID');
    }

    // Verify OTP
    const client = createOpenAPIClient();
    const verifyResult = await client.verifyOTP(openapiSignatureId, otpCode);

    console.log('OTP verification result:', verifyResult.state);

    if (verifyResult.state !== 'DONE') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OTP verification pending or failed',
          state: verifyResult.state,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Download signed document
    const signedDocumentBase64 = await client.downloadSignedDocument(openapiSignatureId);

    // Store signed PDF
    const fileName = `${signature.id}/signed-openapi-${Date.now()}.pdf`;
    const binaryString = atob(signedDocumentBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const { data: upload, error: uploadError } = await supabase.storage
      .from('qualified-contracts')
      .upload(fileName, bytes, {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.error('Storage error:', uploadError);
      throw new Error('Failed to store signed document');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('qualified-contracts')
      .getPublicUrl(fileName);

    console.log('Signed document stored at:', publicUrl);

    // Determine which party is signing
    const isManager = signature.initiated_by === user.id;
    
    const updates: {
      signed_document_url: string;
      manager_signed_at?: string;
      manager_signature_method?: string;
      manager_signature_data?: Record<string, unknown>;
      tenant_signed_at?: string;
      tenant_signature_method?: string;
      tenant_signature_data?: Record<string, unknown>;
      workflow_status?: string;
      completed_at?: string;
    } = {
      signed_document_url: publicUrl,
    };

    if (isManager) {
      updates.manager_signed_at = new Date().toISOString();
      updates.manager_signature_method = 'openapi';
      updates.manager_signature_data = {
        signatureId: openapiSignatureId,
        certificateInfo: verifyResult.certificateInfo,
        signatureAlgorithm: 'SHA256withRSA',
        provider: 'OpenAPI.com QES',
      };
    } else {
      updates.tenant_signed_at = new Date().toISOString();
      updates.tenant_signature_method = 'openapi';
      updates.tenant_signature_data = {
        signatureId: openapiSignatureId,
        certificateInfo: verifyResult.certificateInfo,
        signatureAlgorithm: 'SHA256withRSA',
        provider: 'OpenAPI.com QES',
      };
    }

    // Check if both parties signed
    const bothSigned = 
      (isManager && signature.tenant_signed_at) || 
      (!isManager && signature.manager_signed_at);

    if (bothSigned) {
      updates.workflow_status = 'completed';
      updates.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('contract_signatures')
      .update(updates)
      .eq('id', signature.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update signature');
    }

    // Log successful signature
    await supabase
      .from('qualified_signature_logs')
      .insert({
        contract_signature_id: signature.id,
        session_id: signature.qualified_signature_session_id,
        provider_code: 'openapi',
        event_type: bothSigned ? 'completed' : 'signed',
        certificate_info: verifyResult.certificateInfo,
      });

    console.log(`Signature ${bothSigned ? 'completed' : 'partially signed'}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: bothSigned ? 'completed' : 'partially_signed',
        message: bothSigned 
          ? 'Contract fully signed by both parties' 
          : 'Signature recorded successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error verifying OTP:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
