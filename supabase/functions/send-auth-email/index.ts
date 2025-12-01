import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

    const { user, email_data } = payload;
    const actionType = email_data.email_action_type;
    
    // Construct confirmation URL
    const confirmationUrl = `${email_data.redirect_to}?token_hash=${email_data.token_hash}&type=${actionType}`;

    let subject = "";
    let html = "";

    switch (actionType) {
      case "signup":
        subject = "Confirm your RentMate account";
        html = getSignupEmailTemplate(user.email, confirmationUrl);
        break;
      
      case "recovery":
        subject = "Reset your RentMate password";
        html = getRecoveryEmailTemplate(user.email, confirmationUrl);
        break;
      
      case "magiclink":
        subject = "Your RentMate magic link";
        html = getMagicLinkEmailTemplate(user.email, confirmationUrl);
        break;
      
      default:
        subject = "RentMate notification";
        html = getDefaultEmailTemplate(user.email, confirmationUrl, actionType);
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

function getSignupEmailTemplate(email: string, confirmationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 28px; }
          .content { background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to RentMate! 🏠</h1>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            
            <p>Thank you for signing up for RentMate! We're excited to have you on board.</p>
            
            <p>To get started, please confirm your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #667eea; word-break: break-all;">${confirmationUrl}</a>
            </p>
            
            <p style="margin-top: 30px;">Once confirmed, you'll be able to:</p>
            <ul>
              <li>Manage your properties</li>
              <li>Track rent payments</li>
              <li>Handle maintenance tickets</li>
              <li>Store important documents</li>
            </ul>
            
            <div class="footer">
              <p>Best regards,<br>The RentMate Team</p>
              <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getRecoveryEmailTemplate(email: string, resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 28px; }
          .content { background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password 🔐</h1>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            
            <p>We received a request to reset your RentMate password.</p>
            
            <p>Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour.
            </div>
            
            <p style="margin-top: 20px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
            
            <div class="footer">
              <p>Best regards,<br>The RentMate Team</p>
              <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getMagicLinkEmailTemplate(email: string, magicUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 28px; }
          .content { background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Magic Link ✨</h1>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            
            <p>Click the button below to instantly sign in to your RentMate account:</p>
            
            <div style="text-align: center;">
              <a href="${magicUrl}" class="button">Sign In to RentMate</a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${magicUrl}" style="color: #667eea; word-break: break-all;">${magicUrl}</a>
            </p>
            
            <p style="margin-top: 20px;">This link will expire in 1 hour for security reasons.</p>
            
            <div class="footer">
              <p>Best regards,<br>The RentMate Team</p>
              <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getDefaultEmailTemplate(email: string, actionUrl: string, actionType: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; color: white; font-size: 28px; }
          .content { background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Action Required</h1>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            
            <p>Please click the button below to continue:</p>
            
            <div style="text-align: center;">
              <a href="${actionUrl}" class="button">Continue</a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${actionUrl}" style="color: #667eea; word-break: break-all;">${actionUrl}</a>
            </p>
            
            <div class="footer">
              <p>Best regards,<br>The RentMate Team</p>
              <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(handler);
