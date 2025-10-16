import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AVAILABLE_LANGUAGES } from '@/lib/i18n/languages.config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export function LanguageSettings() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      toast({
        title: "Language updated",
        description: `${code.toUpperCase()} is now ${enabled ? 'enabled' : 'disabled'}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Available Languages</h3>
        <p className="text-sm text-muted-foreground">
          Control which languages appear in the language switcher. Disabled languages won't be visible to users.
        </p>
      </div>

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
            return (
              <TableRow key={lang.code}>
                <TableCell>
                  <Checkbox
                    checked={settings[lang.code] ?? false}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
