import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface AuthEmailPayload {
  user: {
    email: string;
    id: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const payload: AuthEmailPayload = await req.json();
    
    console.log("Auth email hook triggered:", payload.email_data.email_action_type);

    // Create Supabase admin client to fetch brand settings
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
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

    const { user, email_data } = payload;
    const actionType = email_data.email_action_type;
    
    // Construct confirmation URL
    const confirmationUrl = `${email_data.redirect_to}?token_hash=${email_data.token_hash}&type=${actionType}`;

    let subject = "";
    let html = "";

    switch (actionType) {
      case "signup":
        subject = `Confirm your ${brandName} account`;
        html = getSignupEmailTemplate(confirmationUrl, brandName);
        break;
      
      case "recovery":
        subject = `Reset your ${brandName} password`;
        html = getRecoveryEmailTemplate(confirmationUrl, brandName);
        break;
      
      case "magiclink":
        subject = `Your ${brandName} magic link`;
        html = getMagicLinkEmailTemplate(confirmationUrl, brandName);
        break;
      
      default:
        subject = `${brandName} notification`;
        html = getDefaultEmailTemplate(confirmationUrl, actionType, brandName);
    }

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${brandName} <noreply@rentmate.me>`,
        to: [user.email],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log("Auth email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

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

function getEmailFooter(brandName: string): string {
  const currentYear = new Date().getFullYear();
  return `<!-- Footer -->
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
          </tr>`;
}

function getEmailWrapper(title: string, content: string, brandName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - ${brandName}</title>
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
              ${content}
            </td>
          </tr>
          
          ${getEmailFooter(brandName)}
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getSignupEmailTemplate(confirmationUrl: string, brandName: string): string {
  const content = `
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
            Thank you for signing up for ${brandName}! We're excited to have you on board. Please confirm your email address by clicking the button below:
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Button -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="background-color: #46A19D; border-radius: 6px;">
                <a href="${confirmationUrl}" style="display: inline-block; background-color: #46A19D; color: #ffffff; font-family: 'Inter', 'Roboto', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                  Confirm Email Address
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Link fallback -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${confirmationUrl}" style="color: #46A19D; word-break: break-all;">${confirmationUrl}</a>
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Features -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 16px;">
          <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            Once confirmed, you'll be able to:
          </p>
        </td>
      </tr>
    </table>
    
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-left: 0; margin: 0 0 16px 0;">
      <tr>
        <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
        <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
          Manage your properties
        </td>
      </tr>
      <tr>
        <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
        <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
          Track rent payments
        </td>
      </tr>
      <tr>
        <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
        <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
          Handle maintenance tickets
        </td>
      </tr>
      <tr>
        <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
        <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
          Store important documents
        </td>
      </tr>
    </table>
  `;
  
  return getEmailWrapper("Welcome", content, brandName);
}

function getRecoveryEmailTemplate(resetUrl: string, brandName: string): string {
  const content = `
    <!-- Title -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <h2 style="margin: 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Reset Your Password</h2>
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
            We received a request to reset your ${brandName} password. Click the button below to create a new password:
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Button -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="background-color: #46A19D; border-radius: 6px;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #46A19D; color: #ffffff; font-family: 'Inter', 'Roboto', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                  Reset Password
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Link fallback -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #46A19D; word-break: break-all;">${resetUrl}</a>
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Warning -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding: 16px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; color: #92400E; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            <strong>Security Notice:</strong> This link will expire in 1 hour.
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Ignore notice -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-top: 24px;">
          <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
        </td>
      </tr>
    </table>
  `;
  
  return getEmailWrapper("Reset Password", content, brandName);
}

function getMagicLinkEmailTemplate(magicUrl: string, brandName: string): string {
  const content = `
    <!-- Title -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <h2 style="margin: 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Your Magic Link</h2>
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
            Click the button below to instantly sign in to your ${brandName} account:
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Button -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="background-color: #46A19D; border-radius: 6px;">
                <a href="${magicUrl}" style="display: inline-block; background-color: #46A19D; color: #ffffff; font-family: 'Inter', 'Roboto', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                  Sign In to ${brandName}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Link fallback -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${magicUrl}" style="color: #46A19D; word-break: break-all;">${magicUrl}</a>
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Expiry notice -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td>
          <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            This link will expire in 1 hour for security reasons.
          </p>
        </td>
      </tr>
    </table>
  `;
  
  return getEmailWrapper("Magic Link", content, brandName);
}

function getDefaultEmailTemplate(actionUrl: string, actionType: string, brandName: string): string {
  const content = `
    <!-- Title -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <h2 style="margin: 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Action Required</h2>
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
            Please click the button below to continue:
          </p>
        </td>
      </tr>
    </table>
    
    <!-- Button -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="background-color: #46A19D; border-radius: 6px;">
                <a href="${actionUrl}" style="display: inline-block; background-color: #46A19D; color: #ffffff; font-family: 'Inter', 'Roboto', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                  Continue
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Link fallback -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td>
          <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${actionUrl}" style="color: #46A19D; word-break: break-all;">${actionUrl}</a>
          </p>
        </td>
      </tr>
    </table>
  `;
  
  return getEmailWrapper("Action Required", content, brandName);
}

serve(handler);
