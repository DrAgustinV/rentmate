import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  propertyTitle: string;
  propertyAddress: string | null;
  managerName: string;
  token: string;
  expiresAt: string;
  language: string;
  projectId: string;
}

// Email template constants
const TEMPLATE_EN = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
      .property-info { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
      .property-info strong { display: block; margin-bottom: 8px; color: #667eea; }
      .cta-button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 30px 0; transition: transform 0.2s; }
      .cta-button:hover { transform: translateY(-2px); }
      .expiration { font-size: 14px; color: #e74c3c; font-weight: 500; margin: 20px 0; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 14px; color: #666666; border-top: 1px solid #e0e0e0; }
      .footer a { color: #667eea; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🏠 Property Invitation</h1>
      </div>
      <div class="content">
        <p>Hi there!</p>
        <p><strong>{{managerName}}</strong> has invited you to become a tenant of:</p>
        <div class="property-info">
          <strong>📍 Property:</strong>
          {{propertyTitle}}
          {{propertyAddressBlock}}
        </div>
        <p>As a tenant, you'll be able to:</p>
        <ul>
          <li>Report and track maintenance tickets</li>
          <li>View property documents</li>
          <li>Communicate with your property manager</li>
          <li>Access important property information</li>
        </ul>
        <div style="text-align: center;">
          <a href="{{invitationLink}}" class="cta-button">Accept Invitation →</a>
        </div>
        <p class="expiration">⏰ This invitation expires on: {{expirationDate}}</p>
        <p style="font-size: 14px; color: #666;">
          Don't want to join? Simply ignore this email.
        </p>
      </div>
      <div class="footer">
        <p>Property Management System</p>
        <p>If you're having trouble with the button, copy and paste this link into your browser:<br>
        <a href="{{invitationLink}}">{{invitationLink}}</a></p>
      </div>
    </div>
  </body>
</html>`;

const TEMPLATE_ES = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
      .property-info { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
      .property-info strong { display: block; margin-bottom: 8px; color: #667eea; }
      .cta-button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 30px 0; transition: transform 0.2s; }
      .cta-button:hover { transform: translateY(-2px); }
      .expiration { font-size: 14px; color: #e74c3c; font-weight: 500; margin: 20px 0; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 14px; color: #666666; border-top: 1px solid #e0e0e0; }
      .footer a { color: #667eea; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🏠 Invitación a Propiedad</h1>
      </div>
      <div class="content">
        <p>¡Hola!</p>
        <p><strong>{{managerName}}</strong> te ha invitado a ser inquilino de:</p>
        <div class="property-info">
          <strong>📍 Propiedad:</strong>
          {{propertyTitle}}
          {{propertyAddressBlock}}
        </div>
        <p>Como inquilino, podrás:</p>
        <ul>
          <li>Reportar y seguir tickets de mantenimiento</li>
          <li>Ver documentos de la propiedad</li>
          <li>Comunicarte con tu administrador de propiedad</li>
          <li>Acceder a información importante de la propiedad</li>
        </ul>
        <div style="text-align: center;">
          <a href="{{invitationLink}}" class="cta-button">Aceptar Invitación →</a>
        </div>
        <p class="expiration">⏰ Esta invitación expira el: {{expirationDate}}</p>
        <p style="font-size: 14px; color: #666;">
          ¿No quieres unirte? Simplemente ignora este correo.
        </p>
      </div>
      <div class="footer">
        <p>Sistema de Gestión de Propiedades</p>
        <p>Si tienes problemas con el botón, copia y pega este enlace en tu navegador:<br>
        <a href="{{invitationLink}}">{{invitationLink}}</a></p>
      </div>
    </div>
  </body>
</html>`;

// Helper function to get template by language
function getTemplate(language: string): string {
  return language === 'es' ? TEMPLATE_ES : TEMPLATE_EN;
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
  const appUrl = `https://${data.projectId}.lovableproject.com`;
  const invitationLink = `${appUrl}/invitations?token=${data.token}`;

  console.log("Invitation email data:", {
    email: data.email,
    token: data.token,
    projectId: data.projectId,
    invitationLink,
  });

  const expirationDate = new Date(data.expiresAt).toLocaleDateString(
    data.language === "es" ? "es-ES" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Prepare variables for substitution
  const variables = {
    propertyTitle: data.propertyTitle,
    propertyAddress: data.propertyAddress || '',
    propertyAddressBlock: data.propertyAddress 
      ? `<br><strong>${data.language === 'es' ? 'Dirección' : 'Address'}:</strong> ${data.propertyAddress}` 
      : '',
    managerName: data.managerName,
    invitationLink: invitationLink,
    expirationDate: expirationDate,
  };

  // Get template based on language
  const template = getTemplate(data.language || 'en');
  
  // Substitute variables
  const html = substituteVariables(template, variables);

  // Subject lines
  const subjects = {
    en: `You're Invited to Join ${data.propertyTitle}`,
    es: `Invitación para unirse a ${data.propertyTitle}`,
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
        from: "RentMate <send@rentmate.me>",
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
