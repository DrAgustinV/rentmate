import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dock-token',
};

interface WebhookEvent {
  event: string;
  data: {
    id?: string;
    did?: string;
    verified?: boolean;
    credentialId?: string;
    credentialSubject?: any;
    expirationDate?: string;
    [key: string]: any;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received Dock webhook event');

    // Verify webhook signature
    const receivedToken = req.headers.get('x-dock-token');
    const expectedToken = Deno.env.get('DOCK_WEBHOOK_SECRET');

    if (!expectedToken) {
      throw new Error('DOCK_WEBHOOK_SECRET not configured');
    }

    if (receivedToken !== expectedToken) {
      console.error('Invalid webhook token');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parse webhook event
    const webhookEvent: WebhookEvent = await req.json();
    console.log('Webhook event type:', webhookEvent.event);
    console.log('Webhook data:', JSON.stringify(webhookEvent.data));

    // Create Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process different event types
    switch (webhookEvent.event) {
      case 'credential_issued': {
        console.log('Processing credential_issued event');
        // Store credential ID, update status to 'in_progress'
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            dock_kyc_credential_id: webhookEvent.data.id,
            kyc_status: 'in_progress',
          })
          .eq('dock_kyc_credential_id', webhookEvent.data.id);

        if (error) {
          console.error('Error updating profile for credential_issued:', error);
        } else {
          console.log('Successfully updated profile with credential ID');
        }
        break;
      }

      case 'proof_submitted': {
        console.log('Processing proof_submitted event');
        // This is the key event - contains verification result
        const credentialId = webhookEvent.data.credentialId || webhookEvent.data.id;

        if (!credentialId) {
          console.error('No credential ID in proof_submitted event');
          break;
        }

        if (webhookEvent.data.verified === true) {
          console.log('Verification successful, updating profile');
          
          // Calculate expiration date (1 year from now)
          const expiresAt = webhookEvent.data.expirationDate 
            ? new Date(webhookEvent.data.expirationDate).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              kyc_status: 'verified',
              kyc_verified_at: new Date().toISOString(),
              kyc_expires_at: expiresAt,
            })
            .eq('dock_kyc_credential_id', credentialId);

          if (error) {
            console.error('Error updating profile for verified status:', error);
          } else {
            console.log('Successfully verified KYC for user');
          }
        } else {
          console.log('Verification failed, updating profile to rejected');
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ kyc_status: 'rejected' })
            .eq('dock_kyc_credential_id', credentialId);

          if (error) {
            console.error('Error updating profile for rejected status:', error);
          }
        }
        break;
      }

      case 'did_create': {
        console.log('Processing did_create event');
        // Store user's Dock Wallet DID
        const did = webhookEvent.data.did;

        if (!did) {
          console.error('No DID in did_create event');
          break;
        }

        // Try to find profile by any available credential ID
        const credentialId = webhookEvent.data.credentialId || webhookEvent.data.id;

        if (credentialId) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({ dock_wallet_did: did })
            .eq('dock_kyc_credential_id', credentialId);

          if (error) {
            console.error('Error updating profile with DID:', error);
          } else {
            console.log('Successfully stored user DID');
          }
        }
        break;
      }

      case 'credential_revoke': {
        console.log('Processing credential_revoke event');
        // Handle revocation (expired credentials)
        const credentialId = webhookEvent.data.id;

        if (!credentialId) {
          console.error('No credential ID in credential_revoke event');
          break;
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ kyc_status: 'expired' })
          .eq('dock_kyc_credential_id', credentialId);

        if (error) {
          console.error('Error updating profile for expired status:', error);
        } else {
          console.log('Successfully marked KYC as expired');
        }
        break;
      }

      default:
        console.log('Unhandled webhook event type:', webhookEvent.event);
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in verify-dock-kyc-webhook:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Webhook processing failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
