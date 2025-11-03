import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dock-token',
};

interface SignatureWebhookEvent {
  event: string;
  data: {
    workflowId?: string;
    signerId?: string;
    signerEmail?: string;
    signerRole?: string;
    signatureProof?: string;
    signedAt?: string;
    documentUrl?: string;
    status?: string;
    allSignaturesComplete?: boolean;
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

    // Parse webhook event
    const webhookEvent: SignatureWebhookEvent = await req.json();
    console.log('Webhook event type:', webhookEvent.event);
    console.log('Webhook data:', JSON.stringify(webhookEvent.data));

    // Create Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const workflowId = webhookEvent.data.workflowId;

    if (!workflowId) {
      console.error('No workflow ID in webhook event');
      return new Response(
        JSON.stringify({ error: 'Missing workflow ID' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Process different signature events
    switch (webhookEvent.event) {
      case 'signature_requested':
      case 'workflow_created': {
        console.log('Processing workflow creation event');
        const { error } = await supabaseAdmin
          .from('contract_signatures')
          .update({
            workflow_status: 'pending',
          })
          .eq('dock_workflow_id', workflowId);

        if (error) {
          console.error('Error updating signature status:', error);
        }

        // Log event
        const { data: signature } = await supabaseAdmin
          .from('contract_signatures')
          .select('id')
          .eq('dock_workflow_id', workflowId)
          .single();

        if (signature) {
          await supabaseAdmin.from('signature_events').insert({
            contract_signature_id: signature.id,
            event_type: 'workflow_created',
            event_data: webhookEvent.data,
          });
        }
        break;
      }

      case 'signature_completed':
      case 'document_signed': {
        console.log('Processing signature completion event');
        const signerRole = webhookEvent.data.signerRole?.toLowerCase();
        const signatureProof = webhookEvent.data.signatureProof;
        const signedAt = webhookEvent.data.signedAt
          ? new Date(webhookEvent.data.signedAt).toISOString()
          : new Date().toISOString();

        const updateData: any = {};

        if (signerRole === 'manager') {
          updateData.manager_signed_at = signedAt;
          updateData.dock_manager_signature_proof = signatureProof;
          updateData.manager_signature_method = 'dock';
        } else if (signerRole === 'tenant') {
          updateData.tenant_signed_at = signedAt;
          updateData.dock_tenant_signature_proof = signatureProof;
          updateData.tenant_signature_method = 'dock';
        }

        // Check if all signatures are complete
        if (webhookEvent.data.allSignaturesComplete) {
          updateData.workflow_status = 'completed';
          updateData.completed_at = new Date().toISOString();
          updateData.signed_document_url = webhookEvent.data.documentUrl;
        } else {
          updateData.workflow_status = 'in_progress';
        }

        const { data: signature, error } = await supabaseAdmin
          .from('contract_signatures')
          .update(updateData)
          .eq('dock_workflow_id', workflowId)
          .select()
          .single();

        if (error) {
          console.error('Error updating signature:', error);
        } else {
          console.log('Signature updated successfully');

          // Log event
          await supabaseAdmin.from('signature_events').insert({
            contract_signature_id: signature.id,
            event_type: 'signature_completed',
            event_data: {
              signer_role: signerRole,
              signed_at: signedAt,
              all_complete: webhookEvent.data.allSignaturesComplete,
            },
          });
        }
        break;
      }

      case 'workflow_completed':
      case 'all_signatures_complete': {
        console.log('Processing workflow completion event');
        const { data: signature, error } = await supabaseAdmin
          .from('contract_signatures')
          .update({
            workflow_status: 'completed',
            completed_at: new Date().toISOString(),
            signed_document_url: webhookEvent.data.documentUrl,
          })
          .eq('dock_workflow_id', workflowId)
          .select()
          .single();

        if (error) {
          console.error('Error completing signature:', error);
        } else {
          console.log('Contract signature completed successfully');

          // Log completion event
          await supabaseAdmin.from('signature_events').insert({
            contract_signature_id: signature.id,
            event_type: 'completed',
            event_data: {
              document_url: webhookEvent.data.documentUrl,
              completed_at: new Date().toISOString(),
            },
          });
        }
        break;
      }

      case 'workflow_expired':
      case 'signature_expired': {
        console.log('Processing workflow expiration event');
        const { data: signature, error } = await supabaseAdmin
          .from('contract_signatures')
          .update({
            workflow_status: 'expired',
          })
          .eq('dock_workflow_id', workflowId)
          .select()
          .single();

        if (error) {
          console.error('Error marking signature as expired:', error);
        } else {
          await supabaseAdmin.from('signature_events').insert({
            contract_signature_id: signature.id,
            event_type: 'expired',
            event_data: webhookEvent.data,
          });
        }
        break;
      }

      case 'workflow_cancelled':
      case 'signature_declined': {
        console.log('Processing workflow cancellation event');
        const { data: signature, error } = await supabaseAdmin
          .from('contract_signatures')
          .update({
            workflow_status: 'cancelled',
          })
          .eq('dock_workflow_id', workflowId)
          .select()
          .single();

        if (error) {
          console.error('Error cancelling signature:', error);
        } else {
          await supabaseAdmin.from('signature_events').insert({
            contract_signature_id: signature.id,
            event_type: 'cancelled',
            event_data: webhookEvent.data,
          });
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
