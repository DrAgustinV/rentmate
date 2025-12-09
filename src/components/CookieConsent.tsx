import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Cookie } from "lucide-react";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const { preferences, updatePreferences } = useUserPreferences();
  const { t } = useLanguage();

  useEffect(() => {
    // Check localStorage for consent decision
    const consentGiven = localStorage.getItem('cookie-consent-decision');
    
    // Show banner if no decision has been made
    if (!consentGiven) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = async () => {
    // Store consent in localStorage
    localStorage.setItem('cookie-consent-decision', 'accepted');
    localStorage.setItem('cookie-consent-analytics', 'true');
    
    // Try to store in database if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Update user_preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          cookie_consent_analytics: true,
          cookie_consent_given_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
      
      // Store in user_consents table for GDPR compliance
      await supabase
        .from('user_consents')
        .upsert({
          user_id: user.id,
          consent_type: 'analytics',
          granted: true,
          granted_at: new Date().toISOString(),
          withdrawn_at: null,
          user_agent: navigator.userAgent.substring(0, 200),
        }, {
          onConflict: 'user_id,consent_type'
        });
    }
    
    setShowBanner(false);
    
    // Reload to enable analytics
    window.location.reload();
  };

  const handleReject = async () => {
    // Store rejection in localStorage
    localStorage.setItem('cookie-consent-decision', 'rejected');
    localStorage.setItem('cookie-consent-analytics', 'false');
    
    // Try to store in database if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Update user_preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          cookie_consent_analytics: false,
          cookie_consent_given_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
      
      // Store in user_consents table for GDPR compliance
      await supabase
        .from('user_consents')
        .upsert({
          user_id: user.id,
          consent_type: 'analytics',
          granted: false,
          granted_at: null,
          withdrawn_at: new Date().toISOString(),
          user_agent: navigator.userAgent.substring(0, 200),
        }, {
          onConflict: 'user_id,consent_type'
        });
    }
    
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom-5">
      <Card className="max-w-4xl mx-auto p-6 shadow-2xl border-2">
        <div className="flex items-start gap-4">
          <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">
              {t('common.cookieConsent')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('common.cookieMessage')}
              {' '}
              <a href="/privacy" className="text-primary hover:underline">
                {t('privacy.title')}
              </a>
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAccept} size="sm">
                {t('common.acceptAll')}
              </Button>
              <Button onClick={handleReject} variant="outline" size="sm">
                {t('common.rejectNonEssential')}
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={handleReject}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
