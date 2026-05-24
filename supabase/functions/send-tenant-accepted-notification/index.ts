import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantAcceptedNotificationRequest {
  propertyId: string;
  propertyTitle: string;
  tenantName: string;
  tenantEmail: string;
  managerEmail: string;
  managerName: string;
  language: string;
  projectId: string;
}

const EMAIL_TEMPLATE_EN = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width:100%">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Tenant Accepted Invitation - RentMate</title>
</head>
<body style="margin:0;padding:0;font-family:'Inter','Roboto',Arial,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;margin:0 auto;">
          <tr>
            <td style="background-color:#136e6a;padding:48px 24px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:48px;height:48px;background-color:#2C4240;border-radius:50%;">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;">
                          <span style="color:#FFFFFF;font-size:18px;font-weight:700;font-family:'Inter','Roboto',Arial,sans-serif;">RE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;font-family:'Inter','Roboto',Arial,sans-serif;">RentMate</h1>
              <p style="margin:8px 0 0;color:#FFFFFF;opacity:0.8;font-size:14px;font-family:'Inter','Roboto',Arial,sans-serif;">Professional Property Management</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0;color:#46A19D;font-size:20px;font-weight:600;font-family:'Inter','Roboto',Arial,sans-serif;">Your tenant has accepted the invitation!</p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <h2 style="margin:0 0 8px 0;color:#46A19D;font-size:22px;font-weight:600;font-family:'Inter','Roboto',Arial,sans-serif;">{{propertyTitle}}</h2>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:8px;">
                    <p style="margin:0;color:#374151;font-size:16px;line-height:1.6;font-family:'Inter','Roboto',Arial,sans-serif;">
                      <strong>Tenant Details:</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:4px;">
                    <p style="margin:0;color:#374151;font-size:15px;font-family:'Inter','Roboto',Arial,sans-serif;">
                      Name: <strong>{{tenantName}}</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#374151;font-size:15px;font-family:'Inter','Roboto',Arial,sans-serif;">
                      Email: <strong>{{tenantEmail}}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:32px;">
                    <p style="margin:0;color:#374151;font-size:16px;line-height:1.6;font-family:'Inter','Roboto',Arial,sans-serif;">
                      You can now manage their contracts, payments, and maintenance requests in the property dashboard.
                    </p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="background-color:#46A19D;border-radius:6px;mso-padding-alt:14px 32px;">
                          <a href="{{propertyHubLink}}" style="display:inline-block;background-color:#46A19D;color:#2C4240;font-family:'Inter','Roboto',Arial,sans-serif;font-size:16px;font-weight:500;text-decoration:none;padding:14px 32px;border-radius:6px;mso-padding-alt:0;">
                            View Property
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:24px 0 8px 0;">
                    <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;font-family:'Inter','Roboto',Arial,sans-serif;">
                      Questions? Feel free to reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#BEF0ED;padding:24px 32px;text-align:center;">
              <p style="margin:8px 0;color:#2C4240;font-size:14px;font-family:'Inter','Roboto',Arial,sans-serif;">
                © 2024 RentMate. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const EMAIL_TEMPLATE_ES = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width:100%">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Inquilino Aceptó Invitación - RentMate</title>
</head>
<body style="margin:0;padding:0;font-family:'Inter','Roboto',Arial,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;margin:0 auto;">
          <tr>
            <td style="background-color:#136e6a;padding:48px 24px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:48px;height:48px;background-color:#2C4240;border-radius:50%;">
                      <tr>
                        <td style="text-align:center;vertical-align:middle;">
                          <span style="color:#FFFFFF;font-size:18px;font-weight:700;font-family:'Inter','Roboto',Arial,sans-serif;">RE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;font-family:'Inter','Roboto',Arial,sans-serif;">RentMate</h1>
              <p style="margin:8px 0 0;color:#FFFFFF;opacity:0.8;font-size:14px;font-family:'Inter','Roboto',Arial,sans-serif;">Gestión Profesional de Propiedades</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0;color:#46A19D;font-size:20px;font-weight:600;font-family:'Inter','Roboto',Arial,sans-serif;">¡Tu inquilino ha aceptado la invitación!</p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <h2 style="margin:0 0 8px 0;color:#46A19D;font-size:22px;font-weight:600;font-family:'Inter','Roboto',Arial,sans-serif;">{{propertyTitle}}</h2>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:8px;">
                    <p style="margin:0;color:#374151;font-size:16px;line-height:1.6;font-family:'Inter','Roboto',Arial,sans-serif;">
                      <strong>Detalles del inquilino:</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:4px;">
                    <p style="margin:0;color:#374151;font-size:15px;font-family:'Inter','Roboto',Arial,sans-serif;">
                      Nombre: <strong>{{tenantName}}</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#374151;font-size:15px;font-family:'Inter','Roboto',Arial,sans-serif;">
                      Correo: <strong>{{tenantEmail}}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom:32px;">
                    <p style="margin:0;color:#374151;font-size:16px;line-height:1.6;font-family:'Inter','Roboto',Arial,sans-serif;">
                      Ahora puedes gestionar sus contratos, pagos y solicitudes de mantenimiento en el panel de la propiedad.
                    </p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="background-color:#46A19D;border-radius:6px;mso-padding-alt:14px 32px;">
                          <a href="{{propertyHubLink}}" style="display:inline-block;background-color:#46A19D;color:#2C4240;font-family:'Inter','Roboto',Arial,sans-serif;font-size:16px;font-weight:500;text-decoration:none;padding:14px 32px;border-radius:6px;mso-padding-alt:0;">
                            Ver Propiedad
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding:24px 0 8px 0;">
                    <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;font-family:'Inter','Roboto',Arial,sans-serif;">
                      ¿Preguntas? No dudes en responder a este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#BEF0ED;padding:24px 32px;text-align:center;">
              <p style="margin:8px 0;color:#2C4240;font-size:14px;font-family:'Inter','Roboto',Arial,sans-serif;">
                © 2024 RentMate. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const EMAIL_TEMPLATES = {
  en: EMAIL_TEMPLATE_EN,
  es: EMAIL_TEMPLATE_ES,
};

function getTemplate(language: string): string {
  return language === 'es' ? EMAIL_TEMPLATES.es : EMAIL_TEMPLATES.en;
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

const getEmailContent = async (data: TenantAcceptedNotificationRequest) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: brandSettings } = await supabase
    .from('brand_settings')
    .select('custom_domain')
    .single();

  const customDomain = brandSettings?.custom_domain;
  const appUrl = customDomain 
    ? `https://${customDomain}` 
    : `https://${data.projectId}.lovableproject.com`;
  
  const propertyHubLink = `${appUrl}/properties/${data.propertyId}/tenants`;

  const variables = {
    propertyTitle: data.propertyTitle,
    tenantName: data.tenantName,
    tenantEmail: data.tenantEmail,
    propertyHubLink,
  };

  const template = getTemplate(data.language || 'en');
  const html = substituteVariables(template, variables);

  const subjects = {
    en: `Tenant Accepted Invitation - ${data.propertyTitle}`,
    es: `Inquilino Aceptó Invitación - ${data.propertyTitle}`,
  };

  return {
    subject: subjects[data.language as 'en' | 'es'] || subjects.en,
    html,
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: TenantAcceptedNotificationRequest = await req.json();

    console.log("Tenant accepted notification request:", data);

    const emailContent = await getEmailContent(data);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RentMate <send@rentmate.me>",
        to: [data.managerEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Manager notification email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, messageId: emailResult.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending tenant accepted notification:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send notification",
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