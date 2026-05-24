import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemSetting {
  setting_key: string;
  setting_value: { value: number | boolean };
}

interface RentPayment {
  id: string;
  tenant_id: string;
  property_id: string;
  amount_cents: number;
  currency: string;
  payment_due_date: string;
  status: string;
}

interface TenantInfo {
  email: string;
  first_name: string;
  last_name: string;
}

interface PropertyInfo {
  address: string;
  title: string;
  manager_id: string;
}

interface ManagerInfo {
  first_name: string;
  last_name: string;
}

// Email template wrapper with standardized branding
function getEmailWrapper(title: string, headerBgColor: string, content: string, managerName: string): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - RentMate</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Roboto', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${headerBgColor}; padding: 48px 24px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; width: 48px; height: 48px; background-color: #2C4240; border-radius: 50%;">
                      <tr>
                        <td style="text-align: center; vertical-align: middle;">
                          <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; font-family: 'Inter', 'Roboto', Arial, sans-serif;">RE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700; font-family: 'Inter', 'Roboto', Arial, sans-serif;">RentMate</h1>
              <p style="margin: 8px 0 0; color: #FFFFFF; opacity: 0.8; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Professional Property Management</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px; background-color: #ffffff;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #BEF0ED; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #2C4240; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                Best regards,<br>${managerName}
              </p>
              <p style="margin: 8px 0; color: #2C4240; font-size: 12px; opacity: 0.8; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                This is an automated reminder. Please do not reply to this email.
              </p>
              <p style="margin: 8px 0 0 0; color: #2C4240; font-size: 12px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                © ${currentYear} RentMate. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("Starting payment reminder process...");

    // Fetch system settings
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "payment_reminder_days_before",
        "payment_reminder_enabled",
        "overdue_reminder_frequency_days",
      ]);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    const settingsMap = (settings as SystemSetting[]).reduce((acc, s) => {
      acc[s.setting_key] = s.setting_value.value;
      return acc;
    }, {} as Record<string, number | boolean>);

    // Check if reminders are enabled
    if (!settingsMap.payment_reminder_enabled) {
      console.log("Payment reminders are disabled");
      return new Response(
        JSON.stringify({ message: "Payment reminders are disabled" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const daysBefore = settingsMap.payment_reminder_days_before as number || 3;
    const overdueFrequency = settingsMap.overdue_reminder_frequency_days as number || 7;

    console.log(`Reminder settings - Days before: ${daysBefore}, Overdue frequency: ${overdueFrequency}`);

    // Calculate date thresholds
    const today = new Date();
    const upcomingDate = new Date(today);
    upcomingDate.setDate(upcomingDate.getDate() + daysBefore);
    const overdueCheckDate = new Date(today);
    overdueCheckDate.setDate(overdueCheckDate.getDate() - overdueFrequency);

    // Fetch upcoming payments (due in X days) - only for agreements with reminders enabled
    const { data: upcomingPayments, error: upcomingError } = await supabase
      .from("rent_payments")
      .select("*, rent_agreements!inner(auto_reminders_enabled)")
      .eq("status", "pending")
      .gte("payment_due_date", today.toISOString().split("T")[0])
      .lte("payment_due_date", upcomingDate.toISOString().split("T")[0])
      .neq("rent_agreements.auto_reminders_enabled", false);

    if (upcomingError) {
      console.error("Error fetching upcoming payments:", upcomingError);
      throw upcomingError;
    }

    // Fetch overdue payments - only for agreements with reminders enabled
    const { data: overduePayments, error: overdueError } = await supabase
      .from("rent_payments")
      .select("*, rent_agreements!inner(auto_reminders_enabled)")
      .in("status", ["pending", "overdue"])
      .lt("payment_due_date", today.toISOString().split("T")[0])
      .neq("rent_agreements.auto_reminders_enabled", false);

    if (overdueError) {
      console.error("Error fetching overdue payments:", overdueError);
      throw overdueError;
    }

    console.log(`Found ${upcomingPayments?.length || 0} upcoming payments and ${overduePayments?.length || 0} overdue payments`);

    let emailsSent = 0;
    let emailsFailed = 0;

    // Process upcoming payment reminders
    if (upcomingPayments && upcomingPayments.length > 0) {
      for (const payment of upcomingPayments as RentPayment[]) {
        // Check if reminder already sent today
        const { data: existingReminder } = await supabase
          .from("payment_reminders")
          .select("id")
          .eq("rent_payment_id", payment.id)
          .eq("reminder_type", "upcoming")
          .gte("sent_at", today.toISOString().split("T")[0])
          .maybeSingle();

        if (existingReminder) {
          console.log(`Upcoming reminder already sent for payment ${payment.id}`);
          continue;
        }

        const emailResult = await sendUpcomingReminder(supabase, payment);
        if (emailResult.success) {
          emailsSent++;
        } else {
          emailsFailed++;
        }
      }
    }

    // Process overdue payment reminders
    if (overduePayments && overduePayments.length > 0) {
      for (const payment of overduePayments as RentPayment[]) {
        // Check if reminder was sent within frequency period
        const { data: recentReminder } = await supabase
          .from("payment_reminders")
          .select("sent_at")
          .eq("rent_payment_id", payment.id)
          .eq("reminder_type", "overdue")
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentReminder) {
          const lastSent = new Date(recentReminder.sent_at);
          const daysSinceLastReminder = Math.floor(
            (today.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastReminder < overdueFrequency) {
            console.log(`Overdue reminder sent ${daysSinceLastReminder} days ago for payment ${payment.id}, skipping`);
            continue;
          }
        }

        const emailResult = await sendOverdueReminder(supabase, payment);
        if (emailResult.success) {
          emailsSent++;
        } else {
          emailsFailed++;
        }
      }
    }

    console.log(`Payment reminders completed - Sent: ${emailsSent}, Failed: ${emailsFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        emailsFailed,
        upcomingPayments: upcomingPayments?.length || 0,
        overduePayments: overduePayments?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-payment-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

async function sendUpcomingReminder(
  supabase: ReturnType<typeof createClient>,
  payment: RentPayment
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Sending upcoming reminder for payment ${payment.id}`);

    // Fetch tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", payment.tenant_id)
      .single();

    if (tenantError) throw tenantError;
    const tenantInfo = tenant as TenantInfo;

    // Fetch property info
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("address, title, manager_id")
      .eq("id", payment.property_id)
      .single();

    if (propertyError) throw propertyError;
    const propertyInfo = property as PropertyInfo;

    // Fetch manager info
    const { data: manager, error: managerError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", propertyInfo.manager_id)
      .single();

    if (managerError) throw managerError;
    const managerInfo = manager as ManagerInfo;

    const dueDate = new Date(payment.payment_due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const amount = (payment.amount_cents / 100).toFixed(2);
    const currencySymbol = payment.currency === "eur" ? "€" : payment.currency.toUpperCase();

    const subject = `Rent Payment Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''} - ${propertyInfo.address || propertyInfo.title}`;
    const managerName = `${managerInfo.first_name || ''} ${managerInfo.last_name || ''}`.trim() || 'Your Property Manager';

    const content = `
      <!-- Title -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom: 24px;">
            <h2 style="margin: 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Upcoming Rent Payment</h2>
          </td>
        </tr>
      </table>
      
      <!-- Intro Text -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom: 16px;">
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Hello ${tenantInfo.first_name || 'Tenant'},</p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 24px;">
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
              This is a friendly reminder that your rent payment is due in <strong>${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</strong>.
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Payment Details Box -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Property</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${propertyInfo.address || propertyInfo.title}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Amount</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${currencySymbol}${amount}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Due Date</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 12px;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Payment Method</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500; font-family: 'Inter', 'Roboto', Arial, sans-serif;">SEPA Direct Debit</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Additional Info -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom: 16px;">
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
              If you've already made this payment, please upload your proof of payment in your tenant portal.
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
              If you have any questions, please contact your property manager.
            </p>
          </td>
        </tr>
      </table>
    `;

    const html = getEmailWrapper("Upcoming Rent Payment", "#2C4240", content, managerName);

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentMate <noreply@rentmate.me>",
        to: [tenantInfo.email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent:", emailData);

    // Log reminder
    await supabase.from("payment_reminders").insert({
      rent_payment_id: payment.id,
      reminder_type: "upcoming",
      email_to: tenantInfo.email,
      email_subject: subject,
      email_status: "sent",
    });

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error sending upcoming reminder:", error);
    
    // Log failed reminder
    await supabase.from("payment_reminders").insert({
      rent_payment_id: payment.id,
      reminder_type: "upcoming",
      email_to: "unknown",
      email_subject: "Failed to send",
      email_status: "failed",
      error_message: errMsg,
    });

    return { success: false, error: errMsg };
  }
}

async function sendOverdueReminder(
  supabase: ReturnType<typeof createClient>,
  payment: RentPayment
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Sending overdue reminder for payment ${payment.id}`);

    // Fetch tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", payment.tenant_id)
      .single();

    if (tenantError) throw tenantError;
    const tenantInfo = tenant as TenantInfo;

    // Fetch property info
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("address, title, manager_id")
      .eq("id", payment.property_id)
      .single();

    if (propertyError) throw propertyError;
    const propertyInfo = property as PropertyInfo;

    // Fetch manager info
    const { data: manager, error: managerError } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", propertyInfo.manager_id)
      .single();

    if (managerError) throw managerError;
    const managerInfo = manager as ManagerInfo;

    const dueDate = new Date(payment.payment_due_date);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const amount = (payment.amount_cents / 100).toFixed(2);
    const currencySymbol = payment.currency === "eur" ? "€" : payment.currency.toUpperCase();

    const subject = `Overdue Rent Payment - ${propertyInfo.address || propertyInfo.title}`;
    const managerName = `${managerInfo.first_name || ''} ${managerInfo.last_name || ''}`.trim() || 'Your Property Manager';

    const content = `
      <!-- Title -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom: 24px;">
            <h2 style="margin: 0; color: #DC2626; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Overdue Rent Payment Notice</h2>
          </td>
        </tr>
      </table>
      
      <!-- Intro Text -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom: 16px;">
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Hello ${tenantInfo.first_name || 'Tenant'},</p>
          </td>
        </tr>
      </table>
      
      <!-- Warning Box -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding: 16px; background-color: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; color: #991B1B; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
              <strong>Important:</strong> We noticed that your rent payment was due on <strong>${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong> and has not been received yet.
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Payment Details Box -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin: 24px 0;">
        <tr>
          <td style="padding: 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Property</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${propertyInfo.address || propertyInfo.title}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Amount</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${currencySymbol}${amount}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Original Due Date</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 12px;">
                  <span style="color: #6B7280; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Days Overdue</span><br>
                  <span style="color: #DC2626; font-size: 16px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Additional Info -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom: 16px;">
            <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
              Please make the payment as soon as possible to avoid any late fees or further action.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 16px;">
            <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
              If you have already made this payment, please upload your proof of payment in your tenant portal immediately.
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
              If you're experiencing financial difficulties, please contact your property manager to discuss payment arrangements.
            </p>
          </td>
        </tr>
      </table>
    `;

    // Use darker header for overdue emails to convey urgency
    const html = getEmailWrapper("Overdue Rent Payment", "#2C4240", content, managerName);

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentMate <noreply@rentmate.me>",
        to: [tenantInfo.email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent:", emailData);

    // Update payment status to overdue if still pending
    if (payment.status === "pending") {
      await supabase
        .from("rent_payments")
        .update({ status: "overdue" })
        .eq("id", payment.id);
    }

    // Log reminder
    await supabase.from("payment_reminders").insert({
      rent_payment_id: payment.id,
      reminder_type: "overdue",
      email_to: tenantInfo.email,
      email_subject: subject,
      email_status: "sent",
    });

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error sending overdue reminder:", error);
    
    // Log failed reminder
    await supabase.from("payment_reminders").insert({
      rent_payment_id: payment.id,
      reminder_type: "overdue",
      email_to: "unknown",
      email_subject: "Failed to send",
      email_status: "failed",
      error_message: errMsg,
    });

    return { success: false, error: errMsg };
  }
}

serve(handler);
