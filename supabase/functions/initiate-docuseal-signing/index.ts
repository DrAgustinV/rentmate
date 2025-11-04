import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocuSealSubmission {
  id: number;
  slug: string;
  email: string;
  role: string;
  status: string;
  submission_url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tenancyId, propertyId } = await req.json();
    console.log('Initiating DocuSeal signing for tenancy:', tenancyId);

    // Verify user is the property manager
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('manager_id, address, require_kyc_for_contracts')
      .eq('id', propertyId)
      .single();

    if (propError || property.manager_id !== user.id) {
      throw new Error('Only the property manager can initiate contract signing');
    }

    // Get tenancy details
    const { data: tenancy, error: tenancyError } = await supabase
      .from('property_tenants')
      .select('tenant_id, start_date, end_date')
      .eq('id', tenancyId)
      .single();

    if (tenancyError) throw new Error('Tenancy not found');

    // Get manager profile
    const { data: managerProfile, error: managerError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, kyc_status, kyc_wallet_did, require_kyc_for_contracts')
      .eq('id', property.manager_id)
      .single();

    if (managerError) throw new Error('Manager profile not found');

    // Get tenant profile
    const { data: tenantProfile, error: tenantError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, kyc_status, kyc_wallet_did')
      .eq('id', tenancy.tenant_id)
      .single();

    if (tenantError) throw new Error('Tenant profile not found');

    // Determine if KYC is required (hierarchy: property > manager > false)
    const kycRequired = property.require_kyc_for_contracts ?? 
                        managerProfile.require_kyc_for_contracts ?? 
                        false;

    // Check KYC status if required
    if (kycRequired) {
      if (managerProfile.kyc_status !== 'verified' || !managerProfile.kyc_wallet_did) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Manager KYC verification required for this contract',
            kycRequired: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (tenantProfile.kyc_status !== 'verified' || !tenantProfile.kyc_wallet_did) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Tenant KYC verification required for this contract',
            kycRequired: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const kycEnforced = kycRequired && 
                        managerProfile.kyc_status === 'verified' && 
                        tenantProfile.kyc_status === 'verified';

    // Create submission in DocuSeal
    const docusealApiUrl = Deno.env.get('DOCUSEAL_API_URL')!;
    const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY')!;
    const templateId = Deno.env.get('DOCUSEAL_RENTAL_TEMPLATE_ID')!;

    const submissionData = {
      template_id: parseInt(templateId),
      send_email: false, // We'll handle notifications ourselves
      submitters: [
        {
          role: 'Manager',
          email: managerProfile.email,
          name: `${managerProfile.first_name} ${managerProfile.last_name}`,
        },
        {
          role: 'Tenant',
          email: tenantProfile.email,
          name: `${tenantProfile.first_name} ${tenantProfile.last_name}`,
        }
      ],
      fields: [
        { name: 'property_address', value: property.address },
        { name: 'start_date', value: tenancy.start_date },
        { name: 'end_date', value: tenancy.end_date || '' },
        { name: 'manager_name', value: `${managerProfile.first_name} ${managerProfile.last_name}` },
        { name: 'tenant_name', value: `${tenantProfile.first_name} ${tenantProfile.last_name}` },
      ]
    };

    console.log('Creating DocuSeal submission:', submissionData);

    const docusealResponse = await fetch(`${docusealApiUrl}/submissions`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': docusealApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });

    if (!docusealResponse.ok) {
      const errorText = await docusealResponse.text();
      console.error('DocuSeal API error:', errorText);
      throw new Error(`DocuSeal API error: ${docusealResponse.status}`);
    }

    const submissions: DocuSealSubmission[] = await docusealResponse.json();
    console.log('DocuSeal submissions created:', submissions);

    // Store in database
    const { data: signature, error: insertError } = await supabase
      .from('contract_signatures')
      .insert({
        tenancy_id: tenancyId,
        property_id: propertyId,
        manager_id: property.manager_id,
        tenant_id: tenancy.tenant_id,
        signing_method: 'docuseal',
        workflow_status: 'pending',
        kyc_enforced: kycEnforced,
        docuseal_submission_slug: submissions[0].slug,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Contract signature record created:', signature.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'DocuSeal signing workflow initiated successfully',
        signatureId: signature.id,
        submissionSlug: submissions[0].slug,
        kycEnforced,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error initiating DocuSeal signing:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
