import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rent_agreement_id } = await req.json();

    if (!rent_agreement_id) {
      return new Response(
        JSON.stringify({ error: "rent_agreement_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Ensuring rent payments for agreement: ${rent_agreement_id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if payments already exist for this agreement
    const { data: existingPayments, error: checkError } = await supabase
      .from("rent_payments")
      .select("id")
      .eq("rent_agreement_id", rent_agreement_id)
      .limit(1);

    if (checkError) {
      console.error("Error checking existing payments:", checkError);
      throw checkError;
    }

    // If payments already exist, return early
    if (existingPayments && existingPayments.length > 0) {
      console.log("Payments already exist for this agreement");
      return new Response(
        JSON.stringify({ success: true, message: "Payments already exist", generated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate payments using the database function
    const { data, error } = await supabase.rpc("generate_rent_payments", {
      p_agreement_id: rent_agreement_id,
      p_months_ahead: 12,
    });

    if (error) {
      console.error("Error generating payments:", error);
      throw error;
    }

    console.log(`Generated ${data} payment records`);

    return new Response(
      JSON.stringify({ success: true, generated: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in ensure-rent-payments:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
