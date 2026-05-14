import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  getSessionId, 
  getDeviceType, 
  trackPageView as svcTrackPageView, 
  trackEvent as svcTrackEvent, 
  trackNavigation as svcTrackNavigation, 
  initializeSession as svcInitializeSession 
} from '@/services/analyticsService';

export const useAnalytics = () => {
  const location = useLocation();
  const sessionId = getSessionId();

  const trackPageView = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceType = getDeviceType();
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;
      const pageTitle = document.title;

      await svcTrackPageView({
        userId: user?.id || null,
        sessionId,
        path: location.pathname,
        title: pageTitle,
        referrer: referrer || null,
        userAgent,
        deviceType,
      });
    } catch (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  }, [location.pathname, sessionId]);

  const trackEvent = useCallback(async ({ 
    event_name, 
    event_category, 
    event_metadata 
  }: { event_name: string; event_category?: string; event_metadata?: Record<string, any> }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await svcTrackEvent({
        userId: user?.id || null,
        sessionId,
        eventName: event_name,
        eventCategory: event_category,
        eventMetadata: event_metadata,
        pagePath: location.pathname,
      });
      
      console.log('[Analytics] Event tracked:', event_name);
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }, [sessionId, location.pathname]);

  const trackNavigation = useCallback(async (fromPath: string, toPath: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await svcTrackNavigation({
        userId: user?.id || null,
        sessionId,
        fromPath,
        toPath,
      });
      
      console.log('[Analytics] Navigation tracked:', fromPath, '->', toPath);
    } catch (error) {
      console.error('[Analytics] Error tracking navigation:', error);
    }
  }, [sessionId]);

  const initializeSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await svcInitializeSession(user?.id || null);
      
      console.log('[Analytics] Session initialized:', sessionId);
    } catch (error) {
      console.error('[Analytics] Error initializing session:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  return {
    trackPageView,
    trackEvent,
    trackNavigation,
    initializeSession,
    sessionId,
  };
};
