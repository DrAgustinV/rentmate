import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TenantData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  started_at: string;
  ended_at?: string;
  rent_amount_cents: number;
  payment_day: number;
  currency: string;
}

interface PropertyData {
  title: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  description?: string;
  tenants?: TenantData[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { importType, data: importData, options, importLogId } = await req.json();

    console.log(`Processing ${importType} import for user ${user.id}`);
    console.log(`Options:`, options);
    console.log(`Records to process: ${importData.length}`);

    const results = {
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [] as any[],
      createdPropertyIds: [] as string[],
      invitationsSent: 0,
    };

    // Process each property
    for (const record of importData) {
      results.recordsProcessed++;

      try {
        // Create property
        const propertyData: any = {
          title: record.title,
          manager_id: user.id,
          country: record.country,
          status: 'active',
        };

        if (record.address) propertyData.address = record.address;
        if (record.city) propertyData.city = record.city;
        if (record.state_province) propertyData.state_province = record.state_province;
        if (record.postal_code) propertyData.postal_code = record.postal_code;
        if (record.description) propertyData.description = record.description;

        const { data: property, error: propertyError } = await supabaseClient
          .from('properties')
          .insert(propertyData)
          .select()
          .single();

        if (propertyError) {
          console.error(`Property creation failed:`, propertyError);
          results.errors.push({
            record: record.title,
            field: 'property',
            error: propertyError.message,
          });
          results.recordsFailed++;
          continue;
        }

        console.log(`Created property: ${property.id}`);
        results.createdPropertyIds.push(property.id);

        // Process tenants if included
        if (options.createAgreements && record.tenants && record.tenants.length > 0) {
          for (const tenant of record.tenants) {
            try {
              // Check if user exists with this email
              const { data: existingProfile } = await supabaseClient
                .from('profiles')
                .select('id, email')
                .eq('email', tenant.email)
                .maybeSingle();

              let tenantId: string;

              if (existingProfile) {
                tenantId = existingProfile.id;
                console.log(`Using existing tenant: ${tenantId}`);
              } else if (options.sendInvitations) {
                // Create invitation
                const inviteToken = crypto.randomUUID();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 14);

                const { error: inviteError } = await supabaseClient
                  .from('invitations')
                  .insert({
                    property_id: property.id,
                    email: tenant.email,
                    token: inviteToken,
                    expires_at: expiresAt.toISOString(),
                    status: 'pending',
                  });

                if (inviteError) {
                  console.error(`Invitation creation failed:`, inviteError);
                  throw inviteError;
                }

                // Send invitation email
                const { error: emailError } = await supabaseClient.functions.invoke(
                  'send-tenant-invitation',
                  {
                    body: {
                      invitationId: inviteToken,
                      recipientEmail: tenant.email,
                      propertyTitle: property.title,
                      recipientName: `${tenant.first_name} ${tenant.last_name}`,
                    },
                  }
                );

                if (!emailError) {
                  results.invitationsSent++;
                }

                console.log(`Created invitation for: ${tenant.email}`);
                continue; // Skip creating tenancy until they accept
              } else {
                console.log(`Skipping tenant ${tenant.email} - no existing profile and invitations disabled`);
                continue;
              }

              // Create tenancy relationship
              const tenancyData: any = {
                property_id: property.id,
                tenant_id: tenantId,
                started_at: tenant.started_at,
                tenancy_status: 'active',
              };

              if (tenant.ended_at) {
                tenancyData.ended_at = tenant.ended_at;
                tenancyData.tenancy_status = 'ended';
              }

              const { data: tenancy, error: tenancyError } = await supabaseClient
                .from('property_tenants')
                .insert(tenancyData)
                .select()
                .single();

              if (tenancyError) {
                console.error(`Tenancy creation failed:`, tenancyError);
                throw tenancyError;
              }

              // Create rent agreement
              const { error: agreementError } = await supabaseClient
                .from('rent_agreements')
                .insert({
                  property_id: property.id,
                  tenancy_id: tenancy.id,
                  manager_id: user.id,
                  tenant_id: tenantId,
                  rent_amount_cents: tenant.rent_amount_cents,
                  payment_day: tenant.payment_day,
                  start_date: tenant.started_at,
                  end_date: tenant.ended_at || null,
                  currency: tenant.currency.toLowerCase(),
                  is_active: !tenant.ended_at,
                });

              if (agreementError) {
                console.error(`Rent agreement creation failed:`, agreementError);
                throw agreementError;
              }

              console.log(`Created rent agreement for tenant: ${tenantId}`);
            } catch (tenantError: any) {
              console.error(`Tenant processing failed:`, tenantError);
              results.errors.push({
                record: `${record.title} - ${tenant.email}`,
                field: 'tenant',
                error: tenantError.message,
              });
            }
          }
        }

        results.recordsSucceeded++;
      } catch (error: any) {
        console.error(`Record processing failed:`, error);
        results.errors.push({
          record: record.title,
          error: error.message,
        });
        results.recordsFailed++;
      }
    }

    console.log(`Import completed. Success: ${results.recordsSucceeded}, Failed: ${results.recordsFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          recordsProcessed: results.recordsProcessed,
          recordsSucceeded: results.recordsSucceeded,
          recordsFailed: results.recordsFailed,
          propertiesCreated: results.createdPropertyIds.length,
          invitationsSent: results.invitationsSent,
          errors: results.errors,
        },
        createdPropertyIds: results.createdPropertyIds,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
