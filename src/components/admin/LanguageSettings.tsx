import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AVAILABLE_LANGUAGES } from '@/lib/i18n/languages.config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function LanguageSettings() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch subscription plans to check translation status
  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-translation-check"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, features_display")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('language_settings')
      .select('*');
    
    if (!error && data) {
      const map: Record<string, boolean> = {};
      data.forEach(item => {
        map[item.language_code] = item.is_enabled;
      });
      setSettings(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Calculate plans missing translations for each language
  const getPlansNeedingTranslation = (langCode: string) => {
    if (!plans) return 0;
    return plans.filter(plan => {
      const features = typeof plan.features_display === 'object' ? plan.features_display : {};
      return !(features as Record<string, string[]>)[langCode] || (features as Record<string, string[]>)[langCode].length === 0;
    }).length;
  };

  const toggleLanguage = async (code: string, enabled: boolean) => {
    const { error } = await supabase
      .from('language_settings')
      .update({ is_enabled: enabled })
      .eq('language_code', code);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update language setting",
        variant: "destructive",
      });
    } else {
      setSettings(prev => ({ ...prev, [code]: enabled }));
      
      // Show warning if enabling a language with missing translations
      if (enabled) {
        const missingCount = getPlansNeedingTranslation(code);
        if (missingCount > 0) {
          toast({
            title: "Language enabled",
            description: `${code.toUpperCase()} is enabled. ${missingCount} subscription plan(s) need translation in Plans tab.`,
          });
          return;
        }
      }
      
      toast({
        title: "Language updated",
        description: `${code.toUpperCase()} is now ${enabled ? 'enabled' : 'disabled'}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if any enabled language has missing translations
  const enabledLanguages = Object.entries(settings).filter(([_, enabled]) => enabled).map(([code]) => code);
  const languagesNeedingTranslation = enabledLanguages.filter(code => getPlansNeedingTranslation(code) > 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Available Languages</h3>
        <p className="text-sm text-muted-foreground">
          Control which languages appear in the language switcher. Disabled languages won't be visible to users.
        </p>
      </div>

      {languagesNeedingTranslation.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {languagesNeedingTranslation.length} enabled language(s) have subscription plans without translations ({languagesNeedingTranslation.join(', ').toUpperCase()}). 
            Go to <strong>Plans</strong> tab to add translations.
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Enabled</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Native Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Translation Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {AVAILABLE_LANGUAGES.map((lang) => {
            const hasTranslation = ['en', 'es'].includes(lang.code);
            const plansNeedingTranslation = getPlansNeedingTranslation(lang.code);
            const isEnabled = settings[lang.code] ?? false;
            
            return (
              <TableRow key={lang.code}>
                <TableCell>
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={(checked) => 
                      toggleLanguage(lang.code, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <span className="mr-2">{lang.flag}</span>
                  {lang.label}
                </TableCell>
                <TableCell>{lang.nativeLabel}</TableCell>
                <TableCell className="font-mono text-sm">{lang.code}</TableCell>
                <TableCell>
                  {hasTranslation ? (
                    <span className="text-green-600 dark:text-green-400">✓ Complete</span>
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400">⚠ Pending (uses EN fallback)</span>
                  )}
                  {isEnabled && plansNeedingTranslation > 0 && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                      ({plansNeedingTranslation} plan{plansNeedingTranslation > 1 ? 's' : ''} need pricing translations)
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
