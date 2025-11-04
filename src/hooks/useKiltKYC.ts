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

interface UseKiltKYCOptions {
  autoFetch?: boolean;
  onVerificationComplete?: (profile: KYCProfile) => void;
  onVerificationFailed?: (error: Error) => void;
}

interface UseKiltKYCReturn {
  // State
  kycProfile: KYCProfile | null;
  loading: boolean;
  initiating: boolean;
  error: Error | null;
  
  // Computed values
  isVerified: boolean;
  isPending: boolean;
  canInitiate: boolean;
  
  // Actions
  fetchKYCStatus: () => Promise<void>;
  initiateVerification: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

/**
 * Custom hook for managing KILT Protocol KYC verification
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { kycProfile, isVerified, initiateVerification, loading } = useKiltKYC();
 *   
 *   if (loading) return <Loader />;
 *   
 *   return (
 *     <div>
 *       {isVerified ? (
 *         <Badge>Verified</Badge>
 *       ) : (
 *         <Button onClick={initiateVerification}>Start Verification</Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useKiltKYC(options: UseKiltKYCOptions = {}): UseKiltKYCReturn {
  const { autoFetch = true, onVerificationComplete, onVerificationFailed } = options;
  
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

      // Fetch KYC profile data
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('kyc_status, kyc_credential_id, kyc_qr_code_url, kyc_wallet_did, kyc_verified_at, kyc_expires_at')
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
      
      console.error('[useKiltKYC] Error fetching KYC status:', error);
      
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
   */
  const initiateVerification = useCallback(async () => {
    try {
      setInitiating(true);
      setError(null);

      // Check if verification can be initiated
      if (kycProfile && !canInitiateKYC(kycProfile.kyc_status)) {
        throw new Error(t('kyc.errors.cannotInitiate'));
      }

      // Call edge function to initiate verification
      const { data, error: functionError } = await supabase.functions.invoke('initiate-kilt-kyc');

      if (functionError) {
        throw new Error(t('kyc.errors.initiationFailed'));
      }

      // Validate response
      const validatedResponse = KYCInitiationResponseSchema.parse(data);

      if (!validatedResponse.success) {
        throw new Error(validatedResponse.error || validatedResponse.message || t('kyc.errors.initiationFailed'));
      }

      // Success - show QR code message
      toast({
        title: t('kyc.success.initiatedTitle'),
        description: t('kyc.success.initiatedDescription'),
      });

      // Refresh status to get QR code
      await fetchKYCStatus();

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('kyc.errors.unknownError'));
      setError(error);
      
      console.error('[useKiltKYC] Error initiating verification:', error);
      
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
  }, [kycProfile, toast, t, fetchKYCStatus, onVerificationFailed]);

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
    
    // Actions
    fetchKYCStatus,
    initiateVerification,
    refreshStatus,
  };
}
