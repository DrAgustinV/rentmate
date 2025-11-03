import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dock-token',
};

interface WebhookEvent {
  event: string;
  data: {
    id?: string;
    credential_id?: string;
    credentialId?: string;
    holder?: string;
    did?: string;
    proof?: any;
    verified?: boolean;
    credential_url?: string;
    qrCode?: string;
    [key: string]: any;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received Dock signature webhook event');

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

    const webhookEvent: WebhookEvent = await req.json();
    console.log('Webhook event type:', webhookEvent.event);
    console.log('Webhook data:', JSON.stringify(webhookEvent.data));

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get credential ID from various possible fields
    const credentialId = webhookEvent.data.credential_id || 
                        webhookEvent.data.credentialId || 
                        webhookEvent.data.id;

    if (!credentialId) {
      console.error('No credential ID in webhook data');
      throw new Error('Missing credential ID');
    }

    // Process different event types
    switch (webhookEvent.event) {
      case 'credential_issued': {
        console.log('Processing credential_issued event');
        
        const { error } = await supabaseAdmin
          .from('contract_signatures')
          .update({
            workflow_status: 'awaiting_signatures',
            dock_contract_url: webhookEvent.data.qrCode || webhookEvent.data.credential_url,
          })
          .eq('dock_workflow_id', credentialId);

        if (error) {
          console.error('Error updating signature for credential_issued:', error);
        } else {
          console.log('Successfully updated signature status to awaiting_signatures');
        }
        break;
      }

      case 'proof_submitted': {
        console.log('Processing proof_submitted event - a party has signed');

        // Fetch signature record with related data
        const { data: signature, error: fetchError } = await supabaseAdmin
          .from('contract_signatures')
          .select(`
            *,
            property_tenants!inner(tenant_id),
            properties!inner(manager_id)
          `)
          .eq('dock_workflow_id', credentialId)
          .single();

        if (fetchError || !signature) {
          console.error('Signature not found:', fetchError);
          throw new Error('Signature record not found');
        }

        // Fetch manager and tenant DIDs
        const { data: managerProfile } = await supabaseAdmin
          .from('profiles')
          .select('dock_wallet_did')
          .eq('id', signature.properties.manager_id)
          .single();

        const { data: tenantProfile } = await supabaseAdmin
          .from('profiles')
          .select('dock_wallet_did')
          .eq('id', signature.property_tenants.tenant_id)
          .single();

        if (!managerProfile || !tenantProfile) {
          throw new Error('Could not fetch profiles');
        }

        // Determine which party signed based on DID
        const signerDid = webhookEvent.data.holder || webhookEvent.data.did;
        if (!signerDid) {
          throw new Error('No signer DID in webhook data');
        }

        const isManager = signerDid === managerProfile.dock_wallet_did;
        const isTenant = signerDid === tenantProfile.dock_wallet_did;

        if (!isManager && !isTenant) {
          console.error('Unknown signer DID:', signerDid);
          throw new Error('Unknown signer DID');
        }

        console.log(`Signer identified: ${isManager ? 'Manager' : 'Tenant'}`);

        const updateData: any = {};
        const now = new Date().toISOString();

        if (isManager) {
          updateData.manager_signed_at = now;
          updateData.manager_signature_method = 'dock_vc';
          updateData.dock_manager_signature_proof = JSON.stringify(webhookEvent.data.proof || webhookEvent.data);
        } else {
          updateData.tenant_signed_at = now;
          updateData.tenant_signature_method = 'dock_vc';
          updateData.dock_tenant_signature_proof = JSON.stringify(webhookEvent.data.proof || webhookEvent.data);
        }

        // Check if both have now signed
        const bothSigned = (
          (signature.manager_signed_at || isManager) &&
          (signature.tenant_signed_at || isTenant)
        );

        if (bothSigned) {
          console.log('Both parties have signed - completing contract');
          updateData.workflow_status = 'completed';
          updateData.completed_at = now;
          updateData.signed_document_url = webhookEvent.data.credential_url || signature.dock_contract_url;
        }

        const { error: updateError } = await supabaseAdmin
          .from('contract_signatures')
          .update(updateData)
          .eq('id', signature.id);

        if (updateError) {
          console.error('Error updating signature:', updateError);
          throw updateError;
        }

        // Log signature event
        await supabaseAdmin
          .from('signature_events')
          .insert({
            contract_signature_id: signature.id,
            event_type: bothSigned ? 'signature_completed' : 'signature_received',
            event_data: {
              signer_did: signerDid,
              role: isManager ? 'manager' : 'tenant',
              completed: bothSigned,
            },
          });

        console.log('Successfully processed proof_submitted event');
        break;
      }

      case 'credential_revoked': {
        console.log('Processing credential_revoked event');

        const { error } = await supabaseAdmin
          .from('contract_signatures')
          .update({
            workflow_status: 'cancelled',
          })
          .eq('dock_workflow_id', credentialId);

        if (error) {
          console.error('Error updating signature for credential_revoked:', error);
        } else {
          console.log('Successfully marked signature as cancelled');
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
    console.error('Error in verify-dock-signature-webhook:', error);
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
