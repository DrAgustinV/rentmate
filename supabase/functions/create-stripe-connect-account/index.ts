import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@11.16.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const { data: existingAccount, error: fetchError } = await supabase
      .from('manager_stripe_accounts')
      .select('*')
      .eq('manager_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing account:', fetchError);
      throw new Error('Failed to check existing Stripe account');
    }

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
          status: existingAccount.stripe_account_status,
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
        stripe_account_status: 'pending',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
