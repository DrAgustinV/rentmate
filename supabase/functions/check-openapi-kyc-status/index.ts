import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createOpenAPIIDVClient } from "../_shared/openapi-idv-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Checking OpenAPI KYC status for user ${user.id}`);

    // Get user profile with KYC details
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('kyc_credential_id, kyc_provider, kyc_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Failed to fetch profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has OpenAPI verification in progress
    if (!profile.kyc_credential_id || !profile.kyc_provider?.startsWith('openapi_')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No OpenAPI verification found for this user',
          currentStatus: profile.kyc_status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract verification level from provider field
    const level = profile.kyc_provider.replace('openapi_', '') as 'basic' | 'advanced' | 'expert';

    // Create OpenAPI IDV client and fetch status
    const idvClient = createOpenAPIIDVClient();
    const verification = await idvClient.getVerificationStatus(
      profile.kyc_credential_id,
      level
    );

    console.log('✅ Verification status fetched:', verification.status);

    // Update profile if status changed
    if (verification.status === 'completed' && profile.kyc_status !== 'verified') {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          kyc_status: verification.result?.verified ? 'verified' : 'rejected',
          kyc_verified_at: verification.result?.verified ? new Date().toISOString() : null,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('⚠️ Failed to update status, but will return current state:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verificationId: verification.id,
        status: verification.status,
        level,
        result: verification.result,
        completedAt: verification.completedAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in check-openapi-kyc-status:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
