import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

    // Create admin client to fetch brand settings
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch brand name from brand_settings
    const { data: brandData } = await supabaseAdmin
      .from("brand_settings")
      .select("brand_name")
      .single();

    const brandName = brandData?.brand_name || "RentMate";

    console.log("Sending welcome email for user:", user.id, user.email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${brandName} <noreply@rentmate.me>`,
        to: [user.email],
        subject: `Welcome to ${brandName}`,
        html: getWelcomeEmailTemplate(brandName),
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

function getEmailHeader(brandName: string): string {
  return `<!-- Header -->
          <tr>
            <td style="background-color: #2C4240; padding: 32px 24px; text-align: center;">
              <!-- White pill container with circular RE and brand name inline -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color: #FFFFFF; border-radius: 999px;">
                <tr>
                  <td style="padding: 8px 20px 8px 8px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Circular RE monogram -->
                        <td style="vertical-align: middle;">
                          <table cellpadding="0" cellspacing="0" border="0" style="background-color: #2C4240; border-radius: 50%; width: 40px; height: 40px;">
                            <tr>
                              <td style="text-align: center; vertical-align: middle; width: 40px; height: 40px;">
                                <span style="color: #FFFFFF; font-size: 14px; font-weight: 700; font-family: 'Inter', 'Roboto', Arial, sans-serif;">RE</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Brand name -->
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="color: #2C4240; font-size: 20px; font-weight: 700; font-family: 'Inter', 'Roboto', Arial, sans-serif;">${brandName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function getWelcomeEmailTemplate(brandName: string): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to ${brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Roboto', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; margin: 0 auto;">
          
          ${getEmailHeader(brandName)}
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px; background-color: #ffffff;">
              
              <!-- Title -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <h2 style="margin: 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Welcome to ${brandName}!</h2>
                  </td>
                </tr>
              </table>
              
              <!-- Intro Text -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Hi there,</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      Thanks for creating your account. You're all set to start managing properties, tenants, and payments more efficiently.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Features Title -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      With ${brandName} you can:
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Feature List -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-left: 0; margin: 0 0 24px 0;">
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Centralise contracts and important documents for every property
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Track rent and utility payments with clear status and history
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Handle maintenance tickets with full activity timelines
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Invite tenants securely and collaborate in one shared space
                  </td>
                </tr>
              </table>
              
              <!-- Highlight Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px; background-color: #ECFDF5; border-left: 4px solid #46A19D; border-radius: 4px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #166534; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      <strong>Next step:</strong> Log in to your account and create your first property. It only takes a minute.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Ignore notice -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-top: 24px;">
                    <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      If you did not create this account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #BEF0ED; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #2C4240; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                Best regards,<br>The ${brandName} Team
              </p>
              <p style="margin: 8px 0; color: #2C4240; font-size: 12px; opacity: 0.8; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                This is an automated email. Please do not reply.
              </p>
              <p style="margin: 8px 0 0 0; color: #2C4240; font-size: 12px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                © ${currentYear} ${brandName}. All rights reserved.
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
