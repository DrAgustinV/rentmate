const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate test KILT credentials without SDK
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating KILT test credentials');

    // Generate random mnemonic (12 words from BIP39 wordlist)
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    ];
    const mnemonic = Array.from({ length: 12 }, () => words[Math.floor(Math.random() * words.length)]).join(' ');
    
    // Generate a mock address (in real implementation, this would be derived from mnemonic)
    const mockAddress = '4' + Array.from({ length: 47 }, () => 
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'[Math.floor(Math.random() * 58)]
    ).join('');
    
    const didUri = `did:kilt:light:peregrine:${mockAddress}`;

    const credentials = {
      network: 'peregrine',
      mnemonic: mnemonic,
      address: mockAddress,
      did: didUri,
      instructions: [
        '⚠️  IMPORTANT: These are TEST credentials for development',
        '',
        '1. Save the mnemonic securely',
        '2. Get free PILT tokens: https://faucet.peregrine.kilt.io/',
        '3. Add to Lovable secrets:',
        '   KILT_NETWORK=peregrine',
        `   KILT_ATTESTER_DID=${didUri}`,
        `   KILT_ATTESTER_MNEMONIC=${mnemonic}`,
        '',
        '4. For production (Spiritnet mainnet):',
        '   - Use real KILT SDK to generate proper credentials',
        '   - Register DID on-chain',
        '   - Buy KILT tokens for fees',
      ],
    };

    return new Response(
      JSON.stringify({
        success: true,
        credentials,
        warning: 'TEST CREDENTIALS ONLY - Not for production use',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating credentials:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
