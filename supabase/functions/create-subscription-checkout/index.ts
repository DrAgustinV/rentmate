import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { planSlug, billingPeriod } = await req.json();
    logStep("Request params", { planSlug, billingPeriod });

    if (!planSlug || !billingPeriod) {
      throw new Error("Missing required parameters: planSlug, billingPeriod");
    }

    if (!["monthly", "annual"].includes(billingPeriod)) {
      throw new Error("Invalid billingPeriod. Must be 'monthly' or 'annual'");
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("status", "active")
      .single();

    if (planError || !plan) {
      logStep("Plan not found", { planSlug, error: planError });
      throw new Error("Subscription plan not found");
    }

    logStep("Plan found", { planId: plan.id, name: plan.name });

    // Check if plan is available for signup
    if (!plan.is_available_for_signup) {
      logStep("Plan not available for signup", { planSlug });
      throw new Error("This plan is not yet available for signup. Coming soon!");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;
    logStep("Stripe customer check", { customerId: customerId || "new" });

    // Get the appropriate Stripe price ID
    const stripePriceId = billingPeriod === "monthly" 
      ? plan.stripe_price_id_monthly 
      : plan.stripe_price_id_annual;

    if (!stripePriceId) {
      logStep("Missing Stripe price ID", { billingPeriod });
      throw new Error(`Stripe price ID not configured for ${billingPeriod} billing`);
    }

    logStep("Using Stripe price", { stripePriceId, billingPeriod });

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/account/subscription?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      subscription_data: {
        trial_period_days: plan.trial_days > 0 ? plan.trial_days : undefined,
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          plan_slug: plan.slug,
        },
      },
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id,
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
