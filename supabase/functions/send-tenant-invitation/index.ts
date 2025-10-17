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

// Helper function to load template from external HTML files
async function loadTemplate(language: string): Promise<string> {
  const templatePath = new URL(
    `./_templates/invitation-${language}.html`,
    import.meta.url
  ).pathname;
  
  try {
    const template = await Deno.readTextFile(templatePath);
    return template;
  } catch (error) {
    console.error(`Failed to load template for ${language}:`, error);
    if (language !== 'en') {
      return loadTemplate('en'); // Fallback to English
    }
    throw new Error(`Template file not found: ${templatePath}`);
  }
}

// Helper function to get template by language
async function getTemplate(language: string): Promise<string> {
  return await loadTemplate(language === 'es' ? 'es' : 'en');
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
    .select('brand_name, logo_url, primary_color, accent_color')
    .single();

  const brandName = brandSettings?.brand_name || 'RentMate';
  const logoUrl = brandSettings?.logo_url || '';
  const primaryColor = brandSettings?.primary_color ? hslToHex(brandSettings.primary_color) : '#8e4ec6';
  const accentColor = brandSettings?.accent_color ? hslToHex(brandSettings.accent_color) : '#e11d48';

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
  const template = await getTemplate(data.language || 'en');
  
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
