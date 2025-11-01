import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log(`Creating Stripe Connect account for manager: ${user.id}`);

    // Check if manager already has a Stripe account
    const { data: existingAccount } = await supabase
      .from('manager_stripe_accounts')
      .select('*')
      .eq('manager_id', user.id)
      .single();

    if (existingAccount) {
      console.log(`Existing account found: ${existingAccount.stripe_account_id}`);
      
      // Return account link for existing account
      const accountLink = await stripe.accountLinks.create({
        account: existingAccount.stripe_account_id,
        refresh_url: `${req.headers.get('origin') || 'http://localhost:8080'}/settings?stripe_refresh=true`,
        return_url: `${req.headers.get('origin') || 'http://localhost:8080'}/settings?stripe_success=true`,
        type: 'account_onboarding',
      });

      return new Response(
        JSON.stringify({
          accountId: existingAccount.stripe_account_id,
          onboardingUrl: accountLink.url,
          status: existingAccount.account_status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get manager profile for metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single();

    // Create new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'DE', // Germany for SEPA
      email: profile?.email || user.email,
      capabilities: {
        transfers: { requested: true },
        sepa_debit_payments: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        mcc: '6513', // Real Estate Agents and Managers - Rentals
        product_description: 'Property rental management and rent collection',
      },
      metadata: {
        manager_id: user.id,
        platform: 'rentmate',
      },
    });

    console.log(`Created Stripe account: ${account.id}`);

    // Store in database
    const { error: insertError } = await supabase
      .from('manager_stripe_accounts')
      .insert({
        manager_id: user.id,
        stripe_account_id: account.id,
        account_status: 'pending',
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        country: account.country || 'DE',
        currency: account.default_currency || 'eur',
        metadata: {
          email: profile?.email,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        },
      });

    if (insertError) {
      console.error('Error storing account:', insertError);
      throw insertError;
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get('origin') || 'http://localhost:8080'}/settings?stripe_refresh=true`,
      return_url: `${req.headers.get('origin') || 'http://localhost:8080'}/settings?stripe_success=true`,
      type: 'account_onboarding',
    });

    console.log('Account link created successfully');

    return new Response(
      JSON.stringify({
        accountId: account.id,
        onboardingUrl: accountLink.url,
        status: 'pending',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-stripe-connect-account:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
