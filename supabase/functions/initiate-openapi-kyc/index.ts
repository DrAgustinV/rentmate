import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { createOpenAPIIDVClient, VerificationLevel } from "../_shared/openapi-idv-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for auth header
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header present:', !!authHeader);
    console.log('🔐 Auth header starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Auth session missing!' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('📡 Supabase client initialized, attempting auth...');

    // Extract JWT token and get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

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

    // Get user profile to fetch email and name
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
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

    // Build callback URL (webhook for verification completion)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const callbackUrl = `${supabaseUrl}/functions/v1/verify-openapi-kyc`;
    
    // Build redirect URL (where to send user after verification)
    const siteUrl = Deno.env.get('SITE_URL') || `${supabaseUrl?.replace('supabase.co', 'lovable.app')}`;
    const redirectUrl = `${siteUrl}/identity`;

    // Build user name if available
    const userName = profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : undefined;

    console.log('📤 Initiating verification with:');
    console.log('  - Email:', profile.email);
    console.log('  - Name:', userName || '(not provided)');
    console.log('  - Callback URL:', callbackUrl);
    console.log('  - Redirect URL:', redirectUrl);

    // Initiate verification with correct payload structure
    const verification = await idvClient.initiateVerification({
      level: level as VerificationLevel,
      callbackUrl,
      redirectUrl,
      userData: {
        userId: user.id,
        email: profile.email,
        name: userName,
      },
    });

    // Update profile with verification details
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        kyc_status: 'pending',
        kyc_provider: `openapi_${level}`,
        kyc_credential_id: verification.id,
        kyc_qr_code_url: verification.verificationUrl,
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
    console.log('  - Verification ID:', verification.id);
    console.log('  - Verification URL:', verification.verificationUrl);

    return new Response(
      JSON.stringify({
        success: true,
        verificationId: verification.id,
        qrCodeUrl: verification.verificationUrl,
        verificationUrl: verification.verificationUrl,
        level,
        message: `Click the link or scan the QR code to complete ${level} verification`,
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
