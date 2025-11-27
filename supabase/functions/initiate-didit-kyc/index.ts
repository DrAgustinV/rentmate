import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createDiditClient } from '../_shared/didit-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[initiate-didit-kyc] Function started');

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[initiate-didit-kyc] Auth error:', authError);
      throw new Error('Not authenticated');
    }

    console.log('[initiate-didit-kyc] User authenticated:', user.id);

    // Check current KYC status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('kyc_status, kyc_provider, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[initiate-didit-kyc] Profile fetch error:', profileError);
      throw new Error('Failed to fetch profile');
    }

    // Check if already verified
    if (profile.kyc_status === 'verified') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Already verified',
          kyc_status: profile.kyc_status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Didit client
    const diditClient = createDiditClient();

    // Build callback URL for webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/verify-didit-kyc`;
    
    console.log('[initiate-didit-kyc] Creating Didit session with callback:', webhookUrl);

    // Create verification session
    const session = await diditClient.createSession(
      user.id,
      webhookUrl,
      profile.email || user.email
    );

    console.log('[initiate-didit-kyc] Didit session created:', session.session_id);

    // Update profile with session info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_status: 'pending',
        kyc_provider: 'didit',
        kyc_credential_id: session.session_id,
        kyc_qr_code_url: session.verification_url,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[initiate-didit-kyc] Profile update error:', updateError);
      throw new Error('Failed to update profile with session info');
    }

    console.log('[initiate-didit-kyc] Profile updated, returning success');

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.session_id,
        verification_url: session.verification_url,
        qr_code_url: session.qr_code_url || session.verification_url,
        kyc_status: 'pending',
        message: 'Verification session created. Please complete verification using the provided URL.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[initiate-didit-kyc] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
