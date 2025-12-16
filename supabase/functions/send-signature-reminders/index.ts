import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { createYouSignClient } from '../_shared/yousign-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_AUTO_REMINDERS = 3;
const REMINDER_COOLDOWN_HOURS = 24;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let processedCount = 0;
  let sentCount = 0;
  let errorCount = 0;

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('[send-signature-reminders] Starting automated signature reminder job');

    // Find signatures awaiting tenant signature
    // Conditions:
    // - manager_signed_at IS NOT NULL (manager has signed)
    // - tenant_signed_at IS NULL (tenant hasn't signed)
    // - workflow_status = 'in_progress'
    // - expires_at > NOW() (not expired)
    // - last_reminder_sent_at IS NULL OR last_reminder_sent_at < NOW() - 24 hours
    // - reminder_count < MAX_AUTO_REMINDERS
    const cooldownTime = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

    const { data: pendingSignatures, error: fetchError } = await supabase
      .from('contract_signatures')
      .select('id, qualified_signature_session_id, tenant_signer_id, reminder_count, last_reminder_sent_at, expires_at')
      .not('manager_signed_at', 'is', null)
      .is('tenant_signed_at', null)
      .eq('workflow_status', 'in_progress')
      .gt('expires_at', new Date().toISOString())
      .lt('reminder_count', MAX_AUTO_REMINDERS)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cooldownTime}`);

    if (fetchError) {
      throw new Error(`Failed to fetch pending signatures: ${fetchError.message}`);
    }

    console.log(`[send-signature-reminders] Found ${pendingSignatures?.length || 0} signatures eligible for reminder`);

    if (!pendingSignatures || pendingSignatures.length === 0) {
      // Update cron job health
      await updateCronJobHealth(supabase, startTime, 0, 0, 0, null);
      
      return new Response(
        JSON.stringify({ success: true, processed: 0, sent: 0, errors: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yousignClient = createYouSignClient();

    // Process each pending signature
    for (const signature of pendingSignatures) {
      processedCount++;

      try {
        const { qualified_signature_session_id: signatureRequestId, tenant_signer_id: tenantSignerId } = signature;

        if (!signatureRequestId || !tenantSignerId) {
          console.log(`[send-signature-reminders] Skipping signature ${signature.id} - missing YouSign IDs`);
          continue;
        }

        console.log(`[send-signature-reminders] Sending reminder for signature ${signature.id}`);

        // Send reminder via YouSign API
        await yousignClient.sendReminder(signatureRequestId, tenantSignerId);

        // Update contract_signatures with reminder tracking
        await supabase
          .from('contract_signatures')
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            reminder_count: (signature.reminder_count || 0) + 1,
          })
          .eq('id', signature.id);

        // Log the reminder event
        await supabase.from('qualified_signature_logs').insert({
          contract_signature_id: signature.id,
          session_id: signatureRequestId,
          provider_code: 'yousign',
          event_type: 'auto_reminder_sent',
        });

        sentCount++;
        console.log(`[send-signature-reminders] Reminder sent successfully for signature ${signature.id}`);

      } catch (err) {
        errorCount++;
        console.error(`[send-signature-reminders] Failed to send reminder for signature ${signature.id}:`, err);
      }
    }

    // Update cron job health
    await updateCronJobHealth(supabase, startTime, processedCount, sentCount, errorCount, null);

    console.log(`[send-signature-reminders] Job completed. Processed: ${processedCount}, Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount, 
        sent: sentCount, 
        errors: errorCount 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-signature-reminders] Job failed:', error);

    // Try to update cron job health with error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await updateCronJobHealth(supabase, startTime, processedCount, sentCount, errorCount, errorMessage);
    } catch (e) {
      console.error('[send-signature-reminders] Failed to update cron job health:', e);
    }

    return new Response(
      JSON.stringify({ error: errorMessage || 'Automated reminder job failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateCronJobHealth(
  supabase: any,
  startTime: number,
  processed: number,
  sent: number,
  errors: number,
  errorMessage: string | null
) {
  const jobName = 'send-signature-reminders';
  const processingTime = Date.now() - startTime;

  await supabase.from('cron_job_health').upsert({
    job_name: jobName,
    last_run_at: new Date().toISOString(),
    last_run_status: errorMessage ? 'error' : 'success',
    last_error: errorMessage,
    run_count: 1,
    consecutive_failures: errorMessage ? 1 : 0,
    metadata: {
      processed_count: processed,
      sent_count: sent,
      error_count: errors,
      processing_time_ms: processingTime,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'job_name' });
}
