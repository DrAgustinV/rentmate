import { useState, useEffect, useCallback } from 'react';
import { profileService, authService, identityService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { 
  KYCInitiationResponseSchema,
  type KYCStatus,
  canInitiateKYC,
  isKYCVerified,
  isKYCPending,
} from '@/lib/validations/kyc.schema';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProfileDomain } from '@/types/domain';

export type KYCProvider = 'kilt' | 'didit';
// BLOCKED: OpenAPI KYC is disabled
// export type OpenAPIVerificationLevel = 'basic' | 'advanced' | 'expert';

interface UseKYCOptions {
  autoFetch?: boolean;
  provider?: KYCProvider;
  onVerificationComplete?: (profile: ProfileDomain) => void;
  onVerificationFailed?: (error: Error) => void;
  onCancel?: () => void;
}

interface UseKYCReturn {
  // State
  kycProfile: ProfileDomain | null;
  loading: boolean;
  initiating: boolean;
  checkingStatus: boolean;
  error: Error | null;
  
  // Computed values
  isVerified: boolean;
  isPending: boolean;
  canInitiate: boolean;
  currentProvider: KYCProvider | null;
  
  // Actions
  fetchKYCStatus: () => Promise<void>;
  initiateVerification: (provider?: KYCProvider) => Promise<void>;
  cancelVerification: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  checkDiditStatus: () => Promise<void>;
  checkKiltStatus: () => Promise<void>;
}

/**
 * Custom hook for managing KYC verification (KILT or Didit)
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
 *           <Button onClick={() => initiateVerification('didit')}>Didit Verification</Button>
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
    provider = 'didit', // Default to Didit (free)
    onVerificationComplete, 
    onVerificationFailed,
    onCancel
  } = options;
  
  const [kycProfile, setKycProfile] = useState<ProfileDomain | null>(null);
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
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

      const user = await authService.getCurrentUser();
      
      if (!user) {
        throw new Error(t('kyc.errors.notAuthenticated'));
      }

      const profile = await profileService.getProfile(user.id);

      if (!profile) {
        throw new Error(t('kyc.errors.profileNotFound'));
      }

      setKycProfile(profile);

      if (isKYCVerified(profile.kycStatus) && onVerificationComplete) {
        onVerificationComplete(profile);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('kyc.errors.unknownError'));
      setError(error);
      
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
  const initiateVerification = useCallback(async (
    selectedProvider: KYCProvider = provider
  ) => {
    try {
      setInitiating(true);
      setError(null);

      if (kycProfile && !canInitiateKYC(kycProfile.kycStatus)) {
        throw new Error(t('kyc.errors.cannotInitiate'));
      }

      let functionData;

      if (selectedProvider === 'kilt') {
        functionData = await identityService.initiateKiltKYC();
      } else {
        functionData = await identityService.initiateDiditKYC();
      }

      // Validate response
      const validatedResponse = KYCInitiationResponseSchema.parse(functionData);

      if (!validatedResponse.success) {
        throw new Error(validatedResponse.error || validatedResponse.message || t('kyc.errors.initiationFailed'));
      }

      // Success - show appropriate message
      const providerName = selectedProvider === 'kilt' 
        ? 'KILT Protocol' 
        : 'Didit.me';
      toast({
        title: t('kyc.success.initiatedTitle'),
        description: `${providerName}: ${t('kyc.success.initiatedDescription')}`,
      });

      await fetchKYCStatus();

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('kyc.errors.unknownError'));
      setError(error);
      
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
  }, [kycProfile, provider, toast, t, fetchKYCStatus, onVerificationFailed]);

  /**
   * Cancel ongoing verification and reset to not_started
   */
  const cancelVerification = useCallback(async () => {
    try {
      setError(null);

      const user = await authService.getCurrentUser();
      
      if (!user) {
        throw new Error(t('kyc.errors.notAuthenticated'));
      }

      await profileService.updateKycData(user.id, { kycStatus: 'not_started' });

      await fetchKYCStatus();
      
      if (onCancel) {
        onCancel();
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('kyc.errors.unknownError'));
      setError(error);
      
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

  /**
   * Check Didit verification status by polling the Didit API
   * Useful as a fallback when webhooks fail
   */
  const checkDiditStatus = useCallback(async () => {
    try {
      setCheckingStatus(true);
      setError(null);

      const data = await identityService.checkDiditKYCStatus();

      if (!data.success) {
        throw new Error(data.error || 'Status check failed');
      }

      if (data.updated) {
        toast({
          title: 'Status Updated',
          description: `Your verification status has been updated to: ${data.status}`,
        });
      } else {
        toast({
          title: 'Status Checked',
          description: `Current status: ${data.status}. No changes detected.`,
        });
      }

      await fetchKYCStatus();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      toast({
        title: 'Status Check Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCheckingStatus(false);
    }
  }, [toast, fetchKYCStatus]);

  /**
   * Check KILT verification status by re-fetching profile from DB
   * Minimal implementation — no blockchain verification (see note below)
   * 
   * Why not real KILT blockchain verification?
   * - On-chain attestation checking requires KILT node connection, DID resolution,
   *   and cryptographic proof verification (significant engineering effort)
   * - Sporran wallet dependency excludes mobile users
   * - KILT mainnet gas fees add operational cost
   * - Didit is the strategic primary provider (free, unlimited, no blockchain)
   * - Full KILT chain verification should be re-evaluated if/when KILT becomes
   *   a primary verification path
   */
  const checkKiltStatus = useCallback(async () => {
    try {
      setCheckingStatus(true);
      setError(null);

      await fetchKYCStatus();

      toast({
        title: 'Status Checked',
        description: 'Your verification status has been refreshed.',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);

      toast({
        title: 'Status Check Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCheckingStatus(false);
    }
  }, [toast, fetchKYCStatus]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchKYCStatus();
    }
  }, [autoFetch, fetchKYCStatus]);

  // Computed values
  const isVerified = isKYCVerified(kycProfile?.kycStatus);
  const isPending = isKYCPending(kycProfile?.kycStatus);
  const canInitiate = canInitiateKYC(kycProfile?.kycStatus);
  
  // If kycProvider is stored, resolve: 'didit' → didit, anything else → kilt
  const currentProvider: KYCProvider | null = kycProfile?.kycProvider
    ? (kycProfile.kycProvider === 'didit' ? 'didit' : 'kilt')
    : provider;

  return {
    // State
    kycProfile,
    loading,
    initiating,
    checkingStatus,
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
    checkDiditStatus,
    checkKiltStatus,
  };
}
