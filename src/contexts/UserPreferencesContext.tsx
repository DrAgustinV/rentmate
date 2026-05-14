import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authService } from '@/services';
import { supabase } from '@/integrations/supabase/client';

export interface UserPreferences {
  theme_mode: 'light' | 'dark' | 'system';
  font_size: 'sm' | 'md' | 'lg';
  date_format: string;
  language: string;
  week_start_day: 'monday' | 'sunday';
  cookie_consent_analytics: boolean;
  cookie_consent_given_at: string | null;
}

export interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const getDefaultPreferences = (): UserPreferences => ({
  theme_mode: 'system',
  font_size: 'md',
  date_format: 'PPP',
  language: 'en',
  week_start_day: 'monday',
  cookie_consent_analytics: false,
  cookie_consent_given_at: null,
});

const getCachedPreferences = (): UserPreferences => {
  const cached = localStorage.getItem('user-preferences');
  if (cached) {
    try {
      return { ...getDefaultPreferences(), ...JSON.parse(cached) };
    } catch {
      return getDefaultPreferences();
    }
  }
  return getDefaultPreferences();
};

export const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(getCachedPreferences);
  const [loading, setLoading] = useState(false);

  const updatePreferences = useCallback(async (newPrefs: Partial<UserPreferences>) => {
    const updatedPrefs = { ...preferences, ...newPrefs } as UserPreferences;
    setPreferences(updatedPrefs);
    localStorage.setItem('user-preferences', JSON.stringify(updatedPrefs));

    const session = await authService.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          ...updatedPrefs,
        }, { onConflict: 'user_id' });
      if (error) console.error('Error saving preferences:', error);
    }
  }, [preferences]);

  useEffect(() => {
    const loadPreferencesFromDB = async () => {
      const session = await authService.getSession();
      if (!session?.user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading preferences from DB:', error);
          return;
        }

        if (data) {
          const dbPrefs: UserPreferences = {
            theme_mode: (data.theme_mode as 'light' | 'dark' | 'system') || 'system',
            font_size: (data.font_size as 'sm' | 'md' | 'lg') || 'md',
            date_format: data.date_format || 'PPP',
            language: data.language || 'en',
            week_start_day: (data.week_start_day as 'monday' | 'sunday') || 'monday',
            cookie_consent_analytics: data.cookie_consent_analytics || false,
            cookie_consent_given_at: data.cookie_consent_given_at || null,
          };

          const cachedPrefs = getCachedPreferences();
          const mergedPrefs = { ...cachedPrefs, ...dbPrefs };

          setPreferences(mergedPrefs);
          localStorage.setItem('user-preferences', JSON.stringify(mergedPrefs));
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferencesFromDB();
  }, []);

  return (
    <UserPreferencesContext.Provider value={{ preferences, loading, updatePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};