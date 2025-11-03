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
    console.log('Initiating KILT KYC verification');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    console.log('User authenticated:', user.id);

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('kyc_status, dock_kyc_credential_id, kyc_verified_at, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (profile.kyc_status === 'verified' && profile.kyc_verified_at) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User already has verified KYC',
          kyc_status: profile.kyc_status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check for KILT configuration
    const kiltNetwork = Deno.env.get('KILT_NETWORK') || 'peregrine';
    const attesterDid = Deno.env.get('KILT_ATTESTER_DID');
    
    if (!attesterDid) {
      throw new Error('KILT not configured. Please set up KILT_ATTESTER_DID and KILT_ATTESTER_MNEMONIC');
    }

    // Generate credential ID (UUID v4)
    const credentialId = crypto.randomUUID();

    // Create credential request data
    const credentialData = {
      credentialId,
      attester: attesterDid,
      subject: {
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous',
        email: profile.email,
      },
      network: kiltNetwork,
      timestamp: Date.now(),
    };

    // Generate Sporran wallet deep link
    const sporranDeepLink = `sporran://request/attest?data=${encodeURIComponent(JSON.stringify(credentialData))}`;

    // Update profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        dock_kyc_credential_id: credentialId,
        dock_kyc_qr_code_url: sporranDeepLink,
        kyc_status: 'pending',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Failed to update user profile');
    }

    console.log('KILT KYC initiated, credential ID:', credentialId);

    return new Response(
      JSON.stringify({
        success: true,
        credential_id: credentialId,
        qr_code_url: sporranDeepLink,
        kyc_status: 'pending',
        message: 'Scan the QR code with Sporran wallet to complete KYC',
        network: kiltNetwork,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in initiate-kilt-kyc:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Failed to initiate KILT KYC',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
