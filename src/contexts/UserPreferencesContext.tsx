import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserPreferences {
  theme_mode: 'light' | 'dark' | 'system';
  font_size: 'sm' | 'md' | 'lg';
  date_format: string;
  language: string;
  week_start_day: 'sunday' | 'monday';
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const defaultPreferences: UserPreferences = {
  theme_mode: 'system',
  font_size: 'md',
  date_format: 'PPP',
  language: 'en',
  week_start_day: 'monday',
};

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPreferences = async () => {
    try {
      // Load from localStorage immediately
      const cached = localStorage.getItem('user-preferences');
      if (cached) {
        setPreferences(JSON.parse(cached));
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPreferences(defaultPreferences);
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
          font_size: data.font_size as 'sm' | 'md' | 'lg',
          date_format: data.date_format,
          language: data.language || 'en',
          week_start_day: (data.week_start_day as 'sunday' | 'monday') || 'monday',
        };
        setPreferences(prefs);
        localStorage.setItem('user-preferences', JSON.stringify(prefs));
      } else {
        setPreferences(defaultPreferences);
        localStorage.setItem('user-preferences', JSON.stringify(defaultPreferences));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updatedPrefs = { ...preferences, ...newPrefs } as UserPreferences;
    
    // Always update state and localStorage first
    setPreferences(updatedPrefs);
    localStorage.setItem('user-preferences', JSON.stringify(updatedPrefs));
    
    // Try to save to database if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme_mode: updatedPrefs.theme_mode,
          font_size: updatedPrefs.font_size,
          date_format: updatedPrefs.date_format,
          language: updatedPrefs.language,
          week_start_day: updatedPrefs.week_start_day,
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error('Error saving preferences:', error);
        // Don't throw - preferences are still saved locally
      }
    }
    // If not authenticated, preferences are only saved in localStorage
  };

  useEffect(() => {
    loadPreferences();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPreferences();
    });

    return () => {
      subscription.unsubscribe();
    };
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
