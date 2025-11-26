import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

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
    // Initialize Supabase client with service role for callback
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse callback payload from OpenAPI
    const payload = await req.json();
    console.log('📥 OpenAPI KYC callback received:', JSON.stringify(payload, null, 2));

    const { 
      id: verificationId, 
      status, 
      result,
      metadata 
    } = payload;

    if (!verificationId) {
      console.error('❌ Missing verificationId in callback');
      return new Response(
        JSON.stringify({ error: 'Missing verificationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by verification ID
    const { data: profile, error: findError } = await supabaseClient
      .from('profiles')
      .select('id, email, kyc_provider')
      .eq('kyc_credential_id', verificationId)
      .single();

    if (findError || !profile) {
      console.error('❌ Failed to find user for verification:', findError);
      return new Response(
        JSON.stringify({ error: 'User not found for this verification' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Processing verification for user ${profile.id}`);

    // Determine new status based on verification result
    let newStatus: string;
    let verifiedAt: string | null = null;
    let expiresAt: string | null = null;

    if (status === 'completed' && result?.verified === true) {
      newStatus = 'verified';
      verifiedAt = new Date().toISOString();
      
      // Set expiry based on verification level
      const isExpertLevel = profile.kyc_provider === 'openapi_expert';
      const expiryYears = isExpertLevel ? 5 : 2; // Expert verification valid longer
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + expiryYears);
      expiresAt = expiry.toISOString();
    } else if (status === 'failed') {
      newStatus = 'rejected';
    } else {
      newStatus = 'in_progress';
    }

    // Update profile with verification result
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        kyc_status: newStatus,
        kyc_verified_at: verifiedAt,
        kyc_expires_at: expiresAt,
        kyc_wallet_did: result?.documentNumber || null, // Store document number in DID field
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ KYC status updated to ${newStatus} for user ${profile.id}`);

    // TODO: Send email notification to user about verification result
    // Could integrate with Resend here

    return new Response(
      JSON.stringify({
        success: true,
        userId: profile.id,
        status: newStatus,
        message: `Verification ${newStatus}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in verify-openapi-kyc:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
