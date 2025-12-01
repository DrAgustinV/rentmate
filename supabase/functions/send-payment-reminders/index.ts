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

    // Fetch upcoming payments (due in X days)
    const { data: upcomingPayments, error: upcomingError } = await supabase
      .from("rent_payments")
      .select("*")
      .eq("status", "pending")
      .gte("payment_due_date", today.toISOString().split("T")[0])
      .lte("payment_due_date", upcomingDate.toISOString().split("T")[0]);

    if (upcomingError) {
      console.error("Error fetching upcoming payments:", upcomingError);
      throw upcomingError;
    }

    // Fetch overdue payments
    const { data: overduePayments, error: overdueError } = await supabase
      .from("rent_payments")
      .select("*")
      .in("status", ["pending", "overdue"])
      .lt("payment_due_date", today.toISOString().split("T")[0]);

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
  } catch (error: any) {
    console.error("Error in send-payment-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

async function sendUpcomingReminder(
  supabase: any,
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

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { padding: 20px 0; }
            .details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #6c757d; }
            .value { color: #212529; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #007bff;">Upcoming Rent Payment</h1>
            </div>
            
            <div class="content">
              <p>Hello ${tenantInfo.first_name || 'Tenant'},</p>
              
              <p>This is a friendly reminder that your rent payment is due in <strong>${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</strong>.</p>
              
              <div class="details">
                <div class="detail-row">
                  <span class="label">Property:</span>
                  <span class="value">${propertyInfo.address || propertyInfo.title}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount:</span>
                  <span class="value">${currencySymbol}${amount}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Due Date:</span>
                  <span class="value">${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment Method:</span>
                  <span class="value">SEPA Direct Debit</span>
                </div>
              </div>
              
              <p>If you've already made this payment, please upload your proof of payment in your tenant portal.</p>
              
              <p style="margin-top: 30px;">If you have any questions, please contact your property manager.</p>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>${managerInfo.first_name} ${managerInfo.last_name}</p>
              <p style="font-size: 12px; color: #999;">This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

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
  } catch (error: any) {
    console.error("Error sending upcoming reminder:", error);
    
    // Log failed reminder
    await supabase.from("payment_reminders").insert({
      rent_payment_id: payment.id,
      reminder_type: "upcoming",
      email_to: "unknown",
      email_subject: "Failed to send",
      email_status: "failed",
      error_message: error.message,
    });

    return { success: false, error: error.message };
  }
}

async function sendOverdueReminder(
  supabase: any,
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

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: white; }
            .content { padding: 20px 0; }
            .details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #6c757d; }
            .value { color: #212529; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Overdue Rent Payment Notice</h1>
            </div>
            
            <div class="content">
              <p>Hello ${tenantInfo.first_name || 'Tenant'},</p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> We noticed that your rent payment was due on <strong>${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong> and has not been received yet.
              </div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="label">Property:</span>
                  <span class="value">${propertyInfo.address || propertyInfo.title}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount:</span>
                  <span class="value">${currencySymbol}${amount}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Original Due Date:</span>
                  <span class="value">${dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Days Overdue:</span>
                  <span class="value" style="color: #dc3545; font-weight: bold;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <p><strong>Please make the payment as soon as possible to avoid any late fees or further action.</strong></p>
              
              <p>If you have already made this payment, please upload your proof of payment in your tenant portal immediately.</p>
              
              <p>If you're experiencing financial difficulties, please contact your property manager to discuss payment arrangements.</p>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>${managerInfo.first_name} ${managerInfo.last_name}</p>
              <p style="font-size: 12px; color: #999;">This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

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
  } catch (error: any) {
    console.error("Error sending overdue reminder:", error);
    
    // Log failed reminder
    await supabase.from("payment_reminders").insert({
      rent_payment_id: payment.id,
      reminder_type: "overdue",
      email_to: "unknown",
      email_subject: "Failed to send",
      email_status: "failed",
      error_message: error.message,
    });

    return { success: false, error: error.message };
  }
}

serve(handler);
