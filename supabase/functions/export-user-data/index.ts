import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Exporting data for user: ${user.id}`);

    // Fetch all user data
    const [
      profile,
      properties,
      tenancies,
      tickets,
      rentAgreements,
      rentPayments,
      utilityPayments,
      documents,
      signatures,
      repairShops,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('properties').select('*').eq('manager_id', user.id),
      supabase.from('property_tenants').select('*, properties(*)').eq('tenant_id', user.id),
      supabase.from('tickets').select('*').or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`),
      supabase.from('rent_agreements').select('*').or(`manager_id.eq.${user.id},tenant_id.eq.${user.id}`),
      supabase.from('rent_payments').select('*').or(`manager_id.eq.${user.id},tenant_id.eq.${user.id}`),
      supabase.from('utility_payments').select('*').or(`manager_id.eq.${user.id},tenant_id.eq.${user.id}`),
      supabase.from('property_documents').select('*').eq('uploaded_by', user.id),
      supabase.from('contract_signatures').select('*').eq('initiated_by', user.id),
      supabase.from('repair_shops').select('*').eq('manager_id', user.id),
    ]);

    // Get analytics summary
    const { count: pageViewsCount } = await supabase
      .from('analytics_page_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: sessionsCount } = await supabase
      .from('analytics_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Compile export data
    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: profile.data,
      properties: properties.data || [],
      tenancies: tenancies.data || [],
      tickets: tickets.data || [],
      rent_agreements: rentAgreements.data || [],
      rent_payments: rentPayments.data || [],
      utility_payments: utilityPayments.data || [],
      documents: (documents.data || []).map((doc: any) => ({
        ...doc,
        file_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${doc.file_path}`,
      })),
      contract_signatures: signatures.data || [],
      repair_shops: repairShops.data || [],
      analytics_summary: {
        total_page_views: pageViewsCount || 0,
        total_sessions: sessionsCount || 0,
      },
    };

    console.log('Data export completed successfully');

    return new Response(
      JSON.stringify(exportData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-export-${user.id}.json"`,
        },
      }
    );
  } catch (error: any) {
    console.error('Error exporting user data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
