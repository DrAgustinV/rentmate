import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing required environment variables");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No stripe-signature header found");
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Event verified", { type: event.type, id: event.id });
    } catch (err) {
      const error = err as Error;
      logStep("Webhook signature verification failed", { error: error.message });
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Store the webhook event
    await supabaseClient.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event.data as any,
      processed: false,
    });
    logStep("Webhook event stored");

    // Handle different event types
    switch (event.type) {
      case "setup_intent.succeeded": {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        logStep("Processing setup_intent.succeeded", { id: setupIntent.id });

        const agreementId = setupIntent.metadata.agreement_id;
        if (!agreementId) {
          logStep("No agreement_id in metadata, skipping");
          break;
        }

        // Get the payment method details
        const paymentMethod = await stripe.paymentMethods.retrieve(
          setupIntent.payment_method as string
        );
        const mandateId = setupIntent.mandate as string;

        // Update rent agreement with active mandate
        const { error: updateError } = await supabaseClient
          .from("rent_agreements")
          .update({
            mandate_id: mandateId,
            mandate_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", agreementId);

        if (updateError) {
          logStep("ERROR updating agreement", { error: updateError.message });
          throw updateError;
        }
        logStep("Agreement updated with active mandate", { agreementId, mandateId });
        break;
      }

      case "setup_intent.setup_failed": {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        logStep("Processing setup_intent.setup_failed", { id: setupIntent.id });

        const agreementId = setupIntent.metadata.agreement_id;
        if (!agreementId) {
          logStep("No agreement_id in metadata, skipping");
          break;
        }

        // Update rent agreement with failed status
        const { error: updateError } = await supabaseClient
          .from("rent_agreements")
          .update({
            mandate_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", agreementId);

        if (updateError) {
          logStep("ERROR updating agreement", { error: updateError.message });
          throw updateError;
        }
        logStep("Agreement updated with failed status", { agreementId });
        break;
      }

      case "mandate.updated": {
        const mandate = event.data.object as Stripe.Mandate;
        logStep("Processing mandate.updated", { id: mandate.id, status: mandate.status });

        // Find the agreement with this mandate
        const { data: agreement, error: findError } = await supabaseClient
          .from("rent_agreements")
          .select("id")
          .eq("mandate_id", mandate.id)
          .single();

        if (findError || !agreement) {
          logStep("Agreement not found for mandate", { mandateId: mandate.id });
          break;
        }

        // Update mandate status based on Stripe mandate status
        let mandateStatus = "active";
        if (mandate.status === "inactive") mandateStatus = "inactive";
        if (mandate.status === "pending") mandateStatus = "pending";

        const { error: updateError } = await supabaseClient
          .from("rent_agreements")
          .update({
            mandate_status: mandateStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", agreement.id);

        if (updateError) {
          logStep("ERROR updating mandate status", { error: updateError.message });
          throw updateError;
        }
        logStep("Mandate status updated", { agreementId: agreement.id, status: mandateStatus });
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.succeeded", { id: paymentIntent.id });

        // Find the rent payment record
        const { data: payment, error: findError } = await supabaseClient
          .from("rent_payments")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .single();

        if (findError || !payment) {
          logStep("Payment not found", { paymentIntentId: paymentIntent.id });
          break;
        }

        // Update payment status
        const { error: updateError } = await supabaseClient
          .from("rent_payments")
          .update({
            payment_status: "succeeded",
            stripe_charge_id: paymentIntent.latest_charge as string,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updateError) {
          logStep("ERROR updating payment", { error: updateError.message });
          throw updateError;
        }
        logStep("Payment marked as succeeded", { paymentId: payment.id });
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.payment_failed", { id: paymentIntent.id });

        // Find the rent payment record
        const { data: payment, error: findError } = await supabaseClient
          .from("rent_payments")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .single();

        if (findError || !payment) {
          logStep("Payment not found", { paymentIntentId: paymentIntent.id });
          break;
        }

        // Update payment status
        const { error: updateError } = await supabaseClient
          .from("rent_payments")
          .update({
            payment_status: "failed",
            failure_reason: paymentIntent.last_payment_error?.message || "Payment failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updateError) {
          logStep("ERROR updating payment", { error: updateError.message });
          throw updateError;
        }
        logStep("Payment marked as failed", { paymentId: payment.id });
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        logStep("Processing charge.dispute.created", { id: dispute.id });

        // Find the rent payment by charge ID
        const { data: payment, error: findError } = await supabaseClient
          .from("rent_payments")
          .select("id")
          .eq("stripe_charge_id", dispute.charge as string)
          .single();

        if (findError || !payment) {
          logStep("Payment not found for charge", { chargeId: dispute.charge });
          break;
        }

        // Create dispute record
        const { error: insertError } = await supabaseClient
          .from("payment_disputes")
          .insert({
            rent_payment_id: payment.id,
            stripe_dispute_id: dispute.id,
            amount_cents: dispute.amount,
            currency: dispute.currency,
            dispute_reason: dispute.reason,
            dispute_status: dispute.status,
            evidence_due_by: dispute.evidence_details?.due_by 
              ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
              : null,
          });

        if (insertError) {
          logStep("ERROR creating dispute record", { error: insertError.message });
          throw insertError;
        }
        logStep("Dispute record created", { paymentId: payment.id, disputeId: dispute.id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Mark event as processed
    await supabaseClient
      .from("stripe_webhook_events")
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook handler", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
