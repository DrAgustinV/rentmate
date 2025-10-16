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

// Helper function to read template files
async function readTemplate(language: string): Promise<string> {
  const templatePath = new URL(
    `./_templates/invitation-${language}.html`,
    import.meta.url
  ).pathname;
  
  try {
    const template = await Deno.readTextFile(templatePath);
    return template;
  } catch (error) {
    console.error(`Failed to read template for language ${language}:`, error);
    // Fallback to English if template not found
    if (language !== 'en') {
      return readTemplate('en');
    }
    throw new Error('Email template not found');
  }
}

// Helper function to substitute variables in template
function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
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

  // Read template file based on language
  const template = await readTemplate(data.language || 'en');
  
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
