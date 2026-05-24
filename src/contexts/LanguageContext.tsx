import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { translations, Language, PartialTranslations } from '@/lib/i18n/translations/index';
import { en } from '@/lib/i18n/translations/en';
import { useUserPreferences } from './UserPreferencesContext';

interface LanguageContextType {
  language: Language;
  t: (key: string) => string;
  changeLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper to get nested value from object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNestedValue = (obj: any, keys: string[]): string | undefined => {
  let value = obj;
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }
  return typeof value === 'string' ? value : undefined;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { preferences, updatePreferences } = useUserPreferences();
  const language = (preferences?.language || 'en') as Language;

  const t = useCallback((key: string): string => {
    const keys = key.split('.');

    // Try current language first
    const currentLangTranslations = translations[language];
    const value = getNestedValue(currentLangTranslations, keys);

    if (value !== undefined) {
      return value;
    }

    // Fallback to English
    const fallback = getNestedValue(en, keys);
    return fallback || key;
  }, [language]);

  const changeLanguage = useCallback(async (lang: Language) => {
    await updatePreferences({ language: lang });
  }, [updatePreferences]);

  const value = useMemo(() => ({ language, t, changeLanguage }), [language, t, changeLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
