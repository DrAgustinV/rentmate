import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  KYCProfile, 
  KYCProfileSchema, 
  KYCInitiationResponseSchema,
  type KYCStatus,
  canInitiateKYC,
  isKYCVerified,
  isKYCPending,
} from '@/lib/validations/kyc.schema';
import { useLanguage } from '@/contexts/LanguageContext';

export type KYCProvider = 'kilt' | 'openapi';
export type OpenAPIVerificationLevel = 'basic' | 'advanced' | 'expert';

interface UseKYCOptions {
  autoFetch?: boolean;
  provider?: KYCProvider;
  verificationLevel?: OpenAPIVerificationLevel;
  onVerificationComplete?: (profile: KYCProfile) => void;
  onVerificationFailed?: (error: Error) => void;
  onCancel?: () => void;
}

interface UseKYCReturn {
  // State
  kycProfile: KYCProfile | null;
  loading: boolean;
  initiating: boolean;
  error: Error | null;
  
  // Computed values
  isVerified: boolean;
  isPending: boolean;
  canInitiate: boolean;
  currentProvider: KYCProvider | null;
  
  // Actions
  fetchKYCStatus: () => Promise<void>;
  initiateVerification: (provider?: KYCProvider, level?: OpenAPIVerificationLevel) => Promise<void>;
  cancelVerification: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

/**
 * Custom hook for managing KYC verification (KILT Protocol or OpenAPI IDV)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { kycProfile, isVerified, initiateVerification, loading } = useKYC();
 *   
 *   if (loading) return <Loader />;
 *   
 *   return (
 *     <div>
 *       {isVerified ? (
 *         <Badge>Verified</Badge>
 *       ) : (
 *         <>
 *           <Button onClick={() => initiateVerification('kilt')}>KILT Verification</Button>
 *           <Button onClick={() => initiateVerification('openapi', 'basic')}>OpenAPI Basic</Button>
 *         </>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useKYC(options: UseKYCOptions = {}): UseKYCReturn {
  const { 
    autoFetch = true, 
    provider = 'openapi', 
    verificationLevel = 'basic',
    onVerificationComplete, 
    onVerificationFailed,
    onCancel
  } = options;
  
  const [kycProfile, setKycProfile] = useState<KYCProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { toast } = useToast();
  const { t } = useLanguage();

  /**
   * Fetch current KYC status from database
   */
  const fetchKYCStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error(t('kyc.errors.notAuthenticated'));
      }

      // Fetch KYC profile data including provider
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('kyc_status, kyc_provider, kyc_credential_id, kyc_qr_code_url, kyc_wallet_did, kyc_verified_at, kyc_expires_at')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        throw new Error(t('kyc.errors.fetchFailed'));
      }

      if (!data) {
        throw new Error(t('kyc.errors.profileNotFound'));
      }

      // Validate and parse response
      const validatedProfile = KYCProfileSchema.parse(data);
      setKycProfile(validatedProfile);

      // Call completion callback if verified
      if (isKYCVerified(validatedProfile.kyc_status) && onVerificationComplete) {
        onVerificationComplete(validatedProfile);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('kyc.errors.unknownError'));
      setError(error);
      
      console.error('[useKYC] Error fetching KYC status:', error);
      
      toast({
        title: t('kyc.errors.title'),
        description: error.message,
        variant: 'destructive',
      });

      if (onVerificationFailed) {
        onVerificationFailed(error);
      }
    } finally {
      setLoading(false);
    }
  }, [toast, t, onVerificationComplete, onVerificationFailed]);

  /**
   * Initiate new KYC verification process
   * Supports both KILT and OpenAPI providers
   */
  const initiateVerification = useCallback(async (
    selectedProvider: KYCProvider = provider,
    level: OpenAPIVerificationLevel = verificationLevel
  ) => {
    try {
      setInitiating(true);
      setError(null);

      // Check if verification can be initiated
      if (kycProfile && !canInitiateKYC(kycProfile.kyc_status)) {
        throw new Error(t('kyc.errors.cannotInitiate'));
      }

      let functionData;
      let functionError;

      // Call appropriate edge function based on provider
      if (selectedProvider === 'kilt') {
        const result = await supabase.functions.invoke('initiate-kilt-kyc');
        functionData = result.data;
        functionError = result.error;
      } else {
        // OpenAPI IDV
        const result = await supabase.functions.invoke('initiate-openapi-kyc', {
          body: { level }
        });
        functionData = result.data;
        functionError = result.error;
      }

      if (functionError) {
        throw new Error(t('kyc.errors.initiationFailed'));
      }

      // Validate response
      const validatedResponse = KYCInitiationResponseSchema.parse(functionData);

      if (!validatedResponse.success) {
        throw new Error(validatedResponse.error || validatedResponse.message || t('kyc.errors.initiationFailed'));
      }

      // Success - show appropriate message
      const providerName = selectedProvider === 'kilt' ? 'KILT Protocol' : `OpenAPI (${level})`;
      toast({
        title: t('kyc.success.initiatedTitle'),
        description: `${providerName}: ${t('kyc.success.initiatedDescription')}`,
      });

      // Refresh status to get QR code
      await fetchKYCStatus();

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('kyc.errors.unknownError'));
      setError(error);
      
      console.error('[useKYC] Error initiating verification:', error);
      
      toast({
        title: t('kyc.errors.initiationTitle'),
        description: error.message,
        variant: 'destructive',
      });

      if (onVerificationFailed) {
        onVerificationFailed(error);
      }
    } finally {
      setInitiating(false);
    }
  }, [kycProfile, provider, verificationLevel, toast, t, fetchKYCStatus, onVerificationFailed]);

  /**
   * Cancel ongoing verification and reset to not_started
   */
  const cancelVerification = useCallback(async () => {
    try {
      setError(null);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error(t('kyc.errors.notAuthenticated'));
      }

      // Reset KYC status in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'not_started',
          kyc_provider: null,
          kyc_qr_code_url: null,
          kyc_credential_id: null,
          kyc_wallet_did: null
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(t('kyc.errors.cancelFailed'));
      }

      // Refresh status to update UI
      await fetchKYCStatus();
      
      // Call cancel callback
      if (onCancel) {
        onCancel();
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('kyc.errors.unknownError'));
      setError(error);
      
      console.error('[useKYC] Error canceling verification:', error);
      
      toast({
        title: t('kyc.errors.title'),
        description: error.message,
        variant: 'destructive',
      });

      throw error;
    }
  }, [toast, t, fetchKYCStatus, onCancel]);

  /**
   * Refresh KYC status (alias for fetchKYCStatus)
   */
  const refreshStatus = useCallback(async () => {
    await fetchKYCStatus();
  }, [fetchKYCStatus]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchKYCStatus();
    }
  }, [autoFetch, fetchKYCStatus]);

  // Computed values
  const isVerified = isKYCVerified(kycProfile?.kyc_status);
  const isPending = isKYCPending(kycProfile?.kyc_status);
  const canInitiate = canInitiateKYC(kycProfile?.kyc_status);
  
  // Extract current provider from kyc_provider field
  const currentProvider: KYCProvider | null = kycProfile?.kyc_provider
    ? (kycProfile.kyc_provider.startsWith('openapi_') ? 'openapi' : 'kilt')
    : null;

  return {
    // State
    kycProfile,
    loading,
    initiating,
    error,
    
    // Computed
    isVerified,
    isPending,
    canInitiate,
    currentProvider,
    
    // Actions
    fetchKYCStatus,
    initiateVerification,
    cancelVerification,
    refreshStatus,
  };
}
