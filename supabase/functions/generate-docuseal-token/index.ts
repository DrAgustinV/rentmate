import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as jwt from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { signatureId, role } = await req.json();
    console.log('Generating DocuSeal token for signature:', signatureId, 'role:', role);

    if (!signatureId || !role) {
      throw new Error('Missing signatureId or role');
    }

    // Fetch signature record
    const { data: signature, error: sigError } = await supabaseClient
      .from('contract_signatures')
      .select(`
        *,
        property_tenants!inner(property_id, tenant_id),
        properties!inner(manager_id)
      `)
      .eq('id', signatureId)
      .single();

    if (sigError || !signature) {
      console.error('Error fetching signature:', sigError);
      throw new Error('Signature not found');
    }

    // Verify user authorization
    const isManager = signature.properties.manager_id === user.id;
    const isTenant = signature.property_tenants.tenant_id === user.id;

    if (!isManager && !isTenant) {
      throw new Error('Not authorized for this signature');
    }

    // Verify role matches user
    if ((role === 'manager' && !isManager) || (role === 'tenant' && !isTenant)) {
      throw new Error('Role mismatch');
    }

    if (!signature.docuseal_submission_id) {
      throw new Error('DocuSeal submission not initiated');
    }

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (!profile?.email) {
      throw new Error('User email not found');
    }

    // Generate JWT token for DocuSeal
    const secret = Deno.env.get('DOCUSEAL_API_KEY');
    if (!secret) {
      throw new Error('DOCUSEAL_API_KEY not configured');
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const token = await jwt.create(
      { alg: "HS256", typ: "JWT" },
      {
        email: profile.email,
        submission_id: signature.docuseal_submission_id,
        role: role,
        exp: jwt.getNumericDate(60 * 60), // 1 hour expiration
      },
      key
    );

    console.log('Token generated successfully for:', profile.email);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        submission_id: signature.docuseal_submission_id,
        submission_slug: signature.docuseal_submission_slug,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-docuseal-token:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
