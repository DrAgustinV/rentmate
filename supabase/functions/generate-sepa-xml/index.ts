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

  try {
    const { property_id, payment_date } = await req.json();

    if (!property_id || !payment_date) {
      throw new Error("Property ID and payment date are required");
    }

    console.log("Generating SEPA XML for property:", property_id, "payment date:", payment_date);

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

    // Fetch manager profile with SEPA settings
    const { data: managerProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("manager_iban, sepa_creditor_identifier, legal_name, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (!managerProfile.manager_iban || !managerProfile.sepa_creditor_identifier) {
      throw new Error("SEPA settings not configured");
    }

    // Fetch pending payments for the specified date
    const { data: payments, error: paymentsError } = await supabaseClient
      .from("rent_payments")
      .select(
        `
        *,
        rent_agreement:rent_agreements (
          id,
          tenant_iban,
          mandate_id,
          tenant:profiles!rent_agreements_tenant_id_fkey (
            first_name,
            last_name
          )
        )
      `
      )
      .eq("property_id", property_id)
      .eq("payment_due_date", payment_date)
      .eq("status", "pending");

    if (paymentsError) throw paymentsError;
    if (!payments || payments.length === 0) {
      throw new Error("No pending payments found for this date");
    }

    const creditorName = managerProfile.legal_name || `${managerProfile.first_name} ${managerProfile.last_name}`;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount_cents, 0) / 100;
    const msgId = `RENT-${new Date().toISOString().split("T")[0]}`;

    // Generate ISO 20022 pain.008.001.02 XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>RENT-PAYMENT-${Date.now()}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <ReqdColltnDt>${payment_date}</ReqdColltnDt>
      <Cdtr>
        <Nm>${creditorName}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${managerProfile.manager_iban}</IBAN></Id>
      </CdtrAcct>
      <CdtrSchmeId>
        <Id><PrvtId><Othr><Id>${managerProfile.sepa_creditor_identifier}</Id></Othr></PrvtId></Id>
      </CdtrSchmeId>
`;

    // Add each payment transaction
    payments.forEach((payment, index) => {
      const tenantName = `${payment.rent_agreement.tenant.first_name} ${payment.rent_agreement.tenant.last_name}`;
      const amount = (payment.amount_cents / 100).toFixed(2);

      xml += `      <DrctDbtTxInf>
        <PmtId><EndToEndId>RENT-TENANT-${index + 1}</EndToEndId></PmtId>
        <InstdAmt Ccy="${payment.currency.toUpperCase()}">${amount}</InstdAmt>
        <MndtRltdInf>
          <MndtId>${payment.rent_agreement.mandate_id}</MndtId>
          <DtOfSgntr>${new Date().toISOString().split("T")[0]}</DtOfSgntr>
        </MndtRltdInf>
        <Dbtr><Nm>${tenantName}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${payment.rent_agreement.tenant_iban}</IBAN></Id></DbtrAcct>
      </DrctDbtTxInf>
`;
    });

    xml += `    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;

    console.log("SEPA XML generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        xml,
        filename: `sepa-direct-debit-${payment_date}.xml`,
        payments_count: payments.length,
        total_amount: totalAmount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error generating SEPA XML:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
