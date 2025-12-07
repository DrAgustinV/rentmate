import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Generate secure random token
function generateToken(length: number = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Create client with user's auth token to get their info
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);

    if (userError || !user || !user.email) {
      console.error("Unable to get authenticated user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if already verified
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email_verified, email_verification_sent_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (profile.email_verified) {
      return new Response(
        JSON.stringify({ error: "Email already verified", already_verified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limit: only allow resend every 60 seconds
    if (profile.email_verification_sent_at) {
      const lastSent = new Date(profile.email_verification_sent_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000;
      
      if (diffSeconds < 60) {
        const waitSeconds = Math.ceil(60 - diffSeconds);
        return new Response(
          JSON.stringify({ 
            error: `Please wait ${waitSeconds} seconds before requesting another email`,
            rate_limited: true,
            wait_seconds: waitSeconds
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Generate token and expiry (24 hours)
    const verificationToken = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Update profile with token
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        email_verification_token: verificationToken,
        email_verification_sent_at: now.toISOString(),
        email_verification_expires_at: expiresAt.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile with token:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to generate verification token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build verification URL
    const baseUrl = req.headers.get("origin") || "https://rentmate.me";
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    console.log("Sending verification email to:", user.email);

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentMate <noreply@rentmate.me>",
        to: [user.email],
        subject: "Verify your email address",
        html: getVerificationEmailTemplate(verificationUrl),
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json().catch(() => null);
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailData = await emailResponse.json();
    console.log("Verification email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-email-verification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function getVerificationEmailTemplate(verificationUrl: string): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Roboto', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #2C4240; padding: 48px 24px; text-align: center;">
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
              
              <!-- Title -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <h2 style="margin: 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Verify Your Email Address</h2>
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
                      Thanks for signing up for RentMate. Please click the button below to verify your email address and get started.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px; text-align: center;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #46A19D; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      <strong>Note:</strong> This verification link expires in 24 hours. If it expires, you can request a new one from the app.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-top: 24px;">
                    <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      If the button above doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin: 8px 0 0; color: #46A19D; font-size: 12px; word-break: break-all; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      ${verificationUrl}
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
                Best regards,<br>The RentMate Team
              </p>
              <p style="margin: 8px 0; color: #2C4240; font-size: 12px; opacity: 0.8; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                This is an automated email. Please do not reply.
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
