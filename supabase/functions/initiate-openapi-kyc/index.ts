import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createOpenAPIIDVClient, VerificationLevel } from "../_shared/openapi-idv-client.ts";

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

    // Parse request body
    const { level = 'basic' } = await req.json();
    
    if (!['basic', 'advanced', 'expert'].includes(level)) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification level. Must be: basic, advanced, or expert' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔐 Initiating OpenAPI KYC for user ${user.id} with level: ${level}`);

    // Get user profile to fetch email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Failed to fetch user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create OpenAPI IDV client
    const idvClient = createOpenAPIIDVClient();

    // Build callback URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const callbackUrl = `${supabaseUrl}/functions/v1/verify-openapi-kyc`;

    // Initiate verification
    const verification = await idvClient.initiateVerification({
      level: level as VerificationLevel,
      callbackUrl,
      metadata: {
        userId: user.id,
        email: profile.email,
      },
    });

    // Update profile with verification details
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        kyc_status: 'pending',
        kyc_provider: `openapi_${level}`,
        kyc_credential_id: verification.id,
        kyc_qr_code_url: verification.qrCodeUrl,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ OpenAPI KYC initiated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        verificationId: verification.id,
        qrCodeUrl: verification.qrCodeUrl,
        verificationUrl: verification.verificationUrl,
        level,
        message: `Scan the QR code with your smartphone to complete ${level} verification`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in initiate-openapi-kyc:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
