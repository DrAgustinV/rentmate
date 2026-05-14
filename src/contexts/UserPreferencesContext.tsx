// ... imports
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
// ... rest of imports

export const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(getCachedPreferences);
  const [loading, setLoading] = useState(false);

  // ✅ Stabilize updatePreferences to prevent unnecessary child re-renders
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

  // ... rest of your existing code (loadPreferencesFromDB, useEffect, etc.)

  return (
    <UserPreferencesContext.Provider value={{ preferences, loading, updatePreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};
