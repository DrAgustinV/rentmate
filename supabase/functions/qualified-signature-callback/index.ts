import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getProviderByCode } from "../_shared/signature-providers.ts";

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

    const payload = await req.json();
    console.log('Received callback payload:', JSON.stringify(payload, null, 2));

    const { sessionId } = payload;

    if (!sessionId) {
      throw new Error('Missing session ID');
    }

    // Find signature record
    const { data: signature, error: signatureError } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('qualified_signature_session_id', sessionId)
      .single();

    if (signatureError || !signature) {
      console.error('Signature not found:', signatureError);
      throw new Error('Invalid session');
    }

    // Get provider
    const provider = getProviderByCode(signature.qualified_signature_provider);
    if (!provider) {
      throw new Error(`Unknown provider: ${signature.qualified_signature_provider}`);
    }

    // Validate callback using provider-specific logic
    const validation = provider.validateCallback(payload);

    if (!validation.isValid) {
      // Log error
      await supabase
        .from('qualified_signature_logs')
        .insert({
          contract_signature_id: signature.id,
          session_id: sessionId,
          provider_code: provider.code,
          event_type: 'error',
          error_message: validation.errorMessage || 'Unknown error',
        });

      return new Response(
        JSON.stringify({
          success: false,
          error: validation.errorMessage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Store signed PDF in storage
    const fileName = `${signature.id}/signed-${Date.now()}.pdf`;
    
    // Convert base64 to Uint8Array for Deno
    const binaryString = atob(validation.signedDocument!);
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
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to store signed document');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('qualified-contracts')
      .getPublicUrl(fileName);

    // Determine which party is signing (manager or tenant)
    const { data: { user } } = await supabase.auth.getUser();
    const isManager = user && signature.initiated_by === user.id;
    
    // Update signature record
    const updates: any = {
      signed_document_url: publicUrl,
    };

    if (isManager) {
      updates.manager_signed_at = new Date().toISOString();
      updates.manager_signature_method = provider.code;
      updates.manager_signature_data = {
        certificate: validation.certificateInfo,
        signatureAlgorithm: 'SHA256withRSA',
        provider: provider.name,
      };
    } else {
      updates.tenant_signed_at = new Date().toISOString();
      updates.tenant_signature_method = provider.code;
      updates.tenant_signature_data = {
        certificate: validation.certificateInfo,
        signatureAlgorithm: 'SHA256withRSA',
        provider: provider.name,
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
      console.error('Error updating signature:', updateError);
      throw new Error('Failed to update signature');
    }

    // Log successful signature
    await supabase
      .from('qualified_signature_logs')
      .insert({
        contract_signature_id: signature.id,
        session_id: sessionId,
        provider_code: provider.code,
        event_type: bothSigned ? 'completed' : 'signed',
        certificate_info: validation.certificateInfo,
        signature_data: validation.signedDocument?.substring(0, 100),
      });

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

  } catch (error: any) {
    console.error('Error processing signature callback:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
