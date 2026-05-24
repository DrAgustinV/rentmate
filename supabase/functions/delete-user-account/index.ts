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

    const { action } = await req.json();

    if (action === 'request') {
      // Request deletion - set deletion date 14 days from now
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 14);

      const { error } = await supabase
        .from('profiles')
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_scheduled_for: deletionDate.toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log(`Deletion requested for user ${user.id}, scheduled for ${deletionDate.toISOString()}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account deletion requested',
          deletion_date: deletionDate.toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'cancel') {
      // Cancel deletion request
      const { error } = await supabase
        .from('profiles')
        .update({
          deletion_requested_at: null,
          deletion_scheduled_for: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log(`Deletion cancelled for user ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account deletion cancelled',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (action === 'execute') {
      // Execute deletion immediately (admin-only or for testing)
      // This would be called by a scheduled job after grace period
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Anonymize user data instead of full deletion
      // Keep financial records for compliance (7 years)
      await supabase
        .from('profiles')
        .update({
          first_name: `Deleted User`,
          last_name: `#${user.id.substring(0, 8)}`,
          email: `deleted-${user.id}@example.com`,
          phone: null,
          manager_iban: null,
          kyc_status: 'deleted',
          kyc_wallet_did: null,
          kyc_credential_id: null,
          deletion_requested_at: null,
          deletion_scheduled_for: null,
        })
        .eq('id', user.id);

      // Delete auth account
      await supabaseAdmin.auth.admin.deleteUser(user.id);

      console.log(`Account deleted for user ${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account deleted successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    console.error('Error managing account deletion:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
