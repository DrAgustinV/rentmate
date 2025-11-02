import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SEPAMandateData {
  creditor_name: string;
  creditor_iban: string;
  creditor_identifier: string;
  creditor_address: string;
  debtor_name: string;
  debtor_iban: string;
  debtor_address: string;
  mandate_reference: string;
  mandate_type: string;
  sequence_type: string;
  rent_amount_cents: number;
  currency: string;
  payment_day: number;
  start_date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agreement_id } = await req.json();

    if (!agreement_id) {
      throw new Error("Agreement ID is required");
    }

    console.log("Generating SEPA mandate PDF for agreement:", agreement_id);

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch rent agreement details
    const { data: agreement, error: agreementError } = await supabaseClient
      .from("rent_agreements")
      .select(
        `
        *,
        property:properties (
          id,
          title,
          address,
          manager_id
        ),
        tenant:profiles!rent_agreements_tenant_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        manager:profiles!rent_agreements_manager_id_fkey (
          id,
          first_name,
          last_name,
          email,
          manager_iban,
          sepa_creditor_identifier,
          legal_name
        )
      `
      )
      .eq("id", agreement_id)
      .single();

    if (agreementError) throw agreementError;
    if (!agreement) throw new Error("Agreement not found");

    // Validate manager has SEPA settings configured
    if (!agreement.manager.manager_iban || !agreement.manager.sepa_creditor_identifier) {
      throw new Error("Manager SEPA settings not configured");
    }

    // Generate mandate reference
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
    const mandate_reference = `RENT-${agreement.tenancy_id}-${timestamp}`;

    // Prepare mandate data
    const mandateData: SEPAMandateData = {
      creditor_name: agreement.manager.legal_name || `${agreement.manager.first_name} ${agreement.manager.last_name}`,
      creditor_iban: agreement.manager.manager_iban,
      creditor_identifier: agreement.manager.sepa_creditor_identifier,
      creditor_address: agreement.property.address || "N/A",
      debtor_name: `${agreement.tenant.first_name} ${agreement.tenant.last_name}`,
      debtor_iban: agreement.tenant_iban || "",
      debtor_address: agreement.property.address || "N/A",
      mandate_reference,
      mandate_type: "RCUR", // Recurrent
      sequence_type: "FRST", // First payment
      rent_amount_cents: agreement.rent_amount_cents,
      currency: agreement.currency,
      payment_day: agreement.payment_day,
      start_date: agreement.start_date,
    };

    console.log("Mandate data prepared:", mandateData);

    // **MOCK**: In production, generate actual PDF using a library like jsPDF or pdfkit
    // For now, return a mock PDF URL
    const mockPdfUrl = `https://mock-pdf-storage.com/mandate-${mandate_reference}.pdf`;

    // Update rent agreement with mandate details
    const { error: updateError } = await supabaseClient
      .from("rent_agreements")
      .update({
        mandate_id: mandate_reference,
        mandate_status: "pending_signature",
        mandate_pdf_url: mockPdfUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agreement_id);

    if (updateError) throw updateError;

    console.log("MOCK: Mandate PDF generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        mandate_reference,
        pdf_url: mockPdfUrl,
        mandate_data: mandateData,
        message: "MOCK: PDF generation will be implemented with real PDF library in Phase 2",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error generating SEPA mandate PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
