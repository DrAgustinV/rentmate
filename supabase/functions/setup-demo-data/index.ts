import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimal valid PDF content (placeholder)
const PLACEHOLDER_PDF = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
  0x0A, 0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, // 1 0 obj
  0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, // <</Type
  0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, // /Catalog
  0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, // /Pages 2
  0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, 0x65, //  0 R>>e
  0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x32, 0x20, // ndobj 2 
  0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, // 0 obj <<
  0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x50, 0x61, // /Type/Pa
  0x67, 0x65, 0x73, 0x2F, 0x43, 0x6F, 0x75, 0x6E, // ges/Coun
  0x74, 0x20, 0x31, 0x2F, 0x4B, 0x69, 0x64, 0x73, // t 1/Kids
  0x5B, 0x33, 0x20, 0x30, 0x20, 0x52, 0x5D, 0x3E, // [3 0 R]>
  0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, // >endobj
  0x0A, 0x33, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, // 3 0 obj
  0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, // <</Type
  0x2F, 0x50, 0x61, 0x67, 0x65, 0x2F, 0x50, 0x61, // /Page/Pa
  0x72, 0x65, 0x6E, 0x74, 0x20, 0x32, 0x20, 0x30, // rent 2 0
  0x20, 0x52, 0x2F, 0x4D, 0x65, 0x64, 0x69, 0x61, //  R/Media
  0x42, 0x6F, 0x78, 0x5B, 0x30, 0x20, 0x30, 0x20, // Box[0 0 
  0x36, 0x31, 0x32, 0x20, 0x37, 0x39, 0x32, 0x5D, // 612 792]
  0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, // >>endob
  0x6A, 0x0A, 0x78, 0x72, 0x65, 0x66, 0x0A, 0x30, // jxref 0
  0x20, 0x34, 0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, //  4 00000
  0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, // 00000 65
  0x35, 0x33, 0x35, 0x20, 0x66, 0x0A, 0x30, 0x30, // 535 f 00
  0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x39, // 00000009
  0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, //  00000 n
  0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, // 0000000
  0x30, 0x35, 0x38, 0x20, 0x30, 0x30, 0x30, 0x30, // 058 0000
  0x30, 0x20, 0x6E, 0x0A, 0x30, 0x30, 0x30, 0x30, // 0 n 0000
  0x30, 0x30, 0x30, 0x31, 0x31, 0x35, 0x20, 0x30, // 000115 0
  0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A, 0x74, // 0000 n t
  0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A, 0x3C, // railer <
  0x3C, 0x2F, 0x53, 0x69, 0x7A, 0x65, 0x20, 0x34, // </Size 4
  0x2F, 0x52, 0x6F, 0x6F, 0x74, 0x20, 0x31, 0x20, // /Root 1 
  0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, 0x73, 0x74, // 0 R>>st
  0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0A, // artxref
  0x31, 0x39, 0x34, 0x0A, 0x25, 0x25, 0x45, 0x4F, // 194 %%EO
  0x46,                                           // F
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if demo data already exists - idempotency check
    const { data: existingManager } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', 'manager@rentmate.me')
      .single();

    if (existingManager) {
      console.log('Demo data already exists, skipping creation');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Demo data already exists',
          note: 'Skipped creation - data already present'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating demo users...');

    // Create manager user
    const { data: managerAuth, error: managerAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: 'manager@rentmate.me',
      password: 'asdasdasd',
      email_confirm: true,
      user_metadata: {
        first_name: 'Demo',
        last_name: 'Manager',
      },
    });

    if (managerAuthError) throw managerAuthError;
    const managerId = managerAuth.user.id;
    console.log('Manager created:', managerId);

    // Create tenant user
    const { data: tenantAuth, error: tenantAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: 'tenant@rentmate.me',
      password: 'asdasdasd',
      email_confirm: true,
      user_metadata: {
        first_name: 'Demo',
        last_name: 'Tenant',
      },
    });

    if (tenantAuthError) throw tenantAuthError;
    const tenantId = tenantAuth.user.id;
    console.log('Tenant created:', tenantId);

    // Create property
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert({
        title: 'Great Flat',
        manager_id: managerId,
        status: 'active',
        address: '123 Demo Street',
        city: 'Berlin',
        postal_code: '10115',
        country: 'DE',
        description: 'A beautiful modern flat perfect for urban living. Features 2 bedrooms, spacious living room, and fully equipped kitchen.',
      })
      .select()
      .single();

    if (propertyError) throw propertyError;
    const propertyId = property.id;
    console.log('Property created:', propertyId);

    // Create tenancy relationship
    const { data: tenancy, error: tenancyError } = await supabaseAdmin
      .from('property_tenants')
      .insert({
        property_id: propertyId,
        tenant_id: tenantId,
        tenancy_status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tenancyError) throw tenancyError;
    const tenancyId = tenancy.id;
    console.log('Tenancy created:', tenancyId);

    // Create rent agreement
    const { data: agreement, error: agreementError } = await supabaseAdmin
      .from('rent_agreements')
      .insert({
        property_id: propertyId,
        tenancy_id: tenancyId,
        manager_id: managerId,
        tenant_id: tenantId,
        rent_amount_cents: 100000,
        currency: 'eur',
        payment_day: 1,
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
        tenant_iban: 'DE89370400440532013000',
        mandate_status: 'active',
      })
      .select()
      .single();

    if (agreementError) throw agreementError;
    console.log('Rent agreement created:', agreement.id);

    // Create property documents WITH actual files uploaded to storage
    const documents = [
      {
        document_title: 'Standard Rental Contract',
        file_name: 'rental-contract-template.pdf',
        description: 'Standard rental contract template for new tenancies',
      },
      {
        document_title: 'Move-in Inspection Checklist',
        file_name: 'move-in-checklist.pdf',
        description: 'Checklist for property condition at move-in',
      },
      {
        document_title: 'Building Rules and Regulations',
        file_name: 'house-rules.pdf',
        description: 'Official building rules and tenant responsibilities',
      },
    ];

    for (const doc of documents) {
      // Generate unique file path WITHOUT bucket prefix
      const fileId = crypto.randomUUID();
      const filePath = `${propertyId}/${fileId}.pdf`;
      
      // Upload actual file to storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from('property-documents')
        .upload(filePath, PLACEHOLDER_PDF, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Failed to upload ${doc.file_name}:`, uploadError);
        throw uploadError;
      }
      console.log(`Uploaded file: ${filePath}`);

      // Create database record with correct file_path (no bucket prefix)
      const { error: docError } = await supabaseAdmin.from('property_documents').insert({
        document_title: doc.document_title,
        document_category: 'property',
        file_name: doc.file_name,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        description: doc.description,
        uploaded_by: managerId,
        property_id: propertyId,
        file_path: filePath, // Correct: no bucket prefix
        file_size_bytes: PLACEHOLDER_PDF.length,
        version: 1,
        is_latest_version: true,
      });

      if (docError) throw docError;
    }
    console.log('Property documents created with actual files');

    // Create tickets
    const tickets = [
      {
        title: 'Kitchen faucet is dripping',
        description: 'The kitchen sink faucet has been dripping constantly for the past two days. It\'s wasting water and making noise at night.',
        type: 'repair',
        status: 'open',
        priority: 'medium',
        created_by: tenantId,
      },
      {
        title: 'Annual fire safety inspection',
        description: 'Scheduled annual inspection of fire alarms, extinguishers, and emergency exits as required by building regulations.',
        type: 'inspection',
        status: 'in_progress',
        priority: 'high',
        created_by: managerId,
        assigned_to: managerId,
      },
      {
        title: 'Heating not working in bedroom',
        description: 'The radiator in the main bedroom is not heating up properly. Temperature drops significantly at night.',
        type: 'maintenance',
        status: 'resolved',
        priority: 'urgent',
        created_by: tenantId,
        resolved_by: managerId,
        resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolution_notes: 'Bled the radiator and adjusted the thermostatic valve. Heating now working properly.',
      },
    ];

    // Batch insert tickets instead of loop
    const ticketsWithProperty = tickets.map(ticket => ({
      ...ticket,
      property_id: propertyId,
    }));

    const { error: ticketsError } = await supabaseAdmin.from('tickets').insert(ticketsWithProperty);
    if (ticketsError) throw ticketsError;
    console.log('Tickets created');

    // Get standard maintenance templates
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('standard_maintenance_templates')
      .select('id, title')
      .in('title', ['HVAC Filter Replacement', 'Water Heater Inspection', 'Faucet & Pipe Leak Check'])
      .limit(3);

    if (templatesError) throw templatesError;

    if (templates && templates.length > 0) {
      const schedules = [
        {
          template_id: templates[0].id,
          frequency: 'monthly',
          months_offset: 1,
        },
        {
          template_id: templates[1]?.id || templates[0].id,
          frequency: 'quarterly',
          months_offset: 3,
        },
        {
          template_id: templates[2]?.id || templates[0].id,
          frequency: 'biannual',
          months_offset: 6,
        },
      ];

      for (const schedule of schedules) {
        const startDate = new Date();
        const nextRunDate = new Date();
        nextRunDate.setMonth(nextRunDate.getMonth() + schedule.months_offset);

        const { error: scheduleError } = await supabaseAdmin.from('recurring_schedules').insert({
          template_id: schedule.template_id,
          property_id: propertyId,
          frequency: schedule.frequency,
          start_date: startDate.toISOString().split('T')[0],
          next_run_date: nextRunDate.toISOString().split('T')[0],
          is_active: true,
          created_by: managerId,
        });

        if (scheduleError) throw scheduleError;
      }
      console.log('Recurring schedules created');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        manager: { id: managerId, email: 'manager@rentmate.me' },
        tenant: { id: tenantId, email: 'tenant@rentmate.me' },
        property: { id: propertyId, title: 'Great Flat' },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating demo data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
