import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Received request headers:', Object.fromEntries(req.headers.entries()));
    console.log('Authorization header present:', !!authHeader);
    console.log('Authorization header format check:', authHeader?.startsWith('Bearer ') ? 'Valid Bearer format' : 'Invalid');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Decode JWT payload (no verification needed - Supabase already verified it via verify_jwt=true)
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;
    const userEmail = payload.email;

    console.log('Authenticated user from JWT:', { userId, userEmail });

    // Create service role client for database operations (no user auth header needed)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenancyId } = await req.json();
    console.log('Initiating DocuSeal signature for tenancy:', tenancyId);

    if (!tenancyId) {
      throw new Error('Missing tenancyId');
    }

    // Fetch tenancy details with property and profiles
    const { data: tenancy, error: tenancyError } = await supabaseClient
      .from('property_tenants')
      .select(`
        *,
        properties!inner(id, title, address, manager_id),
        profiles!property_tenants_tenant_id_fkey(id, email, first_name, last_name)
      `)
      .eq('id', tenancyId)
      .single();

    if (tenancyError || !tenancy) {
      console.error('Error fetching tenancy:', tenancyError);
      throw new Error('Tenancy not found');
    }

    // Verify user is the manager
    if (tenancy.properties.manager_id !== userId) {
      throw new Error('Only property manager can initiate signature');
    }

    // Get manager profile
    const { data: managerProfile } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (!managerProfile?.email) {
      throw new Error('Manager email not found');
    }

    // Get rent agreement details
    const { data: rentAgreement } = await supabaseClient
      .from('rent_agreements')
      .select('*')
      .eq('tenancy_id', tenancyId)
      .eq('is_active', true)
      .single();

    const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY');
    const docusealApiUrl = Deno.env.get('DOCUSEAL_API_URL') || 'https://api.docuseal.co';
    const templateId = Deno.env.get('DOCUSEAL_RENTAL_TEMPLATE_ID');

    if (!docusealApiKey || !templateId) {
      throw new Error('DocuSeal API credentials not configured');
    }

    // Create DocuSeal submission with 2 signers
    const submissionPayload = {
      template_id: templateId,
      send_email: false, // We'll handle signing via embedded component
      submitters: [
        {
          role: "Manager",
          email: managerProfile.email,
          name: `${managerProfile.first_name || ''} ${managerProfile.last_name || ''}`.trim(),
          fields: [
            { name: "property_address", default_value: tenancy.properties.address || '' },
            { name: "property_title", default_value: tenancy.properties.title || '' },
            { name: "manager_name", default_value: `${managerProfile.first_name || ''} ${managerProfile.last_name || ''}`.trim() },
            { name: "manager_email", default_value: managerProfile.email },
            { name: "start_date", default_value: rentAgreement?.start_date || '' },
            { name: "rent_amount", default_value: rentAgreement ? (rentAgreement.rent_amount_cents / 100).toString() : '' },
            { name: "currency", default_value: rentAgreement?.currency || 'EUR' }
          ]
        },
        {
          role: "Tenant",
          email: tenancy.profiles.email,
          name: `${tenancy.profiles.first_name || ''} ${tenancy.profiles.last_name || ''}`.trim(),
          fields: [
            { name: "tenant_name", default_value: `${tenancy.profiles.first_name || ''} ${tenancy.profiles.last_name || ''}`.trim() },
            { name: "tenant_email", default_value: tenancy.profiles.email }
          ]
        }
      ]
    };

    console.log('Creating DocuSeal submission:', JSON.stringify(submissionPayload, null, 2));

    const docusealResponse = await fetch(`${docusealApiUrl}/submissions`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': docusealApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionPayload),
    });

    if (!docusealResponse.ok) {
      const errorText = await docusealResponse.text();
      console.error('DocuSeal API error:', errorText);
      throw new Error(`DocuSeal API error: ${docusealResponse.statusText}`);
    }

    const docusealData = await docusealResponse.json();
    console.log('DocuSeal submission created:', docusealData);

    // Create or update signature record
    const { data: existingSignature } = await supabaseClient
      .from('contract_signatures')
      .select('id')
      .eq('tenancy_id', tenancyId)
      .eq('signing_method', 'docuseal')
      .single();

    const signatureData = {
      tenancy_id: tenancyId,
      property_id: tenancy.properties.id,
      initiated_by: userId,
      signing_method: 'docuseal',
      workflow_status: 'pending',
      docuseal_template_id: templateId,
      docuseal_submission_id: docusealData[0]?.submission_id,
      docuseal_submission_slug: docusealData[0]?.slug,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    let signature;
    if (existingSignature) {
      const { data: updated, error: updateError } = await supabaseClient
        .from('contract_signatures')
        .update(signatureData)
        .eq('id', existingSignature.id)
        .select()
        .single();

      if (updateError) throw updateError;
      signature = updated;
    } else {
      const { data: created, error: createError } = await supabaseClient
        .from('contract_signatures')
        .insert(signatureData)
        .select()
        .single();

      if (createError) throw createError;
      signature = created;
    }

    console.log('Signature record saved:', signature.id);

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        submission: docusealData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in initiate-docuseal-signature:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
