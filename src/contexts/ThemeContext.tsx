import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setUserDateFormat } from '@/lib/dateUtils';
import { toast } from '@/hooks/use-toast';

interface UserPreferences {
  theme_mode: 'light' | 'dark' | 'system';
  primary_color: string;
  accent_color: string;
  font_size: 'sm' | 'md' | 'lg';
  date_format: string;
}

interface ThemeContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  updateTheme: (prefs: Partial<UserPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultPreferences: UserPreferences = {
  theme_mode: 'system',
  primary_color: '221 83% 53%',
  accent_color: '199 89% 48%',
  font_size: 'md',
  date_format: 'PPP',
};

const fontSizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = (prefs: UserPreferences) => {
    // Determine effective theme
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectiveTheme = prefs.theme_mode === 'system' 
      ? (systemPrefersDark ? 'dark' : 'light')
      : prefs.theme_mode;
    
    // Apply dark mode class
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    
    // Apply custom colors
    document.documentElement.style.setProperty('--primary', prefs.primary_color);
    document.documentElement.style.setProperty('--accent', prefs.accent_color);
    
    // Apply font size
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
    document.documentElement.classList.add(fontSizeMap[prefs.font_size]);
    
    // Apply date format
    setUserDateFormat(prefs.date_format);
    
    // Store in localStorage for quick load
    localStorage.setItem('user-preferences', JSON.stringify(prefs));
  };

  const loadPreferences = async () => {
    try {
      // Load from localStorage immediately to prevent flash
      const cached = localStorage.getItem('user-preferences');
      if (cached) {
        const cachedPrefs = JSON.parse(cached);
        applyTheme(cachedPrefs);
        setPreferences(cachedPrefs);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const prefs: UserPreferences = {
          theme_mode: data.theme_mode as 'light' | 'dark' | 'system',
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          font_size: data.font_size as 'sm' | 'md' | 'lg',
          date_format: data.date_format,
        };
        applyTheme(prefs);
        setPreferences(prefs);
      } else {
        // No preferences yet, use defaults
        applyTheme(defaultPreferences);
        setPreferences(defaultPreferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      applyTheme(defaultPreferences);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (newPrefs: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updatedPrefs = { ...preferences, ...newPrefs } as UserPreferences;

      // Save to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme_mode: updatedPrefs.theme_mode,
          primary_color: updatedPrefs.primary_color,
          accent_color: updatedPrefs.accent_color,
          font_size: updatedPrefs.font_size,
          date_format: updatedPrefs.date_format,
        });

      if (error) throw error;

      // Apply immediately
      applyTheme(updatedPrefs);
      setPreferences(updatedPrefs);

      toast({
        title: 'Preferences saved',
        description: 'Your appearance settings have been updated.',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences.',
        variant: 'destructive',
      });
    }
  };

  const resetToDefaults = async () => {
    await updateTheme(defaultPreferences);
  };

  useEffect(() => {
    loadPreferences();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (preferences?.theme_mode === 'system') {
        applyTheme(preferences);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPreferences();
    });

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ preferences, loading, updateTheme, resetToDefaults }}>
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
