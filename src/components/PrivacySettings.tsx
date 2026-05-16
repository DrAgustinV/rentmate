import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { showToast } from "@/lib/toast";

interface ConsentRecord {
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  withdrawn_at: string | null;
}

export function PrivacySettings() {
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([]);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Load current consents
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setConsentHistory(data || []);

      // Set current states
      const analyticsRecord = data?.find(c => c.consent_type === 'analytics');
      const marketingRecord = data?.find(c => c.consent_type === 'marketing');

      setAnalyticsConsent(analyticsRecord?.granted || false);
      setMarketingConsent(marketingRecord?.granted || false);
    } catch (error: any) {
      console.error('Error loading consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const anonymizeIP = (ip: string): string => {
    // Anonymize last octet for IPv4, last 80 bits for IPv6
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return ip; // For IPv6, just store as-is (could enhance this)
  };

  const updateConsent = async (consentType: 'analytics' | 'marketing', granted: boolean) => {
    setSaving(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Get anonymized IP (in production, you'd call an edge function for this)
      const ipAddress = 'anonymized'; // Placeholder

      const now = new Date().toISOString();
      const consentData = {
        user_id: user.id,
        consent_type: consentType,
        granted,
        granted_at: granted ? now : null,
        withdrawn_at: !granted ? now : null,
        ip_address: ipAddress,
        user_agent: navigator.userAgent.substring(0, 200), // Truncate for privacy
      };

      const { error } = await supabase
        .from('user_consents')
        .upsert(consentData, {
          onConflict: 'user_id,consent_type',
        });

      if (error) throw error;

      // Update localStorage for immediate effect
      if (consentType === 'analytics') {
        localStorage.setItem('cookie-consent-analytics', granted.toString());
        localStorage.setItem('cookie-consent-decision', granted ? 'accepted' : 'rejected');
      }

      await loadConsents();

      showToast.success("Consent Updated", `Your ${consentType} consent has been ${granted ? 'granted' : 'withdrawn'}.`);

      // Changes take effect immediately via localStorage
      if (consentType === 'analytics') {
        showToast.info("Analytics Consent Updated", "Changes have been saved. Reload the page to fully apply tracking changes.");
      }
    } catch (error: any) {
      showToast.error("Update Failed", error.message);
      
      // Revert state on error
      if (consentType === 'analytics') {
        setAnalyticsConsent(!granted);
      } else {
        setMarketingConsent(!granted);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading privacy settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Consent Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Management</CardTitle>
          <CardDescription>
            Control how your data is used. You can change these settings at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analytics Consent */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="analytics-consent" className="text-base font-medium">
                Analytics Cookies
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow us to collect anonymous usage data to improve your experience. 
                We anonymize your IP address and respect "Do Not Track" browser settings.
              </p>
            </div>
            <Switch
              id="analytics-consent"
              checked={analyticsConsent}
              onCheckedChange={(checked) => {
                setAnalyticsConsent(checked);
                updateConsent('analytics', checked);
              }}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Marketing Consent */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="marketing-consent" className="text-base font-medium">
                Marketing Communications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features, tips, and special offers. 
                (Currently not active - future feature)
              </p>
            </div>
            <Switch
              id="marketing-consent"
              checked={marketingConsent}
              onCheckedChange={(checked) => {
                setMarketingConsent(checked);
                updateConsent('marketing', checked);
              }}
              disabled={saving}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Essential cookies required for site functionality cannot be disabled. 
              These include authentication, security, and session management cookies.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Consent History */}
      <Card>
        <CardHeader>
          <CardTitle>Consent History</CardTitle>
          <CardDescription>
            A log of all your consent decisions for transparency and compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {consentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No consent history yet. Toggle settings above to create records.
            </p>
          ) : (
            <div className="space-y-3">
              {consentHistory.map((record, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 bg-muted/30 rounded-lg text-sm"
                >
                  <div className="flex items-start gap-3">
                    {record.granted ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium capitalize">
                        {record.consent_type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.granted ? 'Granted' : 'Withdrawn'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(
                        record.granted ? record.granted_at! : record.withdrawn_at!
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Do Not Track Status */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Privacy Settings</CardTitle>
          <CardDescription>
            We respect your browser's "Do Not Track" (DNT) setting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {navigator.doNotTrack === '1' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Do Not Track is ENABLED</p>
                  <p className="text-xs text-muted-foreground">
                    We will not track your activity even if analytics consent is granted.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Do Not Track is DISABLED</p>
                  <p className="text-xs text-muted-foreground">
                    Analytics will be tracked based on your consent settings above.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
