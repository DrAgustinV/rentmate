import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createDiditClient } from '../_shared/didit-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[verify-didit-kyc] Webhook received');

    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('[verify-didit-kyc] Webhook payload length:', rawBody.length);

    // Get signature header
    const signature = req.headers.get('x-signature') || '';
    const webhookSecret = Deno.env.get('DIDIT_WEBHOOK_SECRET_KEY');

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const diditClient = createDiditClient();
      const isValid = diditClient.verifyWebhookSignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        console.warn('[verify-didit-kyc] Invalid webhook signature');
        // Continue anyway for now, but log warning
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    console.log('[verify-didit-kyc] Webhook event:', payload.event || payload.status);
    console.log('[verify-didit-kyc] Session ID:', payload.session_id);

    const sessionId = payload.session_id;
    if (!sessionId) {
      throw new Error('Missing session_id in webhook payload');
    }

    // Create admin Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by session ID (stored in kyc_credential_id)
    const { data: profiles, error: findError } = await supabase
      .from('profiles')
      .select('id, kyc_status, kyc_provider')
      .eq('kyc_credential_id', sessionId)
      .eq('kyc_provider', 'didit');

    if (findError || !profiles || profiles.length === 0) {
      console.error('[verify-didit-kyc] Profile not found for session:', sessionId);
      // Return 200 to acknowledge webhook even if profile not found
      return new Response(
        JSON.stringify({ received: true, error: 'Profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profile = profiles[0];
    console.log('[verify-didit-kyc] Found profile:', profile.id);

    // Determine KYC status based on webhook event
    const status = payload.status || payload.decision?.result;
    let newKycStatus = profile.kyc_status;
    let walletDid: string | null = null;

    switch (status) {
      case 'approved':
      case 'Approved':
        newKycStatus = 'verified';
        // Store document info if available
        if (payload.extracted_data?.document_number) {
          walletDid = payload.extracted_data.document_number;
        }
        console.log('[verify-didit-kyc] Verification APPROVED');
        break;

      case 'declined':
      case 'Declined':
      case 'rejected':
        newKycStatus = 'rejected';
        console.log('[verify-didit-kyc] Verification DECLINED');
        break;

      case 'pending':
      case 'in_progress':
        newKycStatus = 'in_progress';
        console.log('[verify-didit-kyc] Verification IN PROGRESS');
        break;

      case 'expired':
      case 'abandoned':
        newKycStatus = 'expired';
        console.log('[verify-didit-kyc] Verification EXPIRED/ABANDONED');
        break;

      default:
        console.log('[verify-didit-kyc] Unknown status:', status);
        // Keep current status
    }

    // Update profile
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

      // Store extracted data if available
      if (payload.extracted_data) {
        console.log('[verify-didit-kyc] Extracted data:', JSON.stringify(payload.extracted_data));
        // Could store in a separate column if needed
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (updateError) {
      console.error('[verify-didit-kyc] Profile update error:', updateError);
      throw new Error('Failed to update profile');
    }

    console.log('[verify-didit-kyc] Profile updated successfully to status:', newKycStatus);

    return new Response(
      JSON.stringify({ 
        received: true, 
        status: newKycStatus,
        user_id: profile.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-didit-kyc] Error:', error);
    
    // Always return 200 to acknowledge webhook receipt
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
