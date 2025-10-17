import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsContextType {
  trackEvent: (params: {
    event_name: string;
    event_category?: string;
    event_metadata?: Record<string, any>;
  }) => Promise<void>;
  sessionId: string;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const location = useLocation();
  const { trackEvent, trackNavigation, initializeSession, sessionId } = useAnalytics();
  const [previousPath, setPreviousPath] = useState<string>(location.pathname);

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

  return (
    <AnalyticsContext.Provider value={{ trackEvent, sessionId }}>
      {children}
    </AnalyticsContext.Provider>
  );
};
