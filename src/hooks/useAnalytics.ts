import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsEvent {
  event_name: string;
  event_category?: string;
  event_metadata?: Record<string, any>;
}

const SESSION_STORAGE_KEY = 'analytics_session_id';

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Get user role from user_roles table
const getUserRole = async (userId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return data?.role || 'user';
};

// Check if user has consented to analytics tracking (GDPR compliance)
const hasAnalyticsConsent = (): boolean => {
  // Check Do Not Track browser setting first (highest priority)
  if (navigator.doNotTrack === '1' || (navigator as any).msDoNotTrack === '1') {
    console.log('[Analytics] Tracking blocked: Do Not Track is enabled');
    return false;
  }

  // Check cookie consent from localStorage
  const consentDecision = localStorage.getItem('cookie-consent-decision');
  const analyticsConsent = localStorage.getItem('cookie-consent-analytics');
  
  const hasConsent = consentDecision === 'accepted' && analyticsConsent === 'true';
  
  if (!hasConsent) {
    console.log('[Analytics] Tracking blocked: No user consent');
  }
  
  return hasConsent;
};

// Anonymize IP address by masking last octet (IPv4)
const anonymizeIP = (ip: string): string => {
  const parts = ip.split('.');
  if (parts.length === 4) {
    // IPv4: mask last octet
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  // IPv6 or other: return as-is (could enhance with proper IPv6 anonymization)
  return ip;
};

export const useAnalytics = () => {
  const location = useLocation();
  const sessionId = getSessionId();

  // Track page view
  const trackPageView = useCallback(async () => {
    // Check consent before tracking
    if (!hasAnalyticsConsent()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceType = getDeviceType();
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;
      const pageTitle = document.title;

      // Insert page view (without IP initially)
      const { data: pageView, error: insertError } = await supabase
        .from('analytics_page_views')
        .insert({
          user_id: user?.id || null,
          session_id: sessionId,
          page_path: location.pathname,
          page_title: pageTitle,
          referrer: referrer || null,
          user_agent: userAgent,
          device_type: deviceType,
          ip_address: null, // Will be anonymized and updated later
          country: null,
          region: null,
          city: null,
        })
        .select('id')
        .single();

      if (insertError || !pageView) {
        console.error('[Analytics] Error inserting page view:', insertError);
        return;
      }

      // Fetch geolocation in the background (don't await)
      // The IP address will be anonymized on the server side
      supabase.functions
        .invoke('get-geolocation', {
          body: { ip: 'auto' }, // Edge function will extract and anonymize IP
        })
        .then(({ data: geoData, error: geoError }) => {
          if (!geoError && geoData) {
            // Update the page view with anonymized geolocation data
            supabase
              .from('analytics_page_views')
              .update({
                ip_address: geoData.ip ? anonymizeIP(geoData.ip) : null, // Extra anonymization layer
                country: geoData.country,
                region: geoData.region,
                city: geoData.city,
              })
              .eq('id', pageView.id)
              .then(() => {
                console.log('[Analytics] Geolocation updated (anonymized)');
              });
          }
        })
        .catch((err) => {
          console.error('[Analytics] Geolocation fetch failed:', err);
        });
    } catch (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  }, [location.pathname, sessionId]);

  // Track custom event
  const trackEvent = useCallback(async ({ 
    event_name, 
    event_category, 
    event_metadata 
  }: AnalyticsEvent) => {
    // Check consent before tracking
    if (!hasAnalyticsConsent()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('analytics_events').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        event_name,
        event_category: event_category || null,
        event_metadata: event_metadata || null,
        page_path: location.pathname,
      });
      
      console.log('[Analytics] Event tracked:', event_name);
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }, [sessionId, location.pathname]);

  // Track navigation
  const trackNavigation = useCallback(async (fromPath: string, toPath: string) => {
    // Check consent before tracking
    if (!hasAnalyticsConsent()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('analytics_navigation_paths').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        from_path: fromPath,
        to_path: toPath,
      });
      
      console.log('[Analytics] Navigation tracked:', fromPath, '->', toPath);
    } catch (error) {
      console.error('[Analytics] Error tracking navigation:', error);
    }
  }, [sessionId]);

  // Initialize session
  const initializeSession = useCallback(async () => {
    // Check consent before initializing session tracking
    if (!hasAnalyticsConsent()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('analytics_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingSession) {
        console.log('[Analytics] Session already initialized:', sessionId);
        return;
      }

      // Get user role if authenticated
      let userRole = null;
      let subscriptionTier = null;
      
      if (user) {
        userRole = await getUserRole(user.id);

        // Get subscription tier
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('subscription_type')
          .eq('user_id', user.id)
          .maybeSingle();
        
        subscriptionTier = subscription?.subscription_type || 'free';
      }

      await supabase.from('analytics_sessions').insert({
        session_id: sessionId,
        user_id: user?.id || null,
        is_authenticated: !!user,
        user_role: userRole,
        subscription_tier: subscriptionTier,
        started_at: new Date().toISOString(),
      });
      
      console.log('[Analytics] Session initialized:', sessionId);
    } catch (error) {
      console.error('[Analytics] Error initializing session:', error);
    }
  }, [sessionId]);

  // Track page view on location change
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
