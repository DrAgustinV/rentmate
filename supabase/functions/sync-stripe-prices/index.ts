import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE-PRICES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError || !roleData) {
      throw new Error("Admin access required");
    }
    logStep("Admin verified", { userId: user.id });

    // Parse request body
    const { planId } = await req.json();
    if (!planId) throw new Error("Plan ID is required");
    logStep("Request received", { planId });

    // Fetch plan from database
    const { data: plan, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) throw new Error(`Plan not found: ${planError?.message}`);
    logStep("Plan fetched", { name: plan.name, slug: plan.slug });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let productId = plan.stripe_product_id;

    // Create Stripe product if it doesn't exist
    if (!productId) {
      logStep("Creating new Stripe product");
      const product = await stripe.products.create({
        name: `RentMate ${plan.name}`,
        description: plan.description || `RentMate ${plan.name} subscription plan`,
        metadata: {
          plan_id: plan.id,
          plan_slug: plan.slug,
        },
      });
      productId = product.id;
      logStep("Stripe product created", { productId });
    } else {
      // Update existing product name if changed
      logStep("Updating existing Stripe product", { productId });
      await stripe.products.update(productId, {
        name: `RentMate ${plan.name}`,
        description: plan.description || `RentMate ${plan.name} subscription plan`,
      });
    }

    // Create new monthly price
    logStep("Creating monthly price", { amount: plan.price_monthly_cents });
    const monthlyPrice = await stripe.prices.create({
      product: productId,
      currency: "eur",
      unit_amount: plan.price_monthly_cents,
      recurring: { interval: "month" },
      metadata: {
        plan_id: plan.id,
        plan_slug: plan.slug,
        billing_period: "monthly",
      },
    });
    logStep("Monthly price created", { priceId: monthlyPrice.id });

    // Create new annual price
    logStep("Creating annual price", { amount: plan.price_annual_cents });
    const annualPrice = await stripe.prices.create({
      product: productId,
      currency: "eur",
      unit_amount: plan.price_annual_cents,
      recurring: { interval: "year" },
      metadata: {
        plan_id: plan.id,
        plan_slug: plan.slug,
        billing_period: "annual",
      },
    });
    logStep("Annual price created", { priceId: annualPrice.id });

    // Archive old prices if they exist
    if (plan.stripe_price_id_monthly && plan.stripe_price_id_monthly !== monthlyPrice.id) {
      try {
        await stripe.prices.update(plan.stripe_price_id_monthly, { active: false });
        logStep("Old monthly price archived", { oldPriceId: plan.stripe_price_id_monthly });
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        logStep("Could not archive old monthly price", { error: errorMsg });
      }
    }
    if (plan.stripe_price_id_annual && plan.stripe_price_id_annual !== annualPrice.id) {
      try {
        await stripe.prices.update(plan.stripe_price_id_annual, { active: false });
        logStep("Old annual price archived", { oldPriceId: plan.stripe_price_id_annual });
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        logStep("Could not archive old annual price", { error: errorMsg });
      }
    }

    // Update database with new Stripe IDs
    const { error: updateError } = await supabaseClient
      .from("subscription_plans")
      .update({
        stripe_product_id: productId,
        stripe_price_id_monthly: monthlyPrice.id,
        stripe_price_id_annual: annualPrice.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId);

    if (updateError) throw new Error(`Failed to update database: ${updateError.message}`);
    logStep("Database updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: productId,
        stripe_price_id_monthly: monthlyPrice.id,
        stripe_price_id_annual: annualPrice.id,
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
