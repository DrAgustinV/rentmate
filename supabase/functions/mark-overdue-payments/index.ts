import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting overdue payment detection...');

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

    const today = new Date().toISOString().split('T')[0];
    console.log('Checking for overdue payments before:', today);

    // Find all payments that are pending or proof_uploaded and past due date
    const { data: overduePayments, error: fetchError } = await supabaseClient
      .from('rent_payments')
      .select('id, payment_due_date, status, property_id, tenant_id')
      .in('status', ['pending', 'proof_uploaded'])
      .lt('payment_due_date', today);

    if (fetchError) {
      console.error('Error fetching overdue payments:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${overduePayments?.length || 0} overdue payments`);

    if (!overduePayments || overduePayments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No overdue payments found',
          updated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update all overdue payments
    const paymentIds = overduePayments.map(p => p.id);
    
    const { data: updatedPayments, error: updateError } = await supabaseClient
      .from('rent_payments')
      .update({ 
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .in('id', paymentIds)
      .select();

    if (updateError) {
      console.error('Error updating overdue payments:', updateError);
      throw updateError;
    }

    console.log(`Successfully marked ${updatedPayments?.length || 0} payments as overdue`);

    // Log the activity
    for (const payment of overduePayments) {
      console.log(`Payment ${payment.id} marked as overdue (due: ${payment.payment_due_date})`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Marked ${updatedPayments?.length || 0} payments as overdue`,
        updated: updatedPayments?.length || 0,
        paymentIds: paymentIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in mark-overdue-payments function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
