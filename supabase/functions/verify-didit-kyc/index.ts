import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp',
};

/**
 * Verify HMAC-SHA256 signature using Web Crypto API
 * Didit sends the signature as hex, compute using raw body as-is
 */
async function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(rawBody);

    // Import the secret key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the raw body
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);

    // Convert to hex string (matching Didit's format)
    const computedHex = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Also compute base64 for alternative matching
    const computedBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    const matchesHex = computedHex === signature;
    const matchesBase64 = computedBase64 === signature;

    console.log('[verify-didit-kyc] Computed hex:', computedHex);
    console.log('[verify-didit-kyc] Computed b64:', computedBase64);
    console.log('[verify-didit-kyc] Received:', signature);
    console.log('[verify-didit-kyc] Hex match:', matchesHex, 'B64 match:', matchesBase64);

    return matchesHex || matchesBase64;
  } catch (error) {
    console.error('[verify-didit-kyc] HMAC verification error:', error);
    return false;
  }
}

/**
 * Validate timestamp is within acceptable range (5 minutes)
 * Handles both ISO string and Unix timestamp (integer)
 */
function isTimestampValid(timestamp: string): boolean {
  try {
    let webhookTime: number;
    
    // Check if it's a Unix timestamp (numeric string)
    if (/^\d+$/.test(timestamp)) {
      webhookTime = parseInt(timestamp) * 1000; // Convert seconds to milliseconds
    } else {
      // Assume ISO string
      webhookTime = new Date(timestamp).getTime();
    }
    
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    const isValid = Math.abs(now - webhookTime) < fiveMinutes;
    if (!isValid) {
      console.warn('[verify-didit-kyc] Timestamp outside acceptable range:', timestamp);
    }
    return isValid;
  } catch {
    console.warn('[verify-didit-kyc] Failed to parse timestamp:', timestamp);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[verify-didit-kyc] Webhook received');
    console.log('[verify-didit-kyc] Request method:', req.method);
    
    // Log all headers for debugging
    const headerEntries = Object.fromEntries(req.headers.entries());
    console.log('[verify-didit-kyc] Headers:', JSON.stringify(headerEntries));

    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('[verify-didit-kyc] Webhook payload length:', rawBody.length);

    // Handle empty body gracefully (health checks, ping requests)
    if (!rawBody || rawBody.length === 0) {
      console.warn('[verify-didit-kyc] Empty body received - treating as health check');
      return new Response(
        JSON.stringify({ received: true, message: 'No payload received - health check acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signature and timestamp headers (Didit uses x-signature, x-timestamp)
    // Check common header names
    const signature = req.headers.get('x-signature') || 
                     req.headers.get('X-Signature') || 
                     req.headers.get('x-didit-signature') ||
                     req.headers.get('X-Didit-Signature') || '';
    const timestamp = req.headers.get('x-timestamp') || 
                     req.headers.get('X-Timestamp') ||
                     req.headers.get('x-didit-timestamp') || '';
    
    // Get webhook secret (check multiple possible env var names)
    const webhookSecret = Deno.env.get('DIDIT_WEBHOOK_SECRET') || 
                         Deno.env.get('DIDIT_WEBHOOK_SECRET_KEY') || '';

    console.log('[verify-didit-kyc] Signature present:', !!signature, 'Timestamp present:', !!timestamp);

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      // Reject requests without signature when secret is configured
      if (!signature) {
        console.error('[verify-didit-kyc] Webhook secret configured but no signature in request');
        return new Response(
          JSON.stringify({ error: 'Missing signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate timestamp first
      if (timestamp && !isTimestampValid(timestamp)) {
        console.error('[verify-didit-kyc] Timestamp validation failed - rejecting request');
        return new Response(
          JSON.stringify({ error: 'Invalid timestamp' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify HMAC signature
      const isValid = await verifyHmacSignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        console.error('[verify-didit-kyc] Invalid webhook signature - rejecting request');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[verify-didit-kyc] Webhook signature verified successfully');
    }

    // Parse webhook payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[verify-didit-kyc] JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ received: true, error: 'Invalid JSON payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-didit-kyc] Webhook event:', payload.event || payload.status);
    console.log('[verify-didit-kyc] Session ID:', payload.session_id);
    console.log('[verify-didit-kyc] Full payload:', JSON.stringify(payload));

    const sessionId = payload.session_id;
    if (!sessionId) {
      console.error('[verify-didit-kyc] Missing session_id in payload');
      return new Response(
        JSON.stringify({ received: true, error: 'Missing session_id' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

      // Store extracted KYC data in kyc_data JSONB column
      if (payload.extracted_data) {
        console.log('[verify-didit-kyc] Storing extracted data:', JSON.stringify(payload.extracted_data));
        updateData.kyc_data = {
          provider: 'didit',
          extracted_at: new Date().toISOString(),
          first_name: payload.extracted_data.first_name || null,
          last_name: payload.extracted_data.last_name || null,
          full_name: payload.extracted_data.full_name || null,
          date_of_birth: payload.extracted_data.date_of_birth || null,
          document_type: payload.extracted_data.document_type || null,
          document_number: payload.extracted_data.document_number || null,
          document_country: payload.extracted_data.document_country || null,
          address: payload.extracted_data.address || null,
          nationality: payload.extracted_data.nationality || null,
          gender: payload.extracted_data.gender || null,
          raw_data: payload.extracted_data, // Store full payload for reference
        };
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
