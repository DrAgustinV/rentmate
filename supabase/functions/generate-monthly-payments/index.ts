import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authorization check - only allow cron jobs with service role key
  const authHeader = req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
    console.error("[generate-monthly-payments] Unauthorized request - missing or invalid authorization");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[generate-monthly-payments] Starting job...");

    // 1. Get all active rent agreements
    const { data: agreements, error: agreementsError } = await supabaseAdmin
      .from("rent_agreements")
      .select("*")
      .eq("is_active", true)
      .not("tenant_iban", "is", null);

    if (agreementsError) {
      console.error("[generate-monthly-payments] Error fetching agreements:", agreementsError);
      throw agreementsError;
    }

    let paymentsCreated = 0;
    let overdueDetected = 0;

    // 2. For each agreement, ensure next 3 months of payments exist
    for (const agreement of agreements || []) {
      const { data: paymentsGenerated, error: rpcError } = await supabaseAdmin.rpc(
        "generate_rent_payments",
        { p_agreement_id: agreement.id, p_months_ahead: 3 }
      );
      
      if (rpcError) {
        console.error(`[generate-monthly-payments] Error generating payments for agreement ${agreement.id}:`, rpcError);
      } else {
        paymentsCreated += paymentsGenerated || 0;
      }
    }

    // 3. Detect overdue payments (status=pending, due_date < today)
    const today = new Date().toISOString().split("T")[0];
    const { data: overduePayments, error: overdueError } = await supabaseAdmin
      .from("rent_payments")
      .select("id")
      .eq("status", "pending")
      .lt("payment_due_date", today);

    if (!overdueError && overduePayments && overduePayments.length > 0) {
      // Update status to overdue
      const { error: updateError } = await supabaseAdmin
        .from("rent_payments")
        .update({ status: "overdue" })
        .in("id", overduePayments.map((p) => p.id));
      
      if (updateError) {
        console.error("[generate-monthly-payments] Error updating overdue payments:", updateError);
      } else {
        overdueDetected = overduePayments.length;
      }
    }

    console.log(`[generate-monthly-payments] Completed: Created ${paymentsCreated} payments, detected ${overdueDetected} overdue`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentsCreated,
        overdueDetected,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[generate-monthly-payments] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
