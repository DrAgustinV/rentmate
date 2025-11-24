import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Create property documents
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
      const { error: docError } = await supabaseAdmin.from('property_documents').insert({
        document_title: doc.document_title,
        document_category: 'property',
        file_name: doc.file_name,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        description: doc.description,
        uploaded_by: managerId,
        property_id: propertyId,
        file_path: `property-documents/${crypto.randomUUID()}.pdf`,
        file_size_bytes: 524288,
        version: 1,
        is_latest_version: true,
      });

      if (docError) throw docError;
    }
    console.log('Property documents created');

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

    for (const ticket of tickets) {
      const { error: ticketError } = await supabaseAdmin.from('tickets').insert({
        ...ticket,
        property_id: propertyId,
      });

      if (ticketError) throw ticketError;
    }
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
