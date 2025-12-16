import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createYouSignClient } from '../_shared/yousign-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { tenancyId } = await req.json();
    if (!tenancyId) {
      return new Response(
        JSON.stringify({ error: 'tenancyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-yousign-reminder] User ${user.id} requesting reminder for tenancy ${tenancyId}`);

    // Get contract signature
    const { data: signature, error: sigError } = await supabase
      .from('contract_signatures')
      .select('*, property_id')
      .eq('tenancy_id', tenancyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sigError || !signature) {
      console.error('[send-yousign-reminder] Signature not found:', sigError);
      return new Response(
        JSON.stringify({ error: 'Contract signature not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is the property manager
    const { data: property } = await supabase
      .from('properties')
      .select('manager_id')
      .eq('id', signature.property_id)
      .single();

    if (!property || property.manager_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Only property manager can send reminders' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check conditions: manager signed, tenant not signed, not completed
    if (!signature.manager_signed_at) {
      return new Response(
        JSON.stringify({ error: 'Manager must sign first before sending reminder to tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signature.tenant_signed_at) {
      return new Response(
        JSON.stringify({ error: 'Tenant has already signed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (signature.workflow_status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Signature process is already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cooldown (1 hour minimum between manual reminders)
    if (signature.last_reminder_sent_at) {
      const lastSent = new Date(signature.last_reminder_sent_at);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastSent > hourAgo) {
        const nextAvailable = new Date(lastSent.getTime() + 60 * 60 * 1000);
        return new Response(
          JSON.stringify({ 
            error: 'Please wait before sending another reminder',
            nextAvailableAt: nextAvailable.toISOString()
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get YouSign signature request ID
    const signatureRequestId = signature.qualified_signature_session_id;
    const tenantSignerId = signature.tenant_signer_id;

    if (!signatureRequestId || !tenantSignerId) {
      console.error('[send-yousign-reminder] Missing YouSign IDs:', { signatureRequestId, tenantSignerId });
      return new Response(
        JSON.stringify({ error: 'YouSign signature request or tenant signer ID not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send reminder via YouSign API
    console.log(`[send-yousign-reminder] Sending reminder via YouSign: request=${signatureRequestId}, signer=${tenantSignerId}`);
    const yousignClient = createYouSignClient();
    await yousignClient.sendReminder(signatureRequestId, tenantSignerId);

    // Update contract_signatures with reminder tracking
    const { error: updateError } = await supabase
      .from('contract_signatures')
      .update({
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: (signature.reminder_count || 0) + 1,
      })
      .eq('id', signature.id);

    if (updateError) {
      console.error('[send-yousign-reminder] Failed to update reminder tracking:', updateError);
      // Don't fail the request - reminder was sent successfully
    }

    // Log the reminder event
    await supabase.from('qualified_signature_logs').insert({
      contract_signature_id: signature.id,
      session_id: signatureRequestId,
      provider_code: 'yousign',
      event_type: 'reminder_sent',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    console.log(`[send-yousign-reminder] Reminder sent successfully for signature ${signature.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reminder sent to tenant',
        reminderCount: (signature.reminder_count || 0) + 1,
        sentAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-yousign-reminder] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage || 'Failed to send reminder' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
