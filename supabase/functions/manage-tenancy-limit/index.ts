import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { property_id } = await req.json();

    if (!property_id) {
      throw new Error('property_id is required');
    }

    console.log(`Checking tenancy limit for property: ${property_id}`);

    // Count all tenancies for this property
    const { data: tenancies, error: countError } = await supabase
      .from('property_tenants')
      .select('id, tenancy_status, started_at')
      .eq('property_id', property_id)
      .order('started_at', { ascending: true });

    if (countError) throw countError;

    console.log(`Found ${tenancies?.length || 0} tenancies`);

    // If more than 5 tenancies, delete the oldest inactive one
    if (tenancies && tenancies.length > 5) {
      const inactiveTenancies = tenancies.filter(t => t.tenancy_status === 'inactive');
      
      if (inactiveTenancies.length > 0) {
        const oldestInactive = inactiveTenancies[0];
        console.log(`Deleting oldest inactive tenancy: ${oldestInactive.id}`);

        // Delete associated documents
        const { data: docs } = await supabase
          .from('property_documents')
          .select('file_path')
          .eq('tenancy_id', oldestInactive.id);

        if (docs) {
          for (const doc of docs) {
            await supabase.storage
              .from('property-documents')
              .remove([doc.file_path]);
          }
        }

        // Delete document records
        await supabase
          .from('property_documents')
          .delete()
          .eq('tenancy_id', oldestInactive.id);

        // Delete tenancy record
        const { error: deleteError } = await supabase
          .from('property_tenants')
          .delete()
          .eq('id', oldestInactive.id);

        if (deleteError) throw deleteError;

        console.log('Successfully enforced FIFO tenancy limit');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'FIFO limit enforced',
            deleted_tenancy_id: oldestInactive.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'No action needed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in manage-tenancy-limit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});