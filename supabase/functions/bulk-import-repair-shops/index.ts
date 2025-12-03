import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepairShopImportRecord {
  company_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone: string;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  specializations?: string[];
  license_number?: string | null;
  notes?: string | null;
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
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data }: { data: RepairShopImportRecord[] } = await req.json();

    console.log(`Processing repair shop import for user ${user.id}`);
    console.log(`Records to process: ${data.length}`);

    const summary = {
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [] as Array<{ record: string; error: string }>,
    };

    for (const record of data) {
      summary.recordsProcessed++;

      try {
        const { error } = await supabaseClient.from('repair_shops').insert({
          manager_id: user.id,
          company_name: record.company_name,
          contact_person: record.contact_person ?? null,
          email: record.email ?? null,
          phone: record.phone,
          address: record.address ?? null,
          city: record.city ?? null,
          postal_code: record.postal_code ?? null,
          specializations: record.specializations ?? [],
          license_number: record.license_number ?? null,
          notes: record.notes ?? null,
          is_active: true,
        });

        if (error) {
          console.error('Failed to insert repair shop', {
            record: record.company_name,
            error,
          });
          summary.recordsFailed++;
          summary.errors.push({
            record: record.company_name,
            error: error.message,
          });
          continue;
        }

        summary.recordsSucceeded++;
      } catch (err: any) {
        console.error('Unexpected error inserting repair shop', err);
        summary.recordsFailed++;
        summary.errors.push({
          record: record.company_name,
          error: err.message ?? 'Unknown error',
        });
      }
    }

    console.log(
      `Repair shop import completed. Success: ${summary.recordsSucceeded}, Failed: ${summary.recordsFailed}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        summary,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Repair shop import failed', err);

    return new Response(
      JSON.stringify({
        error: err.message ?? 'Unexpected error during import',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
