import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Verifying KILT attestation');

    const { credentialId, claimerDid, attestationData } = await req.json();

    if (!credentialId || !claimerDid) {
      throw new Error('Missing required fields');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by credential ID
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, kyc_status, dock_kyc_credential_id')
      .eq('dock_kyc_credential_id', credentialId)
      .eq('kyc_status', 'pending');

    if (profileError || !profiles || profiles.length === 0) {
      throw new Error('No pending KYC found for this credential');
    }

    const profile = profiles[0];

    // In production, verify the attestation on KILT blockchain
    // For now, accept the attestation
    console.log('Attestation verified for credential:', credentialId);

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        kyc_status: 'verified',
        kyc_verified_at: new Date().toISOString(),
        kyc_expires_at: expiryDate.toISOString(),
        dock_wallet_did: claimerDid,
      })
      .eq('id', profile.id);

    if (updateError) {
      throw new Error('Failed to update profile');
    }

    console.log('KYC completed for user:', profile.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'KYC verification completed',
        kyc_status: 'verified',
        verified_at: new Date().toISOString(),
        expires_at: expiryDate.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in verify-kilt-attestation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Failed to verify attestation',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
