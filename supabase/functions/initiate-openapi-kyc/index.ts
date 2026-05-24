// BLOCKED: OpenAPI KYC is disabled.
// This edge function was intentionally blocked. See the full original implementation
// preserved below (commented out).
//
// To re-enable OpenAPI KYC:
// 1. Create the missing verify-openapi-kyc webhook edge function
// 2. Uncomment config.toml [functions.initiate-openapi-kyc] entry
// 3. Unrestore the full implementation below
// 4. Unblock 'openapi' in src/types/enums.ts KYCProvider type
// 5. Unblock openapi_* variants in kyc.schema.ts KYCProviderEnum
// 6. Restore and wire OpenAPI option in IdentityVerification.tsx UI
// 7. Re-add initiateOpenAPIKYC to identityService.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { createOpenAPIIDVClient, VerificationLevel } from "../_shared/openapi-idv-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'BLOCKED: OpenAPI KYC is currently disabled. Please use Didit or KILT verification instead.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
