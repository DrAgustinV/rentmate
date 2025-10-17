import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

// Email templates organized by language code
const EMAIL_TEMPLATES: Record<string, string> = {
  en: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Invitation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, {{primaryColor}} 0%, {{accentColor}} 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .property-image {
      width: 100%;
      height: 300px;
      object-fit: cover;
      display: block;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .property-card {
      background: #f8f9fa;
      border-left: 4px solid {{primaryColor}};
      padding: 20px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .property-card h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }
    .benefits {
      margin: 30px 0;
    }
    .benefits h3 {
      color: #333;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .benefits ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .benefits li {
      padding: 10px 0;
      color: #555;
      font-size: 15px;
      line-height: 1.5;
    }
    .benefits li:before {
      content: "✓";
      color: {{primaryColor}};
      font-weight: bold;
      margin-right: 10px;
      font-size: 18px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, {{primaryColor}} 0%, {{accentColor}} 100%);
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s;
    }
    .expiration {
      color: #666;
      font-size: 14px;
      margin: 30px 0 20px 0;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e0e0e0;
    }
    .footer-brand {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    .fallback-link {
      color: #666;
      font-size: 13px;
      margin-top: 20px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{logoUrl}}" alt="{{brandName}}" class="logo" />
      <h1>🏠 Property Invitation</h1>
    </div>
    
    <img src="{{propertyImageUrl}}" alt="{{propertyTitle}}" class="property-image" />
    
    <div class="content">
      <p class="greeting">
        Hello! <strong>{{managerName}}</strong> has invited you to join as a tenant.
      </p>
      
      <div class="property-card">
        <h2>{{propertyTitle}}</h2>
        {{propertyAddressBlock}}
      </div>
      
      <div class="benefits">
        <h3>What you'll get:</h3>
        <ul>
          <li>Access to your property dashboard</li>
          <li>Submit and track maintenance requests</li>
          <li>View important property documents</li>
          <li>Communicate directly with your property manager</li>
          <li>Stay updated on property notifications</li>
        </ul>
      </div>
      
      <center>
        <a href="{{invitationLink}}" class="cta-button">Accept Invitation</a>
      </center>
      
      <div class="expiration">
        ⏰ <strong>Important:</strong> This invitation expires on <strong>{{expirationDate}}</strong>. Please accept it before then.
      </div>
      
      <p class="fallback-link">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="color: {{primaryColor}};">{{invitationLink}}</span>
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-brand">{{brandName}}</p>
      <p style="color: #999; font-size: 12px; margin: 5px 0;">Modern Property Management</p>
    </div>
  </div>
</body>
</html>`,

  es: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a Propiedad</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, {{primaryColor}} 0%, {{accentColor}} 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .property-image {
      width: 100%;
      height: 300px;
      object-fit: cover;
      display: block;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .property-card {
      background: #f8f9fa;
      border-left: 4px solid {{primaryColor}};
      padding: 20px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .property-card h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }
    .benefits {
      margin: 30px 0;
    }
    .benefits h3 {
      color: #333;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .benefits ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .benefits li {
      padding: 10px 0;
      color: #555;
      font-size: 15px;
      line-height: 1.5;
    }
    .benefits li:before {
      content: "✓";
      color: {{primaryColor}};
      font-weight: bold;
      margin-right: 10px;
      font-size: 18px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, {{primaryColor}} 0%, {{accentColor}} 100%);
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s;
    }
    .expiration {
      color: #666;
      font-size: 14px;
      margin: 30px 0 20px 0;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e0e0e0;
    }
    .footer-brand {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    .fallback-link {
      color: #666;
      font-size: 13px;
      margin-top: 20px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{logoUrl}}" alt="{{brandName}}" class="logo" />
      <h1>🏠 Invitación a Propiedad</h1>
    </div>
    
    <img src="{{propertyImageUrl}}" alt="{{propertyTitle}}" class="property-image" />
    
    <div class="content">
      <p class="greeting">
        ¡Hola! <strong>{{managerName}}</strong> te ha invitado a unirte como inquilino.
      </p>
      
      <div class="property-card">
        <h2>{{propertyTitle}}</h2>
        {{propertyAddressBlock}}
      </div>
      
      <div class="benefits">
        <h3>Lo que obtendrás:</h3>
        <ul>
          <li>Acceso a tu panel de control de propiedad</li>
          <li>Enviar y rastrear solicitudes de mantenimiento</li>
          <li>Ver documentos importantes de la propiedad</li>
          <li>Comunicarte directamente con tu administrador</li>
          <li>Mantenerte actualizado sobre notificaciones de la propiedad</li>
        </ul>
      </div>
      
      <center>
        <a href="{{invitationLink}}" class="cta-button">Aceptar Invitación</a>
      </center>
      
      <div class="expiration">
        ⏰ <strong>Importante:</strong> Esta invitación expira el <strong>{{expirationDate}}</strong>. Por favor, acéptala antes de esa fecha.
      </div>
      
      <p class="fallback-link">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
        <span style="color: {{primaryColor}};">{{invitationLink}}</span>
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-brand">{{brandName}}</p>
      <p style="color: #999; font-size: 12px; margin: 5px 0;">Gestión Moderna de Propiedades</p>
    </div>
  </div>
</body>
</html>`,
};

// Helper function to get template by language with fallback to English
function getTemplate(language: string): string {
  return EMAIL_TEMPLATES[language] || EMAIL_TEMPLATES['en'];
}

// Helper function to convert HSL to Hex for email compatibility
function hslToHex(hsl: string): string {
  const parts = hsl.split(' ');
  const h = parseInt(parts[0]);
  const s = parseInt(parts[1].replace('%', '')) / 100;
  const l = parseInt(parts[2].replace('%', '')) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = c; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
  
  // Fetch brand settings
  const { data: brandSettings } = await supabase
    .from('brand_settings')
    .select('brand_name, logo_url, primary_color, accent_color, custom_domain')
    .single();

  const brandName = brandSettings?.brand_name || 'RentMate';
  const logoUrl = brandSettings?.logo_url || '';
  const primaryColor = brandSettings?.primary_color ? hslToHex(brandSettings.primary_color) : '#8e4ec6';
  const accentColor = brandSettings?.accent_color ? hslToHex(brandSettings.accent_color) : '#e11d48';
  const customDomain = brandSettings?.custom_domain;

  // Try to fetch property photo
  let propertyImageUrl = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop';
  
  try {
    const { data: photos } = await supabase
      .storage
      .from('property-photos')
      .list(data.propertyId, { limit: 1 });

    if (photos && photos.length > 0) {
      const { data: urlData } = supabase
        .storage
        .from('property-photos')
        .getPublicUrl(`${data.propertyId}/${photos[0].name}`);
      
      if (urlData?.publicUrl) {
        propertyImageUrl = urlData.publicUrl;
      }
    }
  } catch (error) {
    console.log('Using fallback property image:', error);
  }

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
    invitationLink,
  });

  const expirationDate = new Date(data.expiresAt).toLocaleDateString(
    data.language === "es" ? "es-ES" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Prepare variables for substitution
  const variables = {
    brandName,
    logoUrl,
    primaryColor,
    accentColor,
    propertyImageUrl,
    propertyTitle: data.propertyTitle,
    propertyAddress: data.propertyAddress || '',
    propertyAddressBlock: data.propertyAddress 
      ? `<p style="color: #666; margin: 8px 0; font-size: 14px;">${escapeHtml(data.propertyAddress)}</p>`
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
