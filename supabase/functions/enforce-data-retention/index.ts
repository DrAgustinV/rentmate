import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetentionPolicies {
  tenant_data_after_tenancy_end: string;
  inactive_account_anonymization: string;
  financial_records: string;
  analytics_data: string;
  ticket_data: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting data retention enforcement job...');

    // Fetch retention policies from system_settings
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'data_retention_policies')
      .single();

    if (settingsError) throw settingsError;

    const policies = settingsData.setting_value as RetentionPolicies;
    console.log('Retention policies:', policies);

    let totalAffected = 0;
    let totalAnonymized = 0;
    let totalDeleted = 0;
    const executionDetails: Record<string, unknown> = {};

    // 1. Anonymize tenant data after tenancy end (3 years)
    const tenancyEndDate = new Date();
    tenancyEndDate.setFullYear(tenancyEndDate.getFullYear() - parseInt(policies.tenant_data_after_tenancy_end));

    const { data: expiredTenancies } = await supabaseAdmin
      .from('property_tenants')
      .select('tenant_id')
      .eq('tenancy_status', 'historic')
      .lt('ended_at', tenancyEndDate.toISOString());

    if (expiredTenancies && expiredTenancies.length > 0) {
      const tenantIds = expiredTenancies.map(t => t.tenant_id);
      
      // Anonymize profiles
      const { error: anonymizeError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: 'Deleted',
          last_name: 'User',
          email: `deleted-${crypto.randomUUID()}@anonymized.local`,
          phone: null,
          manager_iban: null,
        })
        .in('id', tenantIds);

      if (!anonymizeError) {
        totalAnonymized += tenantIds.length;
        executionDetails.anonymized_expired_tenants = tenantIds.length;
      }
    }

    // 2. Anonymize inactive accounts (5 years)
    const inactiveDate = new Date();
    inactiveDate.setFullYear(inactiveDate.getFullYear() - parseInt(policies.inactive_account_anonymization));

    const { data: inactiveUsers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .lt('updated_at', inactiveDate.toISOString())
      .is('deletion_requested_at', null);

    if (inactiveUsers && inactiveUsers.length > 0) {
      const userIds = inactiveUsers.map(u => u.id);
      
      // Check if they have any active properties or tenancies
      const { data: activeProperties } = await supabaseAdmin
        .from('properties')
        .select('manager_id')
        .in('manager_id', userIds)
        .eq('status', 'active');

      const { data: activeTenancies } = await supabaseAdmin
        .from('property_tenants')
        .select('tenant_id')
        .in('tenant_id', userIds)
        .in('tenancy_status', ['active', 'ending_tenancy']);

      // Only anonymize truly inactive users
      const activeUserIds = new Set([
        ...(activeProperties?.map(p => p.manager_id) || []),
        ...(activeTenancies?.map(t => t.tenant_id) || [])
      ]);

      const inactiveUserIds = userIds.filter(id => !activeUserIds.has(id));

      if (inactiveUserIds.length > 0) {
        const { error: anonymizeError } = await supabaseAdmin
          .from('profiles')
          .update({
            first_name: 'Deleted',
            last_name: 'User',
            email: `deleted-${crypto.randomUUID()}@anonymized.local`,
            phone: null,
            manager_iban: null,
          })
          .in('id', inactiveUserIds);

        if (!anonymizeError) {
          totalAnonymized += inactiveUserIds.length;
          executionDetails.anonymized_inactive_accounts = inactiveUserIds.length;
        }
      }
    }

    // 3. Delete old analytics data (2 years)
    const analyticsDate = new Date();
    analyticsDate.setFullYear(analyticsDate.getFullYear() - parseInt(policies.analytics_data));

    const { error: analyticsError, count: analyticsCount } = await supabaseAdmin
      .from('analytics_page_views')
      .delete()
      .lt('timestamp', analyticsDate.toISOString());

    if (!analyticsError && analyticsCount) {
      totalDeleted += analyticsCount;
      executionDetails.deleted_analytics_page_views = analyticsCount;
    }

    const { error: eventsError, count: eventsCount } = await supabaseAdmin
      .from('analytics_events')
      .delete()
      .lt('timestamp', analyticsDate.toISOString());

    if (!eventsError && eventsCount) {
      totalDeleted += eventsCount;
      executionDetails.deleted_analytics_events = eventsCount;
    }

    const { error: navError, count: navCount } = await supabaseAdmin
      .from('analytics_navigation_paths')
      .delete()
      .lt('timestamp', analyticsDate.toISOString());

    if (!navError && navCount) {
      totalDeleted += navCount;
      executionDetails.deleted_navigation_paths = navCount;
    }

    // 4. Anonymize old ticket data (3 years) - but keep financial records
    const ticketDate = new Date();
    ticketDate.setFullYear(ticketDate.getFullYear() - parseInt(policies.ticket_data));

    const { data: oldTickets } = await supabaseAdmin
      .from('tickets')
      .select('id, created_by')
      .eq('status', 'resolved')
      .lt('resolved_at', ticketDate.toISOString());

    if (oldTickets && oldTickets.length > 0) {
      // Delete ticket comments and activities
      const ticketIds = oldTickets.map(t => t.id);
      
      const { error: commentsError } = await supabaseAdmin
        .from('ticket_comments')
        .delete()
        .in('ticket_id', ticketIds);

      const { error: activitiesError } = await supabaseAdmin
        .from('ticket_activities')
        .delete()
        .in('ticket_id', ticketIds);

      if (!commentsError || !activitiesError) {
        totalDeleted += ticketIds.length;
        executionDetails.deleted_old_tickets = ticketIds.length;
      }
    }

    // 5. Process scheduled account deletions
    const { data: scheduledDeletions } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .not('deletion_scheduled_for', 'is', null)
      .lt('deletion_scheduled_for', new Date().toISOString());

    if (scheduledDeletions && scheduledDeletions.length > 0) {
      for (const user of scheduledDeletions) {
        try {
          // Anonymize profile
          await supabaseAdmin
            .from('profiles')
            .update({
              first_name: 'Deleted',
              last_name: `User #${user.id.substring(0, 8)}`,
              email: `deleted-${user.id.substring(0, 8)}@anonymized.local`,
              phone: null,
              manager_iban: null,
              deletion_requested_at: null,
              deletion_scheduled_for: null,
            })
            .eq('id', user.id);

          // Delete auth user
          await supabaseAdmin.auth.admin.deleteUser(user.id);

          totalAnonymized += 1;
        } catch (error) {
          console.error(`Failed to delete user ${user.id}:`, error);
        }
      }
      executionDetails.processed_scheduled_deletions = scheduledDeletions.length;
    }

    totalAffected = totalAnonymized + totalDeleted;

    // Log the execution
    await supabaseAdmin
      .from('data_retention_audit')
      .insert({
        policy_type: 'monthly_enforcement',
        affected_records: totalAffected,
        anonymized_records: totalAnonymized,
        deleted_records: totalDeleted,
        execution_details: executionDetails,
      });

    console.log('Data retention enforcement completed:', {
      totalAffected,
      totalAnonymized,
      totalDeleted,
      executionDetails,
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalAffected,
        totalAnonymized,
        totalDeleted,
        executionDetails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Data retention enforcement error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
