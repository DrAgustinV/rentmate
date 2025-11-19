import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeolocationResponse {
  ip?: string; // Anonymized IP
  country?: string;
  region?: string;
  city?: string;
  error?: string;
}

// Anonymize IP address by masking last octet (IPv4) or last 80 bits (IPv6)
function anonymizeIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    // IPv4: mask last octet
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  
  // IPv6: mask last 80 bits (keep first 48 bits)
  const ipv6Parts = ip.split(':');
  if (ipv6Parts.length >= 3) {
    return `${ipv6Parts[0]}:${ipv6Parts[1]}:${ipv6Parts[2]}::`;
  }
  
  // Fallback: return as-is if format is unrecognized
  return ip;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let clientIP = body.ip;

    // If ip is 'auto', extract from request headers
    if (clientIP === 'auto' || !clientIP) {
      // Try to get real IP from various headers (Cloudflare, nginx, etc.)
      clientIP = req.headers.get('cf-connecting-ip') || 
                 req.headers.get('x-real-ip') || 
                 req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                 'unknown';
      
      console.log('Extracted IP from headers:', clientIP);
    }

    if (!clientIP || clientIP === 'unknown') {
      return new Response(
        JSON.stringify({ 
          ip: null,
          country: 'Unknown', 
          region: 'Unknown', 
          city: 'Unknown' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Anonymize IP before using it
    const anonymizedIP = anonymizeIP(clientIP);
    console.log('Original IP:', clientIP, '-> Anonymized:', anonymizedIP);

    // Use ip-api.com free tier (45 requests per minute) with the ORIGINAL IP
    // We need the original for geolocation, but only return the anonymized version
    const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,regionName,city`);
    const data = await response.json();

    if (data.status === 'fail') {
      return new Response(
        JSON.stringify({ 
          ip: anonymizedIP,
          country: 'Unknown', 
          region: 'Unknown', 
          city: 'Unknown' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geolocation: GeolocationResponse = {
      ip: anonymizedIP, // Return anonymized IP
      country: data.country || 'Unknown',
      region: data.regionName || 'Unknown',
      city: data.city || 'Unknown',
    };

    console.log('Geolocation result (with anonymized IP):', geolocation);

    return new Response(
      JSON.stringify(geolocation),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geolocation error:', error);
    return new Response(
      JSON.stringify({ 
        ip: null,
        country: 'Unknown', 
        region: 'Unknown', 
        city: 'Unknown' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

