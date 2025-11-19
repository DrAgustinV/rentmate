import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL-SESSION] ${step}${detailsStr}`);
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
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's subscription
    const { data: userSub, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("stripe_customer_id, subscription_type")
      .eq("user_id", user.id)
      .single();

    if (subError || !userSub) {
      logStep("No subscription found");
      throw new Error("No subscription found");
    }

    // Only Stripe subscriptions can access portal
    if (userSub.subscription_type !== "stripe") {
      logStep("Not a Stripe subscription", { type: userSub.subscription_type });
      throw new Error("Customer portal is only available for Stripe subscriptions");
    }

    if (!userSub.stripe_customer_id) {
      logStep("No Stripe customer ID");
      throw new Error("No Stripe customer found");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create portal session
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userSub.stripe_customer_id,
      return_url: `${origin}/account/subscription`,
    });

    logStep("Portal session created", { 
      sessionId: portalSession.id, 
      url: portalSession.url 
    });

    return new Response(
      JSON.stringify({ 
        url: portalSession.url,
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
