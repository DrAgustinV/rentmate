import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const today = new Date().toISOString().split('T')[0];
    console.log(`Running recurring tickets check for date: ${today}`);

    // Find all active schedules due today
    const { data: dueSchedules, error: scheduleError } = await supabase
      .from('recurring_schedules')
      .select(`
        *,
        ticket_templates (*)
      `)
      .eq('is_active', true)
      .lte('next_run_date', today);

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      throw scheduleError;
    }

    console.log(`Found ${dueSchedules?.length || 0} due schedules`);

    let createdCount = 0;

    for (const schedule of dueSchedules || []) {
      const template = schedule.ticket_templates;
      
      if (!template) {
        console.warn(`Template not found for schedule ${schedule.id}`);
        continue;
      }

      // Create ticket from template
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          property_id: template.property_id,
          title: template.title,
          description: template.description,
          type: template.type,
          priority: template.priority,
          status: 'open',
          created_by: template.created_by,
        });

      if (ticketError) {
        console.error(`Error creating ticket for schedule ${schedule.id}:`, ticketError);
        continue;
      }

      createdCount++;
      console.log(`Created ticket from template: ${template.title}`);

      // Calculate next run date
      const nextRunDate = calculateNextRunDate(
        schedule.next_run_date,
        schedule.frequency
      );

      // Check if schedule should be deactivated
      const shouldDeactivate = schedule.end_date && nextRunDate > schedule.end_date;

      // Update schedule
      const { error: updateError } = await supabase
        .from('recurring_schedules')
        .update({
          next_run_date: nextRunDate,
          is_active: !shouldDeactivate,
        })
        .eq('id', schedule.id);

      if (updateError) {
        console.error(`Error updating schedule ${schedule.id}:`, updateError);
      } else {
        console.log(`Updated schedule next run to: ${nextRunDate}`);
      }
    }

    const result = {
      success: true,
      date: today,
      schedulesProcessed: dueSchedules?.length || 0,
      ticketsCreated: createdCount,
    };

    console.log('Recurring tickets job completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-recurring-tickets function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateNextRunDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split('T')[0];
}
