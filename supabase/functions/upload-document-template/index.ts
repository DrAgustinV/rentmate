import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get auth header from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - no auth header" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Get user - verify token is valid
    // Use anon key to verify user exists
    const userVerifyRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 
        "apikey": anonKey,
        "Authorization": authHeader
      }
    });
    
    if (!userVerifyRes.ok) {
      const err = await userVerifyRes.text();
      return new Response(JSON.stringify({ error: "User verification failed", details: err }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    const userData = await userVerifyRes.json();
    const userId = userData.id;

    // Parse template data  
    const data = await req.json();
    
    // Direct SQL insert via REST with service role
    // Note: no RLS when using service role key
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/property_documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        property_id: null,  // global - no property linked
        uploaded_by: userId,
        document_title: data.document_title,
        file_name: data.file_name,
        file_path: data.file_path,
        file_type: data.file_type,
        file_size_bytes: data.file_size_bytes,
        mime_type: data.mime_type,
        version: 1,
        description: data.description || null,
        is_latest_version: true,
        document_category: 'property',
        tenancy_id: null
      })
    });

    const result = await insertRes.json();
    
    if (!insertRes.ok) {
      console.error("Insert failed:", insertRes.status, result);
      return new Response(JSON.stringify({ 
        error: "Insert failed", 
        status: insertRes.status,
        details: result,
        userId: userId 
      }), { 
        status: insertRes.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: result,
      userId: userId
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});