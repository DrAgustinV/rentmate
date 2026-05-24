import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INITIATE-YOUSIGN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { tenancyId, propertyId, documentId } = await req.json();

    logStep('Initiating YouSign signature', { tenancyId, propertyId, documentId, userId: user.id });

    // ========== SUBSCRIPTION & USAGE CHECK ==========
    logStep('Checking subscription limits');

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
          feature_limits
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !subscription) {
      throw new Error('No active subscription found. Please subscribe to a plan.');
    }

    const plan = Array.isArray(subscription.subscription_plans) 
      ? subscription.subscription_plans[0] 
      : subscription.subscription_plans;

    const featureLimits = plan.feature_limits || {};
    const signaturesLimit = featureLimits.digital_signatures_per_year || 0;

    logStep('Subscription found', { 
      plan: plan.slug, 
      signaturesLimit,
      stripeCustomerId: subscription.stripe_customer_id 
    });

    // Check if FREE plan (no signatures allowed)
    if (plan.slug === 'free' || signaturesLimit === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Upgrade required',
          message: 'Digital signatures require a Pro or Enterprise plan. Please upgrade to continue.',
          requires_upgrade: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
      );
    }

    // Get current year's usage
    const currentYear = new Date().getFullYear();
    const { data: usage } = await supabase
      .from('subscription_usage')
      .select('signatures_used, overage_signatures_used')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .single();

    const signaturesUsed = usage?.signatures_used || 0;
    const overageUsed = usage?.overage_signatures_used || 0;
    const isWithinLimit = signaturesUsed < signaturesLimit;

    logStep('Usage check', { 
      signaturesUsed, 
      signaturesLimit, 
      overageUsed,
      isWithinLimit 
    });

    let overageCharged = false;
    let overageAmountCents = 0;

    // If over limit, charge for overage
    if (!isWithinLimit) {
      logStep('Over limit - charging overage');

      if (!stripeKey) {
        throw new Error('Payment system not configured. Please contact support.');
      }

      const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
      const pricePerSignatureCents = plan.overage_price_per_signature_cents || 200; // Default €2

      // Get or create Stripe customer
      let stripeCustomerId = subscription.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        stripeCustomerId = customer.id;

        await supabase
          .from('user_subscriptions')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', subscription.id);

        logStep('Created Stripe customer', { stripeCustomerId });
      }

      // Create invoice item for overage
      const invoiceItem = await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        amount: pricePerSignatureCents,
        currency: 'eur',
        description: 'Digital Signature Overage (1 signature)',
        metadata: {
          overage_type: 'signature',
          quantity: '1',
          user_id: user.id,
          timestamp: new Date().toISOString(),
        },
      });

      logStep('Created invoice item', { invoiceItemId: invoiceItem.id });

      // Create and finalize invoice
      const invoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata: {
          type: 'overage',
          overage_type: 'signature',
          user_id: user.id,
        },
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      logStep('Invoice finalized', { 
        invoiceId: finalizedInvoice.id, 
        status: finalizedInvoice.status 
      });

      // Track overage usage
      await supabase.rpc('increment_overage_signatures', {
        p_user_id: user.id,
        p_year: currentYear,
        p_amount: 1,
      });

      overageCharged = true;
      overageAmountCents = pricePerSignatureCents;

      logStep('Overage charged successfully', { 
        amount: `€${(pricePerSignatureCents / 100).toFixed(2)}` 
      });
    } else {
      // Within limit - just increment usage
      await supabase.rpc('increment_signatures_used', {
        p_user_id: user.id,
        p_year: currentYear,
        p_amount: 1,
      });

      logStep('Incremented signatures_used within limit');
    }

    // ========== PROCEED WITH SIGNATURE CREATION ==========
    
    // Verify user is property manager
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('country, manager_id, title, address')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }

    if (property.manager_id !== user.id) {
      throw new Error('Unauthorized: Only property manager can initiate signatures');
    }

    // Require document selection
    if (!documentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please select a document to sign from your tenancy documents.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch document record
    const { data: document, error: docError } = await supabase
      .from('property_documents')
      .select('file_path, file_name, file_type, document_title, file_size_bytes')
      .eq('id', documentId)
      .eq('tenancy_id', tenancyId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found or does not belong to this tenancy');
    }

    // Validate document for KYC/signature workflow
    const ALLOWED_MIME_TYPES = ['application/pdf'];
    const ALLOWED_EXTENSIONS = ['.pdf'];
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(document.file_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid file type. Only PDF documents are allowed for signatures.',
          code: 'INVALID_FILE_TYPE'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check file extension
    const fileExtension = document.file_name?.toLowerCase().slice(document.file_name?.lastIndexOf('.'));
    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid file extension. Only .pdf files are allowed.',
          code: 'INVALID_FILE_EXTENSION'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check file size
    if (document.file_size_bytes && document.file_size_bytes > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File too large. Maximum allowed size is 10MB.`,
          code: 'FILE_TOO_LARGE'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Download file from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('property-documents')
      .download(document.file_path);

    if (storageError || !fileData) {
      throw new Error('Failed to retrieve document from storage');
    }

    const fileBuffer = await fileData.arrayBuffer();

    // Fetch tenancy and tenant details
    const { data: tenancy, error: tenancyError } = await supabase
      .from('property_tenants')
      .select(`
        id,
        tenant_id,
        profiles!property_tenants_tenant_id_fkey(id, first_name, last_name, email, phone)
      `)
      .eq('id', tenancyId)
      .single();

    if (tenancyError || !tenancy) {
      throw new Error('Tenancy not found');
    }

    const tenant = Array.isArray(tenancy.profiles) ? tenancy.profiles[0] : tenancy.profiles;

    // Fetch manager profile
    const { data: managerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', user.id)
      .single();

    if (!managerProfile) {
      throw new Error('Manager profile not found');
    }

    // Import YouSign client
    const { createYouSignClient } = await import('../_shared/yousign-client.ts');
    const yousignClient = createYouSignClient();

    // Create signature request
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // 30 days to sign

    const signatureRequest = await yousignClient.createSignatureRequest({
      name: `${document.document_title} - ${property.title}`,
      delivery_mode: 'email',
      external_id: tenancyId,
      expiration_date: expirationDate.toISOString().split('T')[0],
    });

    logStep('YouSign signature request created', { requestId: signatureRequest.id });

    // Upload document
    const uploadedDoc = await yousignClient.uploadDocument(
      signatureRequest.id,
      fileBuffer,
      document.file_name
    );

    logStep('Document uploaded to YouSign', { documentId: uploadedDoc.id });

    // Add manager as first signer
    const managerSigner = await yousignClient.addSigner(
      signatureRequest.id,
      uploadedDoc.id,
      {
        info: {
          first_name: managerProfile.first_name || 'Manager',
          last_name: managerProfile.last_name || '',
          email: managerProfile.email,
          phone_number: managerProfile.phone,
          locale: 'en',
        },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'otp_email',
        fields: [
          {
            type: 'signature',
            page: 1,
            x: 100,
            y: 650,
            width: 180,
            height: 60,
          },
        ],
      }
    );

    logStep('Manager signer added', { signerId: managerSigner.id });

    // Add tenant as second signer
    const tenantSigner = await yousignClient.addSigner(
      signatureRequest.id,
      uploadedDoc.id,
      {
        info: {
          first_name: tenant.first_name || 'Tenant',
          last_name: tenant.last_name || '',
          email: tenant.email,
          phone_number: tenant.phone,
          locale: 'en',
        },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'otp_email',
        fields: [
          {
            type: 'signature',
            page: 1,
            x: 320,
            y: 650,
            width: 180,
            height: 60,
          },
        ],
      }
    );

    logStep('Tenant signer added', { signerId: tenantSigner.id });

    // Activate the signature request (start the process)
    const activatedRequest = await yousignClient.activateSignatureRequest(signatureRequest.id);

    logStep('YouSign signature request activated', { status: activatedRequest.status });

    // Create signature record in database
    const { data: signature, error: signatureError } = await supabase
      .from('contract_signatures')
      .insert({
        tenancy_id: tenancyId,
        property_id: propertyId,
        signing_method_provider: 'yousign',
        signature_method: 'AES',
        workflow_status: 'pending',
        qualified_signature_provider: 'yousign',
        qualified_signature_session_id: signatureRequest.id,
        tenant_signer_id: tenantSigner.id,
        qualified_signature_metadata: {
          yousign_request_id: signatureRequest.id,
          yousign_document_id: uploadedDoc.id,
          manager_signer_id: managerSigner.id,
          tenant_signer_id: tenantSigner.id,
          manager_signature_link: managerSigner.signature_link,
          tenant_signature_link: tenantSigner.signature_link,
          status: activatedRequest.status,
          overage_charged: overageCharged,
          overage_amount_cents: overageAmountCents,
        },
        source_document_id: documentId,
        initiated_by: user.id,
        expires_at: expirationDate.toISOString(),
      })
      .select()
      .single();

    if (signatureError) {
      console.error('Error creating signature record:', signatureError);
      throw new Error('Failed to create signature record');
    }

    // Log initiation event
    await supabase
      .from('qualified_signature_logs')
      .insert({
        contract_signature_id: signature.id,
        session_id: signatureRequest.id,
        provider_code: 'yousign',
        event_type: 'initiated',
      });

    const response: Record<string, unknown> = {
      success: true,
      signatureId: signature.id,
      yousignRequestId: signatureRequest.id,
      managerSignatureLink: managerSigner.signature_link,
      tenantSignatureLink: tenantSigner.signature_link,
      message: 'YouSign signature request created. Both parties will receive email invitations.',
    };

    // Include overage info if charged
    if (overageCharged) {
      response.overage = {
        charged: true,
        amount_cents: overageAmountCents,
        amount_formatted: `€${(overageAmountCents / 100).toFixed(2)}`,
        message: `An overage charge of €${(overageAmountCents / 100).toFixed(2)} was applied for this signature.`,
      };
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error initiating YouSign signature:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
