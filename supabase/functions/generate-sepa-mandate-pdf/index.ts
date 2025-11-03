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

    // Authenticate user with regular client
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

    // Create service role client for privileged operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch rent agreement details with user context (respects RLS)
    const { data: agreement, error: agreementError } = await supabaseClient
      .from("rent_agreements")
      .select("*")
      .eq("id", agreement_id)
      .maybeSingle();

    if (agreementError) {
      console.error("Error fetching agreement:", agreementError);
      throw new Error(`Failed to fetch agreement: ${agreementError.message}`);
    }
    if (!agreement) throw new Error("Agreement not found");

    console.log("Agreement found:", agreement.id);

    // Fetch manager profile with service role (bypasses RLS)
    const { data: managerProfile, error: managerError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, manager_iban, sepa_creditor_identifier, legal_name")
      .eq("id", agreement.manager_id)
      .maybeSingle();

    if (managerError) {
      console.error("Error fetching manager profile:", managerError);
      throw new Error(`Failed to fetch manager profile: ${managerError.message}`);
    }
    if (!managerProfile) throw new Error(`Manager profile not found for ID: ${agreement.manager_id}`);

    console.log("Manager profile found:", managerProfile.id);

    // Fetch tenant profile with service role (bypasses RLS)
    const { data: tenantProfile, error: tenantError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", agreement.tenant_id)
      .maybeSingle();

    if (tenantError) {
      console.error("Error fetching tenant profile:", tenantError);
      throw new Error(`Failed to fetch tenant profile: ${tenantError.message}`);
    }
    if (!tenantProfile) throw new Error(`Tenant profile not found for ID: ${agreement.tenant_id}`);

    console.log("Tenant profile found:", tenantProfile.id);

    // Fetch property details with service role (bypasses RLS)
    const { data: property, error: propertyError } = await supabaseAdmin
      .from("properties")
      .select("id, title, address")
      .eq("id", agreement.property_id)
      .maybeSingle();

    if (propertyError) {
      console.error("Error fetching property:", propertyError);
      throw new Error(`Failed to fetch property: ${propertyError.message}`);
    }
    if (!property) throw new Error(`Property not found for ID: ${agreement.property_id}`);

    console.log("Property found:", property.id);

    // Validate manager has SEPA settings configured
    if (!managerProfile.manager_iban || !managerProfile.sepa_creditor_identifier) {
      throw new Error("Manager SEPA settings not configured");
    }

    // Generate mandate reference
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
    const mandate_reference = `RENT-${agreement.tenancy_id}-${timestamp}`;

    // Prepare mandate data
    const mandateData: SEPAMandateData = {
      creditor_name: managerProfile.legal_name || `${managerProfile.first_name} ${managerProfile.last_name}`,
      creditor_iban: managerProfile.manager_iban,
      creditor_identifier: managerProfile.sepa_creditor_identifier,
      creditor_address: property.address || "N/A",
      debtor_name: `${tenantProfile.first_name} ${tenantProfile.last_name}`,
      debtor_iban: agreement.tenant_iban || "",
      debtor_address: property.address || "N/A",
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

    // Update rent agreement with mandate details using service role
    const { error: updateError } = await supabaseAdmin
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
