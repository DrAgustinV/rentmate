import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { submissionSlug, email } = await req.json();
    console.log('Generating DocuSeal token for:', email, 'submission:', submissionSlug);

    if (!submissionSlug || !email) {
      throw new Error('Missing required parameters: submissionSlug and email');
    }

    const docusealApiUrl = Deno.env.get('DOCUSEAL_API_URL')!;
    const docusealApiKey = Deno.env.get('DOCUSEAL_API_KEY')!;

    // Generate embed token for specific submitter
    const tokenResponse = await fetch(`${docusealApiUrl}/submissions/${submissionSlug}/embed`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': docusealApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        expires_in: 3600, // Token valid for 1 hour
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('DocuSeal token API error:', errorText);
      throw new Error(`DocuSeal API error: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('DocuSeal token generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        token: tokenData.token,
        submitter_slug: tokenData.submitter_slug,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating DocuSeal token:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
