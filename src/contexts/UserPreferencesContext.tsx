import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services';

export interface UserPreferences {
  theme_mode: 'light' | 'dark' | 'system';
  font_size: 'sm' | 'md' | 'lg';
  date_format: string;
  language: string;
  week_start_day: 'sunday' | 'monday';
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
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

// Load cached preferences synchronously to avoid flash
const getCachedPreferences = (): UserPreferences => {
  try {
    const cached = localStorage.getItem('user-preferences');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore parse errors
  }
  return defaultPreferences;
};

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with cached preferences immediately - no blocking
  const [preferences, setPreferences] = useState<UserPreferences>(getCachedPreferences);
  const [loading, setLoading] = useState(false); // Start false - we have cached data

  const loadPreferencesFromDB = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
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
      }
    } catch (error) {
      console.error('Error loading preferences from DB:', error);
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updatedPrefs = { ...preferences, ...newPrefs } as UserPreferences;
    
    // Always update state and localStorage first
    setPreferences(updatedPrefs);
    localStorage.setItem('user-preferences', JSON.stringify(updatedPrefs));
    
    // Try to save to database if authenticated (use getSession for cache)
    const session = await authService.getSession();
    if (session?.user) {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
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
      }
    }
  };

  useEffect(() => {
    // Check session and load DB preferences in background (non-blocking)
    const init = async () => {
      const session = await authService.getSession();
      if (session?.user) {
        loadPreferencesFromDB(session.user.id);
      }
    };
    init();

    // Listen for auth changes
    const subscription = authService.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Defer DB fetch to avoid auth deadlock
        setTimeout(() => {
          loadPreferencesFromDB(session.user.id);
        }, 0);
      }
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
