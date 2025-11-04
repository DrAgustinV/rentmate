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
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.role || 'user';
};

export const useAnalytics = () => {
  const location = useLocation();
  const sessionId = getSessionId();

  // Track page view
  const trackPageView = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceType = getDeviceType();
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;
      const pageTitle = document.title;

      // Insert page view and get the ID
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
          ip_address: null,
          country: null,
          region: null,
          city: null,
        })
        .select('id')
        .single();

      if (insertError || !pageView) {
        console.error('Error inserting page view:', insertError);
        return;
      }

      // Fetch geolocation in the background (don't await)
      supabase.functions
        .invoke('get-geolocation', {
          body: { ip: 'auto' }, // Edge function will extract real IP
        })
        .then(({ data: geoData, error: geoError }) => {
          if (!geoError && geoData) {
            // Update the page view with geolocation data
            supabase
              .from('analytics_page_views')
              .update({
                country: geoData.country,
                region: geoData.region,
                city: geoData.city,
              })
              .eq('id', pageView.id)
              .then(() => {
                console.log('Geolocation updated:', geoData);
              });
          }
        })
        .catch((err) => {
          console.error('Geolocation fetch failed:', err);
        });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }, [location.pathname, sessionId]);

  // Track custom event
  const trackEvent = useCallback(async ({ 
    event_name, 
    event_category, 
    event_metadata 
  }: AnalyticsEvent) => {
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
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [location.pathname, sessionId]);

  // Track navigation
  const trackNavigation = useCallback(async (fromPath: string, toPath: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('analytics_navigation_paths').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        from_path: fromPath,
        to_path: toPath,
        breadcrumb_trail: null, // Could be enhanced to track full breadcrumb
      });
    } catch (error) {
      console.error('Error tracking navigation:', error);
    }
  }, [sessionId]);

  // Initialize or update session
  const initializeSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user ? await getUserRole(user.id) : null;

      // Check if session exists
      const { data: existingSession } = await supabase
        .from('analytics_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      if (!existingSession) {
        // Create new session
        await supabase.from('analytics_sessions').insert({
          session_id: sessionId,
          user_id: user?.id || null,
          is_authenticated: !!user,
          user_role: userRole,
          subscription_tier: 'free', // TODO: Get from user subscription
        });
      } else {
        // Update existing session
        await supabase
          .from('analytics_sessions')
          .update({
            user_id: user?.id || null,
            is_authenticated: !!user,
            user_role: userRole,
          })
          .eq('session_id', sessionId);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }, [sessionId]);

  // Track page view on location change
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  return {
    trackEvent,
    trackPageView,
    trackNavigation,
    initializeSession,
    sessionId,
  };
};
