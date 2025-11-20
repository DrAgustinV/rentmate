import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COLLECT-RENT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { payment_id } = await req.json();
    if (!payment_id) {
      throw new Error("Missing payment_id");
    }
    logStep("Request parsed", { payment_id });

    // Fetch payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("rent_payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }
    logStep("Payment fetched", { status: payment.status, amount: payment.amount_cents });

    // Check if payment is already paid or processing
    if (payment.status === 'paid' || payment.status === 'processing') {
      logStep("Payment already processed", { status: payment.status });
      return new Response(
        JSON.stringify({ success: false, message: "Payment already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fetch rent agreement
    const { data: agreement, error: agreementError } = await supabaseClient
      .from("rent_agreements")
      .select("*")
      .eq("id", payment.rent_agreement_id)
      .single();

    if (agreementError || !agreement) {
      throw new Error(`Rent agreement not found: ${agreementError?.message}`);
    }
    logStep("Agreement fetched", { mandate_status: agreement.mandate_status });

    // Verify mandate is active
    if (agreement.mandate_status !== "active" || !agreement.mandate_id) {
      throw new Error("No active SEPA mandate found");
    }

    // Get manager's Stripe account
    const { data: managerAccount, error: accountError } = await supabaseClient
      .from("manager_stripe_accounts")
      .select("*")
      .eq("manager_id", agreement.manager_id)
      .eq("stripe_account_status", "active")
      .single();

    if (accountError || !managerAccount) {
      throw new Error("Manager Stripe account not found or not active");
    }
    logStep("Manager Stripe account found", { stripe_account_id: managerAccount.stripe_account_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get customer by tenant email
    const { data: tenantProfile, error: tenantError } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("id", payment.tenant_id)
      .single();

    if (tenantError || !tenantProfile) {
      throw new Error("Tenant profile not found");
    }

    const customers = await stripe.customers.list({ 
      email: tenantProfile.email, 
      limit: 1 
    }, {
      stripeAccount: managerAccount.stripe_account_id
    });

    if (customers.data.length === 0) {
      throw new Error("Customer not found in Stripe");
    }
    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Update payment status to processing
    await supabaseClient
      .from("rent_payments")
      .update({
        status: "processing",
        payment_method: "sepa_debit",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment_id);
    logStep("Payment status updated to processing");

    // Create PaymentIntent with SEPA Direct Debit
    const paymentIntent = await stripe.paymentIntents.create({
      amount: payment.amount_cents,
      currency: payment.currency,
      customer: customerId,
      payment_method_types: ["sepa_debit"],
      mandate: agreement.mandate_id,
      off_session: true,
      confirm: true,
      metadata: {
        rent_payment_id: payment_id,
        property_id: payment.property_id,
        tenant_id: payment.tenant_id,
      },
    }, {
      stripeAccount: managerAccount.stripe_account_id
    });

    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // Update payment record with PaymentIntent ID
    await supabaseClient
      .from("rent_payments")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: paymentIntent.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment_id);
    logStep("Payment record updated with PaymentIntent ID");

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in collect-rent-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
