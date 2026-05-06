import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header");
    }

    const body = await req.text();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook verified", { type: event.type, id: event.id });

    // Helper function for retry logic
    const executeWithRetry = async <T>(
      operation: () => Promise<T>,
      maxRetries = 3
    ): Promise<T | null> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (i === maxRetries - 1) {
            logStep("Retry failed", { error: errorMessage });
            return null;
          }
          logStep("Retry attempt", { attempt: i + 1, error: errorMessage });
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
      return null;
    };

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          logStep("Checkout completed", { sessionId: session.id });

          if (session.mode === "subscription" && session.subscription) {
            const userId = session.metadata?.user_id;
            const planId = session.metadata?.plan_id;

            if (!userId || !planId) {
              logStep("Missing metadata", { userId, planId });
              break;
            }

            // Create or update user subscription with retry
            const result = await executeWithRetry(async () => {
              return await supabaseClient
                .from("user_subscriptions")
                .upsert({
                  user_id: userId,
                  plan_id: planId,
                  subscription_type: "stripe",
                  status: "active",
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: session.subscription as string,
                  current_period_start: new Date().toISOString(),
                  trial_start: session.subscription_data?.trial_start 
                    ? new Date(session.subscription_data.trial_start * 1000).toISOString()
                    : null,
                  trial_end: session.subscription_data?.trial_end
                    ? new Date(session.subscription_data.trial_end * 1000).toISOString()
                    : null,
                }, {
                  onConflict: "user_id"
                });
            });

            if (result?.error) {
              logStep("Error upserting subscription", { error: result.error });
            } else {
              logStep("Subscription created/updated");

              // Log to subscription history
              await supabaseClient.from("subscription_history").insert({
                user_id: userId,
                to_plan_id: planId,
                change_reason: "subscription_created",
                metadata: { session_id: session.id },
              });
            }
          }
        } catch (err) {
          logStep("ERROR in checkout.session.completed", { error: String(err) });
        }
        break;
      }

      case "customer.subscription.updated": {
        try {
          const subscription = event.data.object as Stripe.Subscription;
          
          // Validate required fields
          if (!subscription.id || !subscription.current_period_start) {
            logStep("Invalid subscription data", { subscription });
            break;
          }

          logStep("Subscription updated", { 
            subscriptionId: subscription.id,
            status: subscription.status 
          });

          const result = await executeWithRetry(async () => {
            return await supabaseClient
              .from("user_subscriptions")
              .update({
                status: subscription.status as any,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
                canceled_at: subscription.canceled_at 
                  ? new Date(subscription.canceled_at * 1000).toISOString()
                  : null,
              })
              .eq("stripe_subscription_id", subscription.id);
          });

          if (result?.error) {
            logStep("Error updating subscription", { error: result.error });
          } else {
            logStep("Subscription updated in database");
          }
        } catch (err) {
          logStep("ERROR in customer.subscription.updated", { error: String(err) });
        }
        break;
      }

      case "customer.subscription.deleted": {
        try {
          const subscription = event.data.object as Stripe.Subscription;
          logStep("Subscription deleted", { subscriptionId: subscription.id });

          // Get user and free plan
          const { data: userSub } = await supabaseClient
            .from("user_subscriptions")
            .select("user_id, plan_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (userSub) {
            const { data: freePlan } = await supabaseClient
              .from("subscription_plans")
              .select("id")
              .eq("slug", "free")
              .single();

            if (freePlan) {
              // Downgrade to free plan with retry
              await executeWithRetry(async () => {
                return await supabaseClient
                  .from("user_subscriptions")
                  .update({
                    plan_id: freePlan.id,
                    status: "expired",
                    subscription_type: "free",
                    stripe_subscription_id: null,
                  })
                  .eq("stripe_subscription_id", subscription.id);
              });

              // Log to history
              await supabaseClient.from("subscription_history").insert({
                user_id: userSub.user_id,
                from_plan_id: userSub.plan_id,
                to_plan_id: freePlan.id,
                change_reason: "subscription_deleted",
              });

              logStep("User downgraded to free plan");
            }
          }
        } catch (err) {
          logStep("ERROR in customer.subscription.deleted", { error: String(err) });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        try {
          const invoice = event.data.object as Stripe.Invoice;
          logStep("Payment succeeded", { 
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription 
          });

          if (invoice.subscription) {
            // Clear grace period if payment succeeded with retry
            await executeWithRetry(async () => {
              return await supabaseClient
                .from("user_subscriptions")
                .update({
                  status: "active",
                  grace_period_ends_at: null,
                })
                .eq("stripe_subscription_id", invoice.subscription);
            });

            logStep("Grace period cleared");
          }
        } catch (err) {
          logStep("ERROR in invoice.payment_succeeded", { error: String(err) });
        }
        break;
      }

      case "invoice.payment_failed": {
        try {
          const invoice = event.data.object as Stripe.Invoice;
          logStep("Payment failed", { 
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription 
          });

          if (invoice.subscription) {
            // Get grace period days from settings
            const { data: settings } = await supabaseClient
              .from("system_settings")
              .select("setting_value")
              .eq("setting_key", "subscription_grace_period_days")
              .single();

            const gracePeriodDays = settings?.setting_value?.value || 14;
            const gracePeriodEndsAt = new Date();
            gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + gracePeriodDays);

            // Set grace period with retry
            await executeWithRetry(async () => {
              return await supabaseClient
                .from("user_subscriptions")
                .update({
                  status: "past_due",
                  grace_period_ends_at: gracePeriodEndsAt.toISOString(),
                })
                .eq("stripe_subscription_id", invoice.subscription);
            });

            logStep("Grace period started", { endsAt: gracePeriodEndsAt });
          }
        } catch (err) {
          logStep("ERROR in invoice.payment_failed", { error: String(err) });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
