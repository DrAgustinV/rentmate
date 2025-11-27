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

    // OpenAPI callback payload structure:
    // {
    //   id: "verification_id",
    //   state: "VALID" | "INVALID" | "NEW" | etc,
    //   status: "completed" | "pending_redirection" | etc,
    //   email: "user@example.com",
    //   name: "User Name",
    //   callback: {
    //     url: "...",
    //     custom: { userId: "..." }
    //   },
    //   documents: [{ type, number, ... }],
    //   riskLabels: [],
    //   ...
    // }
    
    const { 
      id: verificationId, 
      state,
      status,
      callback,
      documents,
      name: verifiedName,
    } = payload;

    // Extract userId from callback.custom (our custom data)
    const userId = callback?.custom?.userId;

    if (!verificationId) {
      console.error('❌ Missing verificationId in callback');
      return new Response(
        JSON.stringify({ error: 'Missing verificationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to find user by userId from callback, or fall back to credential_id lookup
    let profile;
    let findError;

    if (userId) {
      console.log(`🔍 Looking up user by userId from callback: ${userId}`);
      const result = await supabaseClient
        .from('profiles')
        .select('id, email, kyc_provider')
        .eq('id', userId)
        .single();
      profile = result.data;
      findError = result.error;
    }

    // Fallback: lookup by credential_id if userId not found
    if (!profile) {
      console.log(`🔍 Falling back to lookup by kyc_credential_id: ${verificationId}`);
      const result = await supabaseClient
        .from('profiles')
        .select('id, email, kyc_provider')
        .eq('kyc_credential_id', verificationId)
        .single();
      profile = result.data;
      findError = result.error;
    }

    if (findError || !profile) {
      console.error('❌ Failed to find user for verification:', findError);
      return new Response(
        JSON.stringify({ error: 'User not found for this verification' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Processing verification for user ${profile.id}`);

    // Determine new status based on verification result
    // OpenAPI states: NEW, VALID, INVALID, EXPIRED, etc.
    let newStatus: string;
    let verifiedAt: string | null = null;
    let expiresAt: string | null = null;

    if (state === 'VALID') {
      newStatus = 'verified';
      verifiedAt = new Date().toISOString();
      
      // Set expiry based on verification level
      const isExpertLevel = profile.kyc_provider === 'openapi_expert';
      const expiryYears = isExpertLevel ? 5 : 2; // Expert verification valid longer
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + expiryYears);
      expiresAt = expiry.toISOString();
    } else if (state === 'INVALID' || status === 'failed') {
      newStatus = 'rejected';
    } else {
      // Still processing or pending
      newStatus = 'in_progress';
    }

    // Extract document number if available
    const documentNumber = documents?.[0]?.number || null;

    // Update profile with verification result
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        kyc_status: newStatus,
        kyc_verified_at: verifiedAt,
        kyc_expires_at: expiresAt,
        kyc_wallet_did: documentNumber, // Store document number in DID field for reference
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
    if (documentNumber) {
      console.log(`  - Document number: ${documentNumber}`);
    }
    if (verifiedName) {
      console.log(`  - Verified name: ${verifiedName}`);
    }

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
