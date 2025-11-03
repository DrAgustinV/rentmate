import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DockKYCRequest {
  template?: string;
  credentialSubject?: {
    type: string[];
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Initiating Dock KYC verification');

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Check if user already has a pending or verified KYC
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('kyc_status, dock_kyc_credential_id, kyc_verified_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (profile.kyc_status === 'verified' && profile.kyc_verified_at) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User already has verified KYC',
          kyc_status: profile.kyc_status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Create KYC credential request via Dock API
    const dockApiUrl = Deno.env.get('DOCK_API_URL') ?? 'https://api-testnet.dock.io';
    const dockApiKey = Deno.env.get('DOCK_API_KEY');

    if (!dockApiKey) {
      throw new Error('DOCK_API_KEY not configured');
    }

    console.log('Creating Dock credential request');

    // Create a credential request
    const requestBody: DockKYCRequest = {
      template: 'kyc-verification', // This would be your configured template ID
      credentialSubject: {
        type: ['VerifiableCredential', 'KYCCredential'],
      },
    };

    const dockResponse = await fetch(`${dockApiUrl}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DOCK-API-TOKEN': dockApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!dockResponse.ok) {
      const errorText = await dockResponse.text();
      console.error('Dock API error:', errorText);
      throw new Error(`Dock API error: ${dockResponse.status} - ${errorText}`);
    }

    const dockData = await dockResponse.json();
    console.log('Dock credential created:', dockData.id);

    // Generate QR code URL (this would typically come from Dock's response)
    const qrCodeUrl = dockData.qrCode || `${dockApiUrl}/verify/${dockData.id}`;

    // Update user profile with KYC status and credential ID
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        dock_kyc_credential_id: dockData.id,
        dock_kyc_qr_code_url: qrCodeUrl,
        kyc_status: 'pending',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Failed to update user profile');
    }

    console.log('KYC initiation successful');

    return new Response(
      JSON.stringify({
        success: true,
        credential_id: dockData.id,
        qr_code_url: qrCodeUrl,
        kyc_status: 'pending',
        message: 'Please scan the QR code with your Dock Wallet to complete verification',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in initiate-dock-kyc:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Failed to initiate KYC verification',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
