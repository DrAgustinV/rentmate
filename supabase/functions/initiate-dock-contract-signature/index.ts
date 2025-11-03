import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DockSigningRequest {
  tenancyId: string;
  propertyId: string;
  documentTitle: string;
  documentContent: string;
  signers: {
    email: string;
    name: string;
    role: 'manager' | 'tenant';
  }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Initiating Dock Labs contract signature');

    // Authenticate user
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
      throw new Error('Not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const { tenancyId, propertyId, documentTitle, documentContent }: DockSigningRequest = await req.json();

    if (!tenancyId || !propertyId || !documentTitle || !documentContent) {
      throw new Error('Missing required fields');
    }

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
      throw new Error('Only property manager can initiate contract signing');
    }

    // Fetch tenancy and profiles
    const { data: tenancy, error: tenancyError } = await supabaseClient
      .from('property_tenants')
      .select('tenant_id')
      .eq('id', tenancyId)
      .single();

    if (tenancyError || !tenancy) {
      throw new Error('Tenancy not found');
    }

    const { data: managerProfile, error: managerError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single();

    const { data: tenantProfile, error: tenantError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', tenancy.tenant_id)
      .single();

    if (managerError || tenantError || !managerProfile || !tenantProfile) {
      throw new Error('Failed to fetch user profiles');
    }

    console.log('Creating Dock signing workflow');

    // Create Dock signing workflow
    const dockApiUrl = Deno.env.get('DOCK_API_URL') ?? 'https://api-testnet.dock.io';
    const dockApiKey = Deno.env.get('DOCK_API_KEY');

    if (!dockApiKey) {
      throw new Error('DOCK_API_KEY not configured');
    }

    // Create signing workflow via Dock API
    const workflowData = {
      template: 'contract-signing', // Your configured template ID
      document: {
        title: documentTitle,
        content: documentContent,
        type: 'rental_agreement',
      },
      signers: [
        {
          email: managerProfile.email,
          name: `${managerProfile.first_name} ${managerProfile.last_name}`,
          role: 'manager',
        },
        {
          email: tenantProfile.email,
          name: `${tenantProfile.first_name} ${tenantProfile.last_name}`,
          role: 'tenant',
        },
      ],
      metadata: {
        tenancy_id: tenancyId,
        property_id: propertyId,
        initiated_by: user.id,
      },
    };

    const dockResponse = await fetch(`${dockApiUrl}/workflows/signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DOCK-API-TOKEN': dockApiKey,
      },
      body: JSON.stringify(workflowData),
    });

    if (!dockResponse.ok) {
      const errorText = await dockResponse.text();
      console.error('Dock API error:', errorText);
      throw new Error(`Dock API error: ${dockResponse.status} - ${errorText}`);
    }

    const dockData = await dockResponse.json();
    console.log('Dock workflow created:', dockData.id);

    // Store signature record in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    const { data: signature, error: signatureError } = await supabaseClient
      .from('contract_signatures')
      .insert({
        tenancy_id: tenancyId,
        property_id: propertyId,
        initiated_by: user.id,
        workflow_status: 'pending',
        signing_method: 'dock',
        dock_workflow_id: dockData.id,
        dock_contract_url: dockData.url || dockData.signingUrl,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (signatureError) {
      console.error('Failed to create signature record:', signatureError);
      throw new Error('Failed to create signature record');
    }

    // Log the initiation event
    await supabaseClient.from('signature_events').insert({
      contract_signature_id: signature.id,
      event_type: 'initiated',
      event_data: {
        workflow_id: dockData.id,
        signing_method: 'dock',
        signers: workflowData.signers,
      },
    });

    console.log('Contract signature initiated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        signature_id: signature.id,
        workflow_id: dockData.id,
        contract_url: dockData.url || dockData.signingUrl,
        message: 'Contract signature workflow created. Signers will receive email notifications.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in initiate-dock-contract-signature:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Failed to initiate contract signature',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
