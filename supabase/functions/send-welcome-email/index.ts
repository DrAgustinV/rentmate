import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      console.error("Unable to get authenticated user for welcome email", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }

    console.log("Sending welcome email for user:", user.id, user.email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentMate <noreply@rentmate.me>",
        to: [user.email],
        subject: "Welcome to RentMate",
        html: getWelcomeEmailTemplate(),
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json().catch(() => null);
      console.error("Resend API error (welcome email):", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send welcome email" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }

    const emailData = await emailResponse.json();
    console.log("Welcome email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
});

function getWelcomeEmailTemplate(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to RentMate</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background-color: #f3f4f6; }
          .container { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
          .card { background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(15,23,42,0.1), 0 10px 10px -5px rgba(15,23,42,0.04); }
          .header { background: radial-gradient(circle at 10% 20%, #0f766e 0, #14b8a6 35%, #22c55e 70%, #e5e7eb 100%); padding: 32px 24px; text-align: left; color: #ecfeff; }
          .logo-pill { display: inline-flex; align-items: center; justify-content: center; padding: 10px 14px; border-radius: 999px; background-color: rgba(15,23,42,0.15); margin-bottom: 16px; font-weight: 700; letter-spacing: 0.12em; font-size: 11px; text-transform: uppercase; }
          .logo-pill span { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 999px; background-color: #ecfeff; color: #0f766e; font-weight: 800; margin-right: 8px; font-size: 14px; }
          .title { font-size: 26px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.03em; }
          .subtitle { margin: 0; font-size: 14px; opacity: 0.9; max-width: 360px; }
          .content { padding: 24px 24px 28px 24px; }
          .section-title { font-size: 15px; font-weight: 600; margin: 0 0 12px 0; color: #0f172a; }
          .list { margin: 0 0 16px 0; padding-left: 18px; color: #4b5563; font-size: 14px; }
          .list li { margin-bottom: 4px; }
          .highlight { margin: 16px 0; padding: 12px 14px; border-radius: 10px; background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; font-size: 13px; }
          .footer { border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 14px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo-pill">
                <span>RE</span>
                RENTMATE
              </div>
              <h1 class="title">Welcome to RentMate</h1>
              <p class="subtitle">
                Your workspace for modern property management—contracts, payments, and maintenance in one secure place.
              </p>
            </div>
            <div class="content">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #111827;">
                Hi there,
              </p>
              <p style="margin: 0 0 14px 0; font-size: 14px; color: #374151;">
                Thanks for creating your account. You're all set to start managing properties, tenants, and payments more efficiently.
              </p>

              <p class="section-title">With RentMate you can:</p>
              <ul class="list">
                <li>Centralise contracts and important documents for every property</li>
                <li>Track rent and utility payments with clear status and history</li>
                <li>Handle maintenance tickets with full activity timelines</li>
                <li>Invite tenants securely and collaborate in one shared space</li>
              </ul>

              <div class="highlight">
                <strong>Next step:</strong> log in to your account and create your first property. It only takes a minute.
              </div>

              <p style="margin: 0 0 6px 0; font-size: 13px; color: #4b5563;">
                If you did not create this account, you can safely ignore this email.
              </p>

              <div class="footer">
                <p style="margin: 0 0 4px 0;">Best regards,<br />The RentMate Team</p>
                <p style="margin: 0; color: #9ca3af;">This is an automated message, please do not reply.</p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
