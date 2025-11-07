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

// Helper function to load template from external file with fallback to English
async function getTemplate(language: string): Promise<string> {
  try {
    const templatePath = language === 'es' 
      ? './_templates/invitation-es.html' 
      : './_templates/invitation-en.html';
    
    const template = await Deno.readTextFile(new URL(templatePath, import.meta.url));
    return template;
  } catch (error) {
    console.error(`Failed to load template for language ${language}:`, error);
    // Fallback to English if specified language fails
    if (language !== 'en') {
      try {
        return await Deno.readTextFile(new URL('./_templates/invitation-en.html', import.meta.url));
      } catch (fallbackError) {
        console.error('Failed to load English fallback template:', fallbackError);
        throw new Error('Could not load email template');
      }
    }
    throw error;
  }
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
  
  // Fetch custom domain for invitation link
  const { data: brandSettings } = await supabase
    .from('brand_settings')
    .select('custom_domain')
    .single();

  const customDomain = brandSettings?.custom_domain;

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

  // Format expiration date
  const expirationDate = new Date(data.expiresAt).toLocaleDateString(
    data.language === "es" ? "es-ES" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Prepare variables for substitution (only the 4 variables in the template)
  const variables = {
    managerName: data.managerName,
    propertyTitle: data.propertyTitle,
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
