import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLanguageSettings() {
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLanguages = async () => {
    const { data, error } = await supabase
      .from('language_settings')
      .select('language_code')
      .eq('is_enabled', true)
      .order('display_order');
    
    if (!error && data) {
      setEnabledLanguages(data.map(l => l.language_code));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLanguages();

    // Realtime subscription
    const subscription = supabase
      .channel('language_settings_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'language_settings' 
      }, () => {
        fetchLanguages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { enabledLanguages, loading };
}
