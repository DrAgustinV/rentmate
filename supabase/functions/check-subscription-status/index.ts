import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION-STATUS] ${step}${detailsStr}`);
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
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header, returning free tier");
      return new Response(
        JSON.stringify({
          plan: "free",
          status: "active",
          features: {},
          usage: { signatures_used: 0, signatures_limit: 0, overage: 0, remaining: 0 },
          session_error: "No authorization header"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      logStep("Session invalid, returning free tier", { error: userError?.message });
      return new Response(
        JSON.stringify({
          plan: "free",
          status: "active",
          features: {},
          usage: { signatures_used: 0, signatures_limit: 0, overage: 0, remaining: 0 },
          session_error: userError?.message || "User not authenticated"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    logStep("User authenticated", { userId: user.id });

    // Get user's subscription using helper function
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .rpc("get_user_subscription", { p_user_id: user.id });

    if (subscriptionError) {
      logStep("Error fetching subscription", { error: subscriptionError });
      throw new Error("Failed to fetch subscription");
    }

    logStep("Subscription fetched", { 
      plan: subscriptionData?.plan,
      status: subscriptionData?.status 
    });

    // If user has a Stripe subscription, sync latest status from Stripe
    if (subscriptionData?.subscription_type === "stripe") {
      const { data: userSub } = await supabaseClient
        .from("user_subscriptions")
        .select("stripe_subscription_id, stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      if (userSub?.stripe_subscription_id) {
        try {
          const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
            apiVersion: "2025-08-27.basil",
          });

          const stripeSubscription = await stripe.subscriptions.retrieve(userSub.stripe_subscription_id);
          logStep("Stripe subscription synced", { 
            status: stripeSubscription.status,
            currentPeriodEnd: stripeSubscription.current_period_end 
          });

          // Update local database if status changed
          if (stripeSubscription.status !== subscriptionData.status) {
            await supabaseClient
              .from("user_subscriptions")
              .update({
                status: stripeSubscription.status as any,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              })
              .eq("user_id", user.id);

            logStep("Subscription status synced from Stripe");
          }
        } catch (stripeError) {
          logStep("Warning: Could not sync Stripe subscription", { error: stripeError });
          // Continue with cached data
        }
      }
    }

    return new Response(
      JSON.stringify(subscriptionData || {
        plan: "free",
        status: "active",
        features: {},
        usage: { signatures_used: 0, signatures_limit: 0, overage: 0, remaining: 0 }
      }), 
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
