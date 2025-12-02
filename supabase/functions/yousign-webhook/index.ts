import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yousign-signature-256',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookSecret = Deno.env.get('YOUSIGN_WEBHOOK_SECRET');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const payload = await req.text();
    const signature = req.headers.get('x-yousign-signature-256') || '';

    console.log('YouSign webhook received');

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const { YouSignClient } = await import('../_shared/yousign-client.ts');
      const isValid = await YouSignClient.verifyWebhookSignature(payload, signature, webhookSecret);
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
    }

    const event = JSON.parse(payload);
    const eventName = event.event_name;
    const signatureRequestId = event.data?.signature_request?.id;

    console.log('YouSign webhook event:', eventName, 'Request ID:', signatureRequestId);

    if (!signatureRequestId) {
      console.log('No signature request ID in webhook, ignoring');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find our signature record by YouSign request ID
    const { data: contractSignature, error: findError } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('qualified_signature_session_id', signatureRequestId)
      .single();

    if (findError || !contractSignature) {
      console.log('Signature record not found for YouSign request:', signatureRequestId);
      return new Response(JSON.stringify({ received: true, note: 'Signature not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metadata = contractSignature.qualified_signature_metadata || {};

    // Handle different event types
    switch (eventName) {
      case 'signer.done': {
        // A signer completed their signature
        const signerId = event.data?.signer?.id;
        const signerEmail = event.data?.signer?.info?.email;

        console.log('Signer completed:', signerId, signerEmail);

        // Determine if it's manager or tenant
        if (signerId === metadata.manager_signer_id) {
          await supabase
            .from('contract_signatures')
            .update({
              manager_signed_at: new Date().toISOString(),
              manager_signature_method: 'yousign',
              workflow_status: contractSignature.tenant_signed_at ? 'completed' : 'in_progress',
              qualified_signature_metadata: {
                ...metadata,
                manager_signed: true,
                manager_signed_at: new Date().toISOString(),
              },
            })
            .eq('id', contractSignature.id);

          console.log('Manager signature recorded');
        } else if (signerId === metadata.tenant_signer_id) {
          await supabase
            .from('contract_signatures')
            .update({
              tenant_signed_at: new Date().toISOString(),
              tenant_signature_method: 'yousign',
              workflow_status: contractSignature.manager_signed_at ? 'completed' : 'in_progress',
              qualified_signature_metadata: {
                ...metadata,
                tenant_signed: true,
                tenant_signed_at: new Date().toISOString(),
              },
            })
            .eq('id', contractSignature.id);

          console.log('Tenant signature recorded');
        }

        // Log the event
        await supabase.from('qualified_signature_logs').insert({
          contract_signature_id: contractSignature.id,
          session_id: signatureRequestId,
          provider_code: 'yousign',
          event_type: 'signer_done',
          certificate_info: { signer_id: signerId, email: signerEmail },
        });

        break;
      }

      case 'signature_request.done': {
        // All signers completed - download and store signed document
        console.log('All signatures completed, downloading signed document');

        try {
          const { createYouSignClient } = await import('../_shared/yousign-client.ts');
          const yousignClient = createYouSignClient();

          // Download signed document
          const documentId = metadata.yousign_document_id;
          const signedDoc = await yousignClient.downloadSignedDocument(signatureRequestId, documentId);

          // Upload to Supabase storage
          const signedPath = `signed/${contractSignature.id}/signed_contract.pdf`;
          const { error: uploadError } = await supabase.storage
            .from('qualified-contracts')
            .upload(signedPath, signedDoc, {
              contentType: 'application/pdf',
              upsert: true,
            });

          if (uploadError) {
            console.error('Error uploading signed document:', uploadError);
          }

          // Store the storage path (not public URL - bucket is private)
          // Frontend will use createSignedUrl() for secure downloads

          // Update signature record
          await supabase
            .from('contract_signatures')
            .update({
              workflow_status: 'completed',
              completed_at: new Date().toISOString(),
              signed_document_url: signedPath,  // Store path, not URL
              qualified_signature_metadata: {
                ...metadata,
                status: 'done',
                completed_at: new Date().toISOString(),
              },
            })
            .eq('id', contractSignature.id);

          console.log('Signature completed and document stored');

        } catch (downloadError) {
          console.error('Error downloading signed document:', downloadError);
        }

        // Log the event
        await supabase.from('qualified_signature_logs').insert({
          contract_signature_id: contractSignature.id,
          session_id: signatureRequestId,
          provider_code: 'yousign',
          event_type: 'completed',
        });

        break;
      }

      case 'signature_request.expired': {
        console.log('Signature request expired');

        await supabase
          .from('contract_signatures')
          .update({
            workflow_status: 'expired',
            qualified_signature_metadata: {
              ...metadata,
              status: 'expired',
              expired_at: new Date().toISOString(),
            },
          })
          .eq('id', contractSignature.id);

        await supabase.from('qualified_signature_logs').insert({
          contract_signature_id: contractSignature.id,
          session_id: signatureRequestId,
          provider_code: 'yousign',
          event_type: 'expired',
        });

        break;
      }

      case 'signature_request.declined': {
        console.log('Signature request declined');

        const declinedBy = event.data?.signer?.info?.email;

        await supabase
          .from('contract_signatures')
          .update({
            workflow_status: 'declined',
            qualified_signature_metadata: {
              ...metadata,
              status: 'declined',
              declined_at: new Date().toISOString(),
              declined_by: declinedBy,
            },
          })
          .eq('id', contractSignature.id);

        await supabase.from('qualified_signature_logs').insert({
          contract_signature_id: contractSignature.id,
          session_id: signatureRequestId,
          provider_code: 'yousign',
          event_type: 'declined',
          error_message: `Declined by ${declinedBy}`,
        });

        break;
      }

      default:
        console.log('Unhandled YouSign event:', eventName);
    }

    return new Response(
      JSON.stringify({ received: true, event: eventName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('YouSign webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
