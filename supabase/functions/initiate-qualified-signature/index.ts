import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getProviderByCountry } from "../_shared/signature-providers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tenancyId, propertyId } = await req.json();

    // Verify user is property manager
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('country, manager_id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    if (property.manager_id !== user.id) {
      throw new Error('Unauthorized: Only property manager can initiate signatures');
    }

    // Get provider for property country
    const provider = getProviderByCountry(property.country);
    if (!provider) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No qualified signature provider available for ${property.country}. Using DocuSeal or Mock instead.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Using provider ${provider.code} for country ${property.country}`);

    // Fetch tenancy and tenant details
    const { data: tenancy, error: tenancyError } = await supabase
      .from('property_tenants')
      .select(`
        id,
        tenant_id,
        profiles!property_tenants_tenant_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', tenancyId)
      .single();

    if (tenancyError || !tenancy) {
      throw new Error('Tenancy not found');
    }

    const tenant = Array.isArray(tenancy.profiles) ? tenancy.profiles[0] : tenancy.profiles;

    // Fetch rent agreement
    const { data: agreement, error: agreementError } = await supabase
      .from('rent_agreements')
      .select('*')
      .eq('tenancy_id', tenancyId)
      .eq('is_active', true)
      .single();

    if (agreementError || !agreement) {
      throw new Error('No active rent agreement found');
    }

    // Generate contract PDF (simplified - in production, use proper template)
    const contractText = `
      RENTAL AGREEMENT
      
      Property: ${propertyId}
      Tenant: ${tenant?.first_name || ''} ${tenant?.last_name || ''}
      Rent Amount: ${agreement.rent_amount_cents / 100} ${agreement.currency}
      Payment Day: ${agreement.payment_day}
      
      This is a legally binding contract.
    `;
    const documentBase64 = btoa(contractText);

    // Generate session ID and callback URL
    const sessionId = crypto.randomUUID();
    const callbackUrl = `${supabaseUrl}/functions/v1/qualified-signature-callback`;

    // Create signature record
    const { data: signature, error: signatureError } = await supabase
      .from('contract_signatures')
      .insert({
        tenancy_id: tenancyId,
        property_id: propertyId,
        signing_method: 'qualified',
        workflow_status: 'pending',
        qualified_signature_provider: provider.code,
        qualified_signature_session_id: sessionId,
        qualified_signature_callback_url: callbackUrl,
        qualified_signature_metadata: {
          provider_name: provider.name,
          country: property.country,
        },
        initiated_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (signatureError) {
      console.error('Error creating signature:', signatureError);
      throw new Error('Failed to create signature record');
    }

    // Log initiation event
    await supabase
      .from('qualified_signature_logs')
      .insert({
        contract_signature_id: signature.id,
        session_id: sessionId,
        provider_code: provider.code,
        event_type: 'initiated',
      });

    // Handle OpenAPI provider differently (OTP-based flow)
    if (provider.code === 'openapi') {
      const { createOpenAPIClient } = await import('../_shared/openapi-client.ts');
      
      try {
        const client = createOpenAPIClient();
        
        // Create signature request
        const signatureResponse = await client.createQESSignature({
          documentBase64,
          documentName: `contract-${tenancyId}.pdf`,
          signatureType: 'pades',
          callbackUrl,
          metadata: {
            tenancyId,
            propertyId,
            sessionId,
          },
        });
        
        console.log('OpenAPI signature created:', signatureResponse.id);
        
        // Send OTP to user (via SMS/email)
        await client.sendOTP(signatureResponse.id, 'both');
        
        // Update signature record with OpenAPI-specific fields
        const { error: updateError } = await supabase
          .from('contract_signatures')
          .update({
            qualified_signature_metadata: {
              ...signature.qualified_signature_metadata,
              openapi_signature_id: signatureResponse.id,
              otp_sent_at: new Date().toISOString(),
              signature_state: signatureResponse.state,
            },
          })
          .eq('id', signature.id);
          
        if (updateError) {
          console.error('Failed to update signature with OpenAPI ID:', updateError);
        }
        
        // Return session data with OTP prompt
        return new Response(
          JSON.stringify({
            success: true,
            sessionId,
            signatureId: signature.id,
            providerCode: provider.code,
            providerName: provider.name,
            openapi_signature_id: signatureResponse.id,
            requires_otp: true,
            message: 'OTP sent to your registered contact. Please check SMS/email.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        console.error('OpenAPI error:', error);
        throw new Error(`OpenAPI signature failed: ${error.message}`);
      }
    }

    // Generate protocol URL for other providers (AutoFirma, etc.)
    const protocolUrl = provider.getProtocolUrl({
      documentBase64,
      sessionId,
      callbackUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        signatureId: signature.id,
        protocolUrl,
        providerCode: provider.code,
        providerName: provider.name,
        documentBase64,
        callbackUrl,
        message: `${provider.name} signature initiated`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error initiating qualified signature:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
