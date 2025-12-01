import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tenancyId, propertyId } = await req.json();

    if (!tenancyId || !propertyId) {
      throw new Error('Missing required fields: tenancyId, propertyId');
    }

    console.log('[Mock Mode] Initiating signature for tenancy:', tenancyId);

    // Verify user is property manager
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('manager_id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    if (property.manager_id !== user.id) {
      throw new Error('Only property manager can initiate signatures');
    }

    // Get tenancy details
    const { data: tenancy, error: tenancyError } = await supabaseClient
      .from('property_tenants')
      .select('id, tenant_id, property_id')
      .eq('id', tenancyId)
      .single();

    if (tenancyError || !tenancy) {
      throw new Error('Tenancy not found');
    }

    // Get tenant profile
    const { data: tenantProfile, error: tenantError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', tenancy.tenant_id)
      .single();

    if (tenantError || !tenantProfile) {
      throw new Error('Tenant profile not found');
    }

    // Get manager details
    const { data: manager, error: managerError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (managerError || !manager) {
      throw new Error('Manager profile not found');
    }

    // Create contract signature record (MOCK MODE)
    const { data: signature, error: signatureError } = await supabaseClient
      .from('contract_signatures')
      .insert({
        tenancy_id: tenancyId,
        property_id: propertyId,
        signing_method_provider: 'mock',
        signature_method: 'SAS',
        workflow_id: `MOCK_${Date.now()}`, // Mock workflow ID
        workflow_status: 'in_progress',
        initiated_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (signatureError || !signature) {
      console.error('Error creating signature:', signatureError);
      throw new Error('Failed to create signature record');
    }

    // Log initiation event
    await supabaseClient.from('signature_events').insert({
      contract_signature_id: signature.id,
      event_type: 'initiated',
      event_data: {
        manager: {
          name: `${manager.first_name} ${manager.last_name}`,
          email: manager.email,
        },
        tenant: {
          name: `${tenantProfile.first_name} ${tenantProfile.last_name}`,
          email: tenantProfile.email,
        },
        mode: 'mock',
      },
    });

    console.log('[Mock Mode] Signature initiated successfully:', signature.id);

    return new Response(
      JSON.stringify({
        success: true,
        signatureId: signature.id,
        workflowId: signature.workflow_id,
        mode: 'mock',
        message: 'Signature workflow initiated in MOCK mode. Use the Complete Signature button to simulate signing.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
