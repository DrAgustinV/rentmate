import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createDiditClient } from '../_shared/didit-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Check Didit KYC Status
 * 
 * This endpoint allows users to manually poll their Didit verification status.
 * Useful as a fallback when webhooks fail to update the profile.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[check-didit-kyc-status] Request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[check-didit-kyc-status] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[check-didit-kyc-status] User authenticated:', user.id);

    // Get user's profile to find Didit session ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('kyc_status, kyc_provider, kyc_credential_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[check-didit-kyc-status] Profile error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has a Didit verification in progress
    if (profile.kyc_provider !== 'didit') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No Didit verification found',
          current_provider: profile.kyc_provider 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.kyc_credential_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No Didit session ID found',
          current_status: profile.kyc_status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = profile.kyc_credential_id;
    console.log('[check-didit-kyc-status] Checking Didit session:', sessionId);

    // Create Didit client and fetch session decision
    const diditClient = createDiditClient();
    const decision = await diditClient.getSessionDecision(sessionId);

    console.log('[check-didit-kyc-status] Didit decision:', JSON.stringify(decision));

    // Map Didit status to our KYC status
    let newKycStatus = profile.kyc_status;
    let walletDid: string | null = null;

    switch (decision.status) {
      case 'approved':
        newKycStatus = 'verified';
        if (decision.extracted_data?.document_number) {
          walletDid = decision.extracted_data.document_number;
        }
        console.log('[check-didit-kyc-status] Status: APPROVED');
        break;

      case 'declined':
        newKycStatus = 'rejected';
        console.log('[check-didit-kyc-status] Status: DECLINED');
        break;

      case 'pending':
      case 'created':
        newKycStatus = 'pending';
        console.log('[check-didit-kyc-status] Status: PENDING');
        break;

      case 'expired':
      case 'abandoned':
        newKycStatus = 'expired';
        console.log('[check-didit-kyc-status] Status: EXPIRED/ABANDONED');
        break;

      default:
        console.log('[check-didit-kyc-status] Unknown status:', decision.status);
    }

    // Only update if status changed
    if (newKycStatus !== profile.kyc_status) {
      console.log('[check-didit-kyc-status] Updating status from', profile.kyc_status, 'to', newKycStatus);

      // Use service role client for updating
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

      const updateData: Record<string, unknown> = {
        kyc_status: newKycStatus,
      };

      if (newKycStatus === 'verified') {
        updateData.kyc_verified_at = new Date().toISOString();
        // Set expiry to 1 year from now
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        updateData.kyc_expires_at = expiryDate.toISOString();
        
        if (walletDid) {
          updateData.kyc_wallet_did = walletDid;
        }

        // Store extracted KYC data
        if (decision.extracted_data) {
          updateData.kyc_data = {
            provider: 'didit',
            extracted_at: new Date().toISOString(),
            first_name: decision.extracted_data.first_name || null,
            last_name: decision.extracted_data.last_name || null,
            date_of_birth: decision.extracted_data.date_of_birth || null,
            document_type: decision.extracted_data.document_type || null,
            document_number: decision.extracted_data.document_number || null,
            country: decision.extracted_data.country || null,
            expiry_date: decision.extracted_data.expiry_date || null,
          };
        }
      }

      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        console.error('[check-didit-kyc-status] Update error:', updateError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to update profile',
            didit_status: decision.status 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[check-didit-kyc-status] Profile updated successfully');
    } else {
      console.log('[check-didit-kyc-status] No status change needed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newKycStatus,
        previous_status: profile.kyc_status,
        didit_status: decision.status,
        updated: newKycStatus !== profile.kyc_status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-didit-kyc-status] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
