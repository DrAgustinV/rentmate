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
    console.log('Initiating Dock contract signature');

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

    const { tenancyId, propertyId } = await req.json();

    if (!tenancyId || !propertyId) {
      throw new Error('Missing tenancyId or propertyId');
    }

    console.log('User authenticated:', user.id);

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user is property manager
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('manager_id, title, address')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    if (property.manager_id !== user.id) {
      throw new Error('Only property manager can initiate contract signature');
    }

    // Check manager KYC
    const { data: managerProfile, error: managerError } = await supabaseAdmin
      .from('profiles')
      .select('kyc_status, dock_wallet_did, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (managerError || !managerProfile) {
      throw new Error('Manager profile not found');
    }

    if (managerProfile.kyc_status !== 'verified' || !managerProfile.dock_wallet_did) {
      throw new Error('Manager KYC verification required. Please complete identity verification first.');
    }

    console.log('Manager KYC verified');

    // Fetch tenancy and tenant info
    const { data: tenancy, error: tenancyError } = await supabaseAdmin
      .from('property_tenants')
      .select('tenant_id')
      .eq('id', tenancyId)
      .eq('property_id', propertyId)
      .single();

    if (tenancyError || !tenancy) {
      throw new Error('Tenancy not found');
    }

    // Check tenant KYC
    const { data: tenantProfile, error: tenantError } = await supabaseAdmin
      .from('profiles')
      .select('kyc_status, dock_wallet_did, first_name, last_name, email')
      .eq('id', tenancy.tenant_id)
      .single();

    if (tenantError || !tenantProfile) {
      throw new Error('Tenant profile not found');
    }

    if (tenantProfile.kyc_status !== 'verified' || !tenantProfile.dock_wallet_did) {
      throw new Error('Tenant KYC verification required. Please ask tenant to complete identity verification.');
    }

    console.log('Tenant KYC verified');

    // Fetch rent agreement
    const { data: rentAgreement, error: rentError } = await supabaseAdmin
      .from('rent_agreements')
      .select('rent_amount_cents, currency, start_date, end_date, payment_day')
      .eq('tenancy_id', tenancyId)
      .eq('is_active', true)
      .single();

    if (rentError || !rentAgreement) {
      throw new Error('Active rent agreement not found');
    }

    console.log('Rent agreement found');

    // Get company DID
    const { data: companyDIDSetting, error: companyDIDError } = await supabaseAdmin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'dock_company_did')
      .single();

    if (companyDIDError || !companyDIDSetting) {
      throw new Error('Company DID not configured. Please contact administrator.');
    }

    const companyDID = companyDIDSetting.setting_value.did;
    console.log('Company DID:', companyDID);

    // Determine if high-value contract (> €2000/month)
    const highValue = rentAgreement.rent_amount_cents > 200000;
    console.log('High value contract:', highValue);

    // Create contract document hash (simplified - using JSON stringification)
    // In production, you'd generate actual PDF and hash it
    const contractData = {
      property: property.title,
      address: property.address,
      rentAmount: rentAgreement.rent_amount_cents / 100,
      currency: rentAgreement.currency,
      startDate: rentAgreement.start_date,
      endDate: rentAgreement.end_date,
      manager: `${managerProfile.first_name} ${managerProfile.last_name}`,
      tenant: `${tenantProfile.first_name} ${tenantProfile.last_name}`,
    };

    const contractJSON = JSON.stringify(contractData);
    const encoder = new TextEncoder();
    const data = encoder.encode(contractJSON);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const documentHash = `sha256:${hashHex}`;

    console.log('Document hash generated:', documentHash);

    // Issue Verifiable Credential via Dock API
    const DOCK_API_URL = Deno.env.get('DOCK_API_URL') ?? 'https://api-testnet.dock.io';
    const DOCK_API_KEY = Deno.env.get('DOCK_API_KEY');

    if (!DOCK_API_KEY) {
      throw new Error('DOCK_API_KEY not configured');
    }

    const credentialPayload = {
      anchor: highValue, // Blockchain anchor for high-value contracts
      persist: true,
      credential: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'RentalAgreementCredential'],
        issuer: companyDID,
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(rentAgreement.end_date).toISOString(),
        credentialSubject: {
          id: tenantProfile.dock_wallet_did,
          landlord: {
            did: managerProfile.dock_wallet_did,
            name: `${managerProfile.first_name} ${managerProfile.last_name}`,
            email: managerProfile.email,
            role: 'landlord',
          },
          tenant: {
            did: tenantProfile.dock_wallet_did,
            name: `${tenantProfile.first_name} ${tenantProfile.last_name}`,
            email: tenantProfile.email,
            role: 'tenant',
          },
          rentAgreement: {
            propertyAddress: property.address || property.title,
            propertyTitle: property.title,
            rentAmount: rentAgreement.rent_amount_cents / 100,
            currency: rentAgreement.currency.toUpperCase(),
            termStart: rentAgreement.start_date,
            termEnd: rentAgreement.end_date,
            paymentDay: rentAgreement.payment_day,
            documentHash: documentHash,
          },
        },
        evidence: [{
          type: 'DocumentAttachment',
          documentHash: documentHash,
          hashAlgorithm: 'SHA-256',
          issuedAt: new Date().toISOString(),
        }],
      },
    };

    console.log('Issuing credential to Dock API...');

    const dockResponse = await fetch(`${DOCK_API_URL}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DOCK-API-TOKEN': DOCK_API_KEY,
      },
      body: JSON.stringify(credentialPayload),
    });

    if (!dockResponse.ok) {
      const errorText = await dockResponse.text();
      console.error('Dock API error:', errorText);
      throw new Error(`Dock API error: ${dockResponse.status} - ${errorText}`);
    }

    const dockData = await dockResponse.json();
    console.log('Dock credential created:', dockData.id);

    const qrCodeUrl = dockData.qrCode || `${DOCK_API_URL}/verify/${dockData.id}`;

    // Store signature record
    const { data: signature, error: insertError } = await supabaseAdmin
      .from('contract_signatures')
      .insert({
        tenancy_id: tenancyId,
        property_id: propertyId,
        initiated_by: user.id,
        signing_method: 'dock',
        workflow_status: 'pending_signatures',
        dock_workflow_id: dockData.id,
        dock_contract_url: qrCodeUrl,
        contract_document_hash: documentHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting signature:', insertError);
      throw new Error('Failed to store signature record');
    }

    console.log('Signature record created:', signature.id);

    // Log event
    await supabaseAdmin
      .from('signature_events')
      .insert({
        contract_signature_id: signature.id,
        event_type: 'credential_issued',
        event_data: { credential_id: dockData.id },
      });

    console.log('Contract signature initiated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        signature_id: signature.id,
        credential_id: dockData.id,
        qr_code_url: qrCodeUrl,
        message: 'Contract credential issued. Both parties must scan QR code to sign.',
        anchored: highValue,
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
