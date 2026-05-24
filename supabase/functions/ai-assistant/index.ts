import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "property_description") {
      const { title, address, city, country } = data;
      systemPrompt = `You are a real estate copywriter. Generate attractive, concise property descriptions for rental listings. 
Keep descriptions under 150 words. Focus on appealing to potential tenants. 
Be professional but warm. Highlight location benefits when possible.
Do not use excessive punctuation or emojis. Just return the description text, no quotes or labels.`;
      
      userPrompt = `Generate a property description for:
Title: ${title}
Address: ${address || "Not provided"}
City: ${city || "Not provided"}
Country: ${country || "Not provided"}`;
    } else if (type === "comment_response") {
      const { ticketTitle, ticketType, ticketPriority, ticketDescription, recentComments } = data;
      systemPrompt = `You are a professional property manager assistant. Draft helpful, professional responses to tenant maintenance tickets.
Be empathetic and solution-oriented. Keep responses concise (2-4 sentences).
Never make promises about specific timelines unless certain. Be polite and professional.
Just return the response text, no quotes or labels.`;
      
      const commentsContext = recentComments && recentComments.length > 0
        ? `\n\nRecent comments:\n${(recentComments as Array<{ comment: string }>).map((c) => `- ${c.comment}`).join("\n")}`
        : "";
      
      userPrompt = `Draft a response for this maintenance ticket:
Title: ${ticketTitle}
Type: ${ticketType}
Priority: ${ticketPriority}
Description: ${ticketDescription}${commentsContext}`;
    } else {
      throw new Error("Invalid request type. Use 'property_description' or 'comment_response'.");
    }

    console.log(`AI Assistant request - Type: ${type}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service temporarily unavailable");
    }

    const result = await response.json();
    const generatedText = result.choices?.[0]?.message?.content || "";

    console.log(`AI Assistant success - Type: ${type}, Length: ${generatedText.length}`);

    return new Response(JSON.stringify({ text: generatedText.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
