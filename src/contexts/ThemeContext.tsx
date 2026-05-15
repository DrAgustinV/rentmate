import { createContext, useContext, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { setUserDateFormat, setUserLocale } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { useUserPreferences, UserPreferences } from './UserPreferencesContext';

interface ThemeContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  updateTheme: (prefs: Partial<UserPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const fontSizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { preferences, loading, updatePreferences } = useUserPreferences();

  const applyTheme = useCallback((prefs: UserPreferences) => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectiveTheme = prefs.theme_mode === 'system'
      ? (systemPrefersDark ? 'dark' : 'light')
      : prefs.theme_mode;

    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');

    const fontSizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
    document.documentElement.classList.add(fontSizeMap[prefs.font_size]);

    setUserDateFormat(prefs.date_format);
    setUserLocale(prefs.language || 'en');
  }, []);

  const updateTheme = useCallback(async (newPrefs: Partial<UserPreferences>) => {
    try {
      await updatePreferences(newPrefs);
      const updatedPrefs = { ...preferences, ...newPrefs } as UserPreferences;
      applyTheme(updatedPrefs);

      toast.success('Preferences saved', {
        description: 'Your appearance settings have been updated.',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to save preferences', {
        description: 'Error updating your preferences.',
      });
    }
  }, [preferences, updatePreferences, applyTheme]);

  const resetToDefaults = useCallback(async () => {
    const defaults = {
      theme_mode: 'system' as const,
      font_size: 'md' as const,
      date_format: 'PPP',
      language: 'en',
      week_start_day: 'monday' as const,
    };
    await updateTheme(defaults);
  }, [updateTheme]);

  useEffect(() => {
    if (preferences) {
      applyTheme(preferences);
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (preferences?.theme_mode === 'system') {
        applyTheme(preferences);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [preferences, applyTheme]);

  const value = useMemo<ThemeContextType>(() => ({
    preferences,
    loading,
    updateTheme,
    resetToDefaults,
  }), [preferences, loading, updateTheme, resetToDefaults]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
