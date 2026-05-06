import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 10;

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (clientIp: string): { allowed: boolean; remaining: number; resetAt: number } => {
  const now = Date.now();
  const windowStart = now - (RATE_LIMIT_WINDOW_SECONDS * 1000);
  
  const clientData = requestCounts.get(clientIp);
  
  if (!clientData || clientData.resetAt < now) {
    // New window
    const resetAt = now + (RATE_LIMIT_WINDOW_SECONDS * 1000);
    requestCounts.set(clientIp, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt };
  }
  
  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limited
    return { allowed: false, remaining: 0, resetAt: clientData.resetAt };
  }
  
  // Increment count
  clientData.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - clientData.count, resetAt: clientData.resetAt };
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Rate limiting - use IP from forwarded headers if available
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                   req.headers.get("cf-connecting-ip") || 
                   "unknown";
  
  const rateLimit = checkRateLimit(clientIp);
  
  if (!rateLimit.allowed) {
    const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ 
        error: "Too many requests. Please try again later.",
        rate_limited: true,
        wait_seconds: waitSeconds
      }),
      { 
        status: 429, 
        headers: { 
          "Content-Type": "application/json",
          "Retry-After": String(waitSeconds),
          ...corsHeaders 
        } 
      }
    );
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token format (should be 64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Verifying email token...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find profile with this token
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id, email, email_verified, email_verification_expires_at")
      .eq("email_verification_token", token)
      .single();

    if (findError || !profile) {
      console.error("Token not found:", findError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification token", code: "INVALID_TOKEN" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already verified
    if (profile.email_verified) {
      return new Response(
        JSON.stringify({ success: true, message: "Email already verified", already_verified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if token expired
    if (profile.email_verification_expires_at) {
      const expiresAt = new Date(profile.email_verification_expires_at);
      const now = new Date();
      
      if (now > expiresAt) {
        console.log("Token expired for user:", profile.id);
        return new Response(
          JSON.stringify({ error: "Verification token has expired. Please request a new one.", code: "TOKEN_EXPIRED" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Verify the email
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_sent_at: null,
        email_verification_expires_at: null,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to verify email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email verified successfully for user:", profile.id);

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in verify-email-token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
