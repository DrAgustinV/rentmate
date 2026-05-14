import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS, BREAKPOINTS } from '@/constants';

// Pure utility functions
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(ANALYTICS.SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem(ANALYTICS.SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width <= BREAKPOINTS.MOBILE_MAX) return 'mobile';
  if (width <= BREAKPOINTS.TABLET_MAX) return 'tablet';
  return 'desktop';
}

export function hasAnalyticsConsent(): boolean {
  if (navigator.doNotTrack === '1' || (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack === '1') {
    console.log('[Analytics] Tracking blocked: Do Not Track is enabled');
    return false;
  }

  const consentDecision = localStorage.getItem('cookie-consent-decision');
  const analyticsConsent = localStorage.getItem('cookie-consent-analytics');
  
  const hasConsent = consentDecision === 'accepted' && analyticsConsent === 'true';
  
  if (!hasConsent) {
    console.log('[Analytics] Tracking blocked: No user consent');
  }
  
  return hasConsent;
}

export function anonymizeIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  return ip;
}

// Supabase-backed operations
export async function initializeSession(userId: string | null): Promise<string> {
  const sessionId = getSessionId();
  
  if (!hasAnalyticsConsent()) {
    return sessionId;
  }

  const { data: existingSession } = await supabase
    .from('analytics_sessions')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existingSession) {
    return sessionId;
  }

  let userRole = null;
  let subscriptionTier = null;

  if (userId) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    userRole = roleData?.role || null;

    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('subscription_type')
      .eq('user_id', userId)
      .maybeSingle();
    subscriptionTier = subData?.subscription_type || 'free';
  }

  await supabase.from('analytics_sessions').insert({
    session_id: sessionId,
    user_id: userId,
    is_authenticated: !!userId,
    user_role: userRole,
    subscription_tier: subscriptionTier,
    started_at: new Date().toISOString(),
  });

  return sessionId;
}

export async function trackPageView(params: {
  userId: string | null;
  sessionId: string;
  path: string;
  title: string;
  referrer: string | null;
  userAgent: string;
  deviceType: string;
}): Promise<void> {
  if (!hasAnalyticsConsent()) return;

  const { data: pageView, error: insertError } = await supabase
    .from('analytics_page_views')
    .insert({
      user_id: params.userId,
      session_id: params.sessionId,
      page_path: params.path,
      page_title: params.title,
      referrer: params.referrer,
      user_agent: params.userAgent,
      device_type: params.deviceType,
      ip_address: null,
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

  // Fire-and-forget geolocation update
  supabase.functions
    .invoke('get-geolocation', {
      body: { ip: 'auto' },
    })
    .then(({ data: geoData, error: geoError }) => {
      if (!geoError && geoData) {
        supabase
          .from('analytics_page_views')
          .update({
            ip_address: geoData.ip ? anonymizeIP(geoData.ip) : null,
            country: geoData.country,
            region: geoData.region,
            city: geoData.city,
          })
          .eq('id', pageView.id);
      }
    })
    .catch((err) => {
      console.error('[Analytics] Geolocation fetch failed:', err);
    });
}

export async function trackEvent(params: {
  userId: string | null;
  sessionId: string;
  eventName: string;
  eventCategory?: string;
  eventMetadata?: Record<string, unknown>;
  pagePath: string;
}): Promise<void> {
  if (!hasAnalyticsConsent()) return;

  await supabase.from('analytics_events').insert({
    user_id: params.userId,
    session_id: params.sessionId,
    event_name: params.eventName,
    event_category: params.eventCategory || null,
    event_metadata: params.eventMetadata || null,
    page_path: params.pagePath,
  });
}

export async function trackNavigation(params: {
  userId: string | null;
  sessionId: string;
  fromPath: string;
  toPath: string;
}): Promise<void> {
  if (!hasAnalyticsConsent()) return;

  await supabase.from('analytics_navigation_paths').insert({
    user_id: params.userId,
    session_id: params.sessionId,
    from_path: params.fromPath,
    to_path: params.toPath,
  });
}
