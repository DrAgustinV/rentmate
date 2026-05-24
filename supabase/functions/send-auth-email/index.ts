import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SEND_EMAIL_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

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
    if (!SEND_EMAIL_HOOK_SECRET) {
      console.error("SEND_EMAIL_HOOK_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Hook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const wh = new Webhook(SEND_EMAIL_HOOK_SECRET.replace(/^v1,whsec_/, ""));
    const body = await req.text();
    const headers = Object.fromEntries(req.headers.entries());
    const { user, email_data } = wh.verify(body, headers) as AuthEmailPayload;

    console.log("Auth email hook triggered:", email_data.email_action_type);

    const actionType = email_data.email_action_type;
    
    // Construct confirmation URL
    const confirmationUrl = `${email_data.redirect_to}?token_hash=${email_data.token_hash}&type=${actionType}`;

    let subject = "";
    let html = "";

    switch (actionType) {
      case "signup":
        subject = "Confirm your RentMate account";
        html = getSignupEmailTemplate(confirmationUrl);
        break;
      
      case "recovery":
        subject = "Reset your RentMate password";
        html = getRecoveryEmailTemplate(confirmationUrl);
        break;
      
      case "magiclink":
        subject = "Your RentMate magic link";
        html = getMagicLinkEmailTemplate(confirmationUrl);
        break;
      
      default:
        subject = "RentMate notification";
        html = getDefaultEmailTemplate(confirmationUrl, actionType);
    }

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentMate <noreply@rentmate.me>",
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
  } catch (error: unknown) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

function getEmailWrapper(title: string, content: string): string {
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
              ${content}
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

function getSignupEmailTemplate(confirmationUrl: string): string {
  const content = `
    <!-- Title -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <h2 style="margin: 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Welcome to RentMate!</h2>
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
            Thank you for signing up for RentMate! We're excited to have you on board. Please confirm your email address by clicking the button below:
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
  
  return getEmailWrapper("Welcome", content);
}

function getRecoveryEmailTemplate(resetUrl: string): string {
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
            We received a request to reset your RentMate password. Click the button below to create a new password:
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
  
  return getEmailWrapper("Reset Password", content);
}

function getMagicLinkEmailTemplate(magicUrl: string): string {
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
            Click the button below to instantly sign in to your RentMate account:
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
                  Sign In to RentMate
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
  
  return getEmailWrapper("Magic Link", content);
}

function getDefaultEmailTemplate(actionUrl: string, actionType: string): string {
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
  
  return getEmailWrapper("Notification", content);
}

serve(handler);
