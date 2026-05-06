import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

// ===================
// Type Definitions
// ===================

export type EventCategory = 
  | 'navigation'
  | 'interaction'
  | 'conversion'
  | 'error'
  | 'performance'
  | 'subscription'
  | 'kyc'
  | 'payment'
  | 'signature'
  | 'custom';

export interface AnalyticsEvent {
  eventName: string;
  category?: EventCategory;
  metadata?: Record<string, unknown>;
}

export interface PageViewEvent {
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
}

export interface ConversionEvent {
  goalId: string;
  value?: number;
  currency?: string;
}

export interface ErrorEvent {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  componentStack?: string;
}

export interface PerformanceEvent {
  metricName: string;
  value: number;
  unit?: string;
}

interface AnalyticsContextType {
  // Core tracking
  trackEvent: (params: AnalyticsEvent) => Promise<void>;
  trackPageView: (params?: PageViewEvent) => Promise<void>;
  trackConversion: (params: ConversionEvent) => Promise<void>;
  trackError: (params: ErrorEvent) => Promise<void>;
  trackPerformance: (params: PerformanceEvent) => Promise<void>;
  
  // Convenience methods
  trackUserAction: (action: string, target?: string, metadata?: Record<string, unknown>) => Promise<void>;
  trackSubscriptionChange: (plan: string, status: string) => Promise<void>;
  trackKYCVerification: (provider: string, status: string) => Promise<void>;
  trackPaymentFlow: (flow: string, amount?: number) => Promise<void>;
  trackSignatureRequest: (provider: string, status: string) => Promise<void>;
  
  // Session info
  sessionId: string;
  isTrackingEnabled: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
};

// ===================
// Provider Component
// ===================

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const location = useLocation();
  const { trackEvent: baseTrackEvent, trackNavigation, initializeSession, sessionId } = useAnalytics();
  const [previousPath, setPreviousPath] = useState<string>(location.pathname);

  // Centralized tracking enabled check
  const isTrackingEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    // Check Do Not Track
    if (navigator.doNotTrack === '1' || (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack === '1') {
      return false;
    }
    
    // Check consent
    const consentDecision = localStorage.getItem('cookie-consent-decision');
    const analyticsConsent = localStorage.getItem('cookie-consent-analytics');
    
    return consentDecision === 'accepted' && analyticsConsent === 'true';
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Track navigation changes
  useEffect(() => {
    if (previousPath !== location.pathname) {
      trackNavigation(previousPath, location.pathname);
      setPreviousPath(location.pathname);
    }
  }, [location.pathname, previousPath, trackNavigation]);

  // Core track event
  const trackEvent = useCallback(async ({ eventName, category = 'custom', metadata }: AnalyticsEvent) => {
    if (!isTrackingEnabled) return;
    
    await baseTrackEvent({
      event_name: eventName,
      event_category: category,
      event_metadata: metadata,
    });
  }, [baseTrackEvent, isTrackingEnabled]);

  // Track page view
  const trackPageView = useCallback(async (params?: PageViewEvent) => {
    if (!isTrackingEnabled) return;
    
    await trackEvent({
      eventName: params?.pagePath || location.pathname,
      category: 'navigation',
      metadata: {
        pageTitle: params?.pageTitle || document.title,
        referrer: params?.referrer || document.referrer,
      },
    });
  }, [trackEvent, isTrackingEnabled, location.pathname]);

  // Track conversion
  const trackConversion = useCallback(async ({ goalId, value, currency }: ConversionEvent) => {
    if (!isTrackingEnabled) return;
    
    await trackEvent({
      eventName: `conversion_${goalId}`,
      category: 'conversion',
      metadata: { value, currency },
    });
  }, [trackEvent, isTrackingEnabled]);

  // Track error
  const trackError = useCallback(async ({ errorType, errorMessage, stackTrace, componentStack }: ErrorEvent) => {
    if (!isTrackingEnabled) return;
    
    await trackEvent({
      eventName: errorType,
      category: 'error',
      metadata: {
        message: errorMessage,
        stackTrace,
        componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    });
  }, [trackEvent, isTrackingEnabled]);

  // Track performance
  const trackPerformance = useCallback(async ({ metricName, value, unit = 'ms' }: PerformanceEvent) => {
    if (!isTrackingEnabled) return;
    
    await trackEvent({
      eventName: `perf_${metricName}`,
      category: 'performance',
      metadata: { value, unit },
    });
  }, [trackEvent, isTrackingEnabled]);

  // Convenience: Track user action
  const trackUserAction = useCallback(async (
    action: string,
    target?: string,
    metadata?: Record<string, unknown>
  ) => {
    await trackEvent({
      eventName: action,
      category: 'interaction',
      metadata: { target, ...metadata },
    });
  }, [trackEvent]);

  // Convenience: Track subscription changes
  const trackSubscriptionChange = useCallback(async (plan: string, status: string) => {
    await trackEvent({
      eventName: `subscription_${status}`,
      category: 'subscription',
      metadata: { plan, status },
    });
  }, [trackEvent]);

  // Convenience: Track KYC verification
  const trackKYCVerification = useCallback(async (provider: string, status: string) => {
    await trackEvent({
      eventName: `kyc_${status}`,
      category: 'kyc',
      metadata: { provider, status },
    });
  }, [trackEvent]);

  // Convenience: Track payment flow
  const trackPaymentFlow = useCallback(async (flow: string, amount?: number) => {
    await trackEvent({
      eventName: `payment_${flow}`,
      category: 'payment',
      metadata: { flow, amount },
    });
  }, [trackEvent]);

  // Convenience: Track signature requests
  const trackSignatureRequest = useCallback(async (provider: string, status: string) => {
    await trackEvent({
      eventName: `signature_${status}`,
      category: 'signature',
      metadata: { provider, status },
    });
  }, [trackEvent]);

  const value = useMemo(() => ({
    trackEvent,
    trackPageView,
    trackConversion,
    trackError,
    trackPerformance,
    trackUserAction,
    trackSubscriptionChange,
    trackKYCVerification,
    trackPaymentFlow,
    trackSignatureRequest,
    sessionId,
    isTrackingEnabled,
  }), [
    trackEvent,
    trackPageView,
    trackConversion,
    trackError,
    trackPerformance,
    trackUserAction,
    trackSubscriptionChange,
    trackKYCVerification,
    trackPaymentFlow,
    trackSignatureRequest,
    sessionId,
    isTrackingEnabled,
  ]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};
