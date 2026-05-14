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

export type KYCProvider = 'kilt' | 'openapi' | 'didit';
export type OpenAPIVerificationLevel = 'basic' | 'advanced' | 'expert';

interface UseKYCOptions {
  autoFetch?: boolean;
  provider?: KYCProvider;
  verificationLevel?: OpenAPIVerificationLevel;
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
  initiateVerification: (provider?: KYCProvider, level?: OpenAPIVerificationLevel) => Promise<void>;
  cancelVerification: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  checkDiditStatus: () => Promise<void>;
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
    provider = 'didit', // Default to Didit (free)
    verificationLevel = 'basic',
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

      // Get authenticated user
      const user = await authService.getCurrentUser();
      
      if (!user) {
        throw new Error(t('kyc.errors.notAuthenticated'));
      }

      // Fetch KYC profile data using profileService
      const profile = await profileService.getProfile(user.id);

      if (!profile) {
        throw new Error(t('kyc.errors.profileNotFound'));
      }

      // Set validated profile
      setKycProfile(profile);

      // Call completion callback if verified
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
      if (kycProfile && !canInitiateKYC(kycProfile.kycStatus)) {
        throw new Error(t('kyc.errors.cannotInitiate'));
      }

      let functionData;

      if (selectedProvider === 'kilt') {
        functionData = await identityService.initiateKiltKYC();
      } else if (selectedProvider === 'didit') {
        functionData = await identityService.initiateDiditKYC();
      } else {
        functionData = await identityService.initiateOpenAPIKYC(level);
      }

      // Validate response
      const validatedResponse = KYCInitiationResponseSchema.parse(functionData);

      if (!validatedResponse.success) {
        throw new Error(validatedResponse.error || validatedResponse.message || t('kyc.errors.initiationFailed'));
      }

      // Success - show appropriate message
      const providerName = selectedProvider === 'kilt' 
        ? 'KILT Protocol' 
        : selectedProvider === 'didit'
        ? 'Didit.me'
        : `OpenAPI (${level})`;
      toast({
        title: t('kyc.success.initiatedTitle'),
        description: `${providerName}: ${t('kyc.success.initiatedDescription')}`,
      });

      // Refresh status to get QR code
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
  }, [kycProfile, provider, verificationLevel, toast, t, fetchKYCStatus, onVerificationFailed]);

  /**
   * Cancel ongoing verification and reset to not_started
   */
  const cancelVerification = useCallback(async () => {
    try {
      setError(null);

      // Get authenticated user
      const user = await authService.getCurrentUser();
      
      if (!user) {
        throw new Error(t('kyc.errors.notAuthenticated'));
      }

      // Reset KYC status in database using profileService
      await profileService.updateKycData(user.id, { kycStatus: 'not_started' });

      // Refresh status to update UI
      await fetchKYCStatus();
      
      // Call cancel callback
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

      // Refresh the profile to get updated data
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
  
  // Extract current provider from kyc_status field (fallback to options if not available)
  const currentProvider: KYCProvider | null = kycProfile?.kycStatus
    ? (kycProfile.kycStatus === 'didit' 
        ? 'didit' 
        : kycProfile.kycStatus.startsWith('openapi_') 
        ? 'openapi' 
        : 'kilt')
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
  };
}
