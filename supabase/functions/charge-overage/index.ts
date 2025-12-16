import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OverageType = 'signature' | 'government_id';

interface ChargeOverageRequest {
  overage_type: OverageType;
  quantity?: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-OVERAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!stripeKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Stripe not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

  try {
    logStep('Function started');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    const { overage_type, quantity = 1 }: ChargeOverageRequest = await req.json();

    if (!overage_type || !['signature', 'government_id'].includes(overage_type)) {
      throw new Error('Invalid overage_type. Must be "signature" or "government_id"');
    }

    logStep('Processing overage', { overage_type, quantity });

    // Get user's subscription with plan details
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        stripe_customer_id,
        status,
        subscription_plans!inner(
          slug,
          name,
          overage_price_per_signature_cents,
          overage_price_per_government_id_cents,
          feature_limits
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !subscription) {
      throw new Error('No active subscription found');
    }

    const plan = Array.isArray(subscription.subscription_plans) 
      ? subscription.subscription_plans[0] 
      : subscription.subscription_plans;

    logStep('Subscription found', { 
      plan: plan.slug, 
      stripeCustomerId: subscription.stripe_customer_id 
    });

    // Check if FREE plan (no overage allowed)
    if (plan.slug === 'free') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Upgrade required',
          message: 'Pay-as-you-go is only available for Pro and Enterprise plans. Please upgrade to continue.',
          requires_upgrade: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
      );
    }

    // Determine price based on overage type
    const pricePerUnitCents = overage_type === 'signature' 
      ? plan.overage_price_per_signature_cents || 200 // Default €2
      : plan.overage_price_per_government_id_cents || 100; // Default €1

    const totalAmountCents = pricePerUnitCents * quantity;

    logStep('Overage pricing', { 
      pricePerUnitCents, 
      quantity, 
      totalAmountCents 
    });

    // Get or create Stripe customer
    let stripeCustomerId = subscription.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create Stripe customer if doesn't exist
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update subscription with Stripe customer ID
      await supabase
        .from('user_subscriptions')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', subscription.id);

      logStep('Created Stripe customer', { stripeCustomerId });
    }

    // Create invoice item for the overage charge
    const description = overage_type === 'signature'
      ? `Digital Signature Overage (${quantity} signature${quantity > 1 ? 's' : ''})`
      : `Government ID Verification Overage (${quantity} verification${quantity > 1 ? 's' : ''})`;

    const invoiceItem = await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: totalAmountCents,
      currency: 'eur',
      description,
      metadata: {
        overage_type,
        quantity: quantity.toString(),
        user_id: user.id,
        timestamp: new Date().toISOString(),
      },
    });

    logStep('Created invoice item', { invoiceItemId: invoiceItem.id });

    // Create and immediately finalize/pay the invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true,
      collection_method: 'charge_automatically',
      metadata: {
        type: 'overage',
        overage_type,
        user_id: user.id,
      },
    });

    logStep('Created invoice', { invoiceId: invoice.id });

    // Finalize and pay the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    
    logStep('Invoice finalized', { 
      invoiceId: finalizedInvoice.id, 
      status: finalizedInvoice.status 
    });

    // Update subscription_usage tracking
    const currentYear = new Date().getFullYear();
    
    // Upsert usage record
    const { data: existingUsage } = await supabase
      .from('subscription_usage')
      .select('id')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .single();

    if (existingUsage) {
      // Update existing record
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (overage_type === 'signature') {
        updateData.overage_signatures_used = supabase.rpc('increment_counter', { 
          row_id: existingUsage.id, 
          counter_name: 'overage_signatures_used',
          increment_by: quantity 
        });
        updateData.last_overage_billed_at = new Date().toISOString();
      } else {
        updateData.overage_government_id_used = supabase.rpc('increment_counter', { 
          row_id: existingUsage.id, 
          counter_name: 'overage_government_id_used',
          increment_by: quantity 
        });
        updateData.last_gov_id_overage_billed_at = new Date().toISOString();
      }

      // Use raw SQL increment for thread safety
      if (overage_type === 'signature') {
        await supabase
          .from('subscription_usage')
          .update({
            overage_signatures_used: existingUsage.id, // Will be incremented via SQL
            last_overage_billed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUsage.id);
          
        // Atomic increment
        await supabase.rpc('increment_overage_signatures', { 
          p_user_id: user.id, 
          p_year: currentYear,
          p_amount: quantity 
        });
      } else {
        await supabase.rpc('increment_overage_gov_id', { 
          p_user_id: user.id, 
          p_year: currentYear,
          p_amount: quantity 
        });
      }
    } else {
      // Create new usage record
      const insertData: Record<string, any> = {
        user_id: user.id,
        year: currentYear,
        reset_at: new Date(`${currentYear + 1}-01-01T00:00:00Z`).toISOString(),
        signatures_used: 0,
        overage_signatures_used: overage_type === 'signature' ? quantity : 0,
        government_id_verifications_used: 0,
        overage_government_id_used: overage_type === 'government_id' ? quantity : 0,
      };

      if (overage_type === 'signature') {
        insertData.last_overage_billed_at = new Date().toISOString();
      } else {
        insertData.last_gov_id_overage_billed_at = new Date().toISOString();
      }

      await supabase
        .from('subscription_usage')
        .insert(insertData);
    }

    logStep('Usage tracking updated');

    return new Response(
      JSON.stringify({
        success: true,
        charged: true,
        amount_cents: totalAmountCents,
        amount_formatted: `€${(totalAmountCents / 100).toFixed(2)}`,
        invoice_id: finalizedInvoice.id,
        invoice_status: finalizedInvoice.status,
        overage_type,
        quantity,
        message: `Successfully charged €${(totalAmountCents / 100).toFixed(2)} for ${description.toLowerCase()}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('ERROR', { message: error.message, stack: error.stack });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
