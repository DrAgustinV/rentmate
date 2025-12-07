import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string | null;
  managerName: string;
  token: string;
  expiresAt: string;
  language: string;
  projectId: string;
}

// Email header with circular inline logo - dynamic brand name
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

// Generate email template for English
function getEnglishTemplate(brandName: string): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Tenant Invitation - ${brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Roboto', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; margin: 0 auto;">
          
          ${getEmailHeader(brandName)}
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Greeting -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: #46A19D; font-size: 20px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">Hi! {{managerName}} has invited you to join as a tenant.</p>
                  </td>
                </tr>
              </table>
              
              <!-- Property Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 8px 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">{{propertyTitle}}</h2>
                  </td>
                </tr>
              </table>
              
              <!-- Intro Text -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      You've been invited to become a tenant at <strong>{{propertyTitle}}</strong>. We're excited to have you join our community!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      With ${brandName}, you can:
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Feature List -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-left: 0; margin: 16px 0;">
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Pay rent online with ease and track payment history
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Submit and track maintenance requests
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Communicate directly with property management
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Access important documents and lease information
                  </td>
                </tr>
              </table>
              
              <!-- Expiration Warning -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      <strong>Please respond by {{expirationDate}}</strong> - This invitation will expire after this date.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Post-list Text -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-top: 8px; padding-bottom: 32px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      Click the button below to accept your invitation and complete your tenant profile.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background-color: #46A19D; border-radius: 6px;">
                          <a href="{{invitationLink}}" style="display: inline-block; background-color: #46A19D; color: #ffffff; font-family: 'Inter', 'Roboto', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid #e5e7eb; padding: 24px 0 8px 0;">
                    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      Questions? Feel free to reply to this email or contact your property manager.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #BEF0ED; padding: 24px 32px; text-align: center;">
              <p style="margin: 8px 0; color: #2C4240; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                © ${currentYear} ${brandName}. All rights reserved.
              </p>
              <p style="margin: 12px 0 8px 0; font-size: 12px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                <a href="#" style="color: #2C4240; opacity: 0.8; text-decoration: underline;">Unsubscribe</a>
                <span style="color: #2C4240; opacity: 0.8;"> · </span>
                <a href="#" style="color: #2C4240; opacity: 0.8; text-decoration: underline;">Privacy Policy</a>
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

// Generate email template for Spanish
function getSpanishTemplate(brandName: string): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invitación de Inquilino - ${brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Roboto', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; margin: 0 auto;">
          
          ${getEmailHeader(brandName)}
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Greeting -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0; color: #46A19D; font-size: 20px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">¡Hola! {{managerName}} te ha invitado a unirte como inquilino.</p>
                  </td>
                </tr>
              </table>
              
              <!-- Property Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 8px 0; color: #46A19D; font-size: 22px; font-weight: 600; font-family: 'Inter', 'Roboto', Arial, sans-serif;">{{propertyTitle}}</h2>
                  </td>
                </tr>
              </table>
              
              <!-- Intro Text -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      Has sido invitado a convertirte en inquilino de <strong>{{propertyTitle}}</strong>. ¡Estamos emocionados de tenerte en nuestra comunidad!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      Con ${brandName}, puedes:
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Feature List -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-left: 0; margin: 16px 0;">
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Pagar el alquiler en línea fácilmente y hacer seguimiento del historial de pagos
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Enviar y hacer seguimiento de solicitudes de mantenimiento
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Comunicarte directamente con la administración de la propiedad
                  </td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="color: #46A19D; font-size: 16px; font-weight: bold; padding-right: 8px; font-family: Arial, sans-serif;">•</td>
                  <td style="color: #374151; font-size: 16px; line-height: 1.6; padding-bottom: 8px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                    Acceder a documentos importantes e información del contrato
                  </td>
                </tr>
              </table>
              
              <!-- Expiration Warning -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 16px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      <strong>Por favor responde antes del {{expirationDate}}</strong> - Esta invitación caducará después de esta fecha.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Post-list Text -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-top: 8px; padding-bottom: 32px;">
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      Haz clic en el botón a continuación para aceptar tu invitación y completar tu perfil de inquilino.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background-color: #46A19D; border-radius: 6px;">
                          <a href="{{invitationLink}}" style="display: inline-block; background-color: #46A19D; color: #ffffff; font-family: 'Inter', 'Roboto', Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                            Aceptar Invitación
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid #e5e7eb; padding: 24px 0 8px 0;">
                    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                      ¿Preguntas? No dudes en responder a este correo o contactar a tu administrador de propiedades.
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #BEF0ED; padding: 24px 32px; text-align: center;">
              <p style="margin: 8px 0; color: #2C4240; font-size: 14px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                © ${currentYear} ${brandName}. Todos los derechos reservados.
              </p>
              <p style="margin: 12px 0 8px 0; font-size: 12px; font-family: 'Inter', 'Roboto', Arial, sans-serif;">
                <a href="#" style="color: #2C4240; opacity: 0.8; text-decoration: underline;">Darse de baja</a>
                <span style="color: #2C4240; opacity: 0.8;"> · </span>
                <a href="#" style="color: #2C4240; opacity: 0.8; text-decoration: underline;">Política de Privacidad</a>
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

// Helper function to escape HTML to prevent XSS injection
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper function to substitute variables in template with HTML escaping
function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    // Escape HTML for security, except for URL fields which need to remain valid links
    const sanitizedValue = key === 'invitationLink' ? (value || '') : escapeHtml(value || '');
    result = result.replace(regex, sanitizedValue);
  }
  
  return result;
}

const getEmailContent = async (data: InvitationEmailRequest) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Fetch brand settings including custom domain and brand name
  const { data: brandSettings } = await supabase
    .from('brand_settings')
    .select('custom_domain, brand_name')
    .single();

  const customDomain = brandSettings?.custom_domain;
  const brandName = brandSettings?.brand_name || "RentMate";

  // Use custom domain if set, otherwise fallback to lovableproject domain
  const appUrl = customDomain 
    ? `https://${customDomain}` 
    : `https://${data.projectId}.lovableproject.com`;
  
  const invitationLink = `${appUrl}/invitations?token=${data.token}`;

  console.log("Invitation email data:", {
    email: data.email,
    token: data.token,
    projectId: data.projectId,
    customDomain,
    brandName,
    invitationLink,
  });

  // Format expiration date
  const expirationDate = new Date(data.expiresAt).toLocaleDateString(
    data.language === "es" ? "es-ES" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Prepare variables for substitution
  const variables = {
    managerName: data.managerName,
    propertyTitle: data.propertyTitle,
    invitationLink: invitationLink,
    expirationDate: expirationDate,
  };

  // Get template based on language with dynamic brand name
  const template = data.language === 'es' ? getSpanishTemplate(brandName) : getEnglishTemplate(brandName);
  
  // Substitute variables
  const html = substituteVariables(template, variables);

  // Subject lines with dynamic brand name
  const subjects = {
    en: `You're Invited to Join ${data.propertyTitle}`,
    es: `Invitación para unirse a ${data.propertyTitle}`,
  };

  return {
    subject: subjects[data.language as 'en' | 'es'] || subjects.en,
    html,
    brandName,
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: InvitationEmailRequest = await req.json();

    console.log("Raw request body received:", data);
    console.log("Token:", data.token);
    console.log("ProjectId:", data.projectId);
    console.log("Sending invitation email to:", data.email);

    const emailContent = await getEmailContent(data);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${emailContent.brandName} <send@rentmate.me>`,
        to: [data.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, messageId: emailResult.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send email",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

serve(handler);
