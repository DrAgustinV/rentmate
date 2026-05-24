import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SEPA-MANDATE] ${step}${detailsStr}`);
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { agreement_id, tenant_iban } = await req.json();
    if (!agreement_id || !tenant_iban) {
      throw new Error("Missing required fields: agreement_id or tenant_iban");
    }
    logStep("Request body parsed", { agreement_id, tenant_iban: tenant_iban.substring(0, 4) + "****" });

    // Verify the user is the tenant of this agreement
    const { data: agreement, error: agreementError } = await supabaseClient
      .from("rent_agreements")
      .select("*")
      .eq("id", agreement_id)
      .eq("tenant_id", user.id)
      .single();

    if (agreementError || !agreement) {
      throw new Error("Agreement not found or you don't have access to it");
    }
    logStep("Agreement verified", { agreement_id, manager_id: agreement.manager_id });

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

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    }, {
      stripeAccount: managerAccount.stripe_account_id
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
      }, {
        stripeAccount: managerAccount.stripe_account_id
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create SetupIntent for SEPA mandate
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["sepa_debit"],
      payment_method_options: {
        sepa_debit: {
          mandate_options: {},
        },
      },
      metadata: {
        agreement_id,
        tenant_id: user.id,
        tenant_iban,
      },
    }, {
      stripeAccount: managerAccount.stripe_account_id
    });

    logStep("SetupIntent created", { setupIntentId: setupIntent.id, clientSecret: "***" });

    // Update the rent agreement with pending mandate status
    const { error: updateError } = await supabaseClient
      .from("rent_agreements")
      .update({
        tenant_iban,
        mandate_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agreement_id);

    if (updateError) {
      logStep("ERROR updating agreement", { error: updateError.message });
      throw new Error(`Failed to update agreement: ${updateError.message}`);
    }
    logStep("Agreement updated with pending mandate status");

    return new Response(
      JSON.stringify({
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-sepa-mandate", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
