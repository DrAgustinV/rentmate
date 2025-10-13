import React, { createContext, useContext, ReactNode } from 'react';
import { translations, Language } from '@/lib/i18n/translations';
import { useTheme } from './ThemeContext';

interface LanguageContextType {
  language: Language;
  t: (key: string) => string;
  changeLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { preferences, updateTheme } = useTheme();
  const language = (preferences?.language || 'en') as Language;

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    // Fallback to English if translation missing
    if (value === undefined) {
      let fallback: any = translations.en;
      for (const k of keys) {
        fallback = fallback?.[k];
        if (fallback === undefined) break;
      }
      return fallback || key;
    }
    
    return value;
  };

  const changeLanguage = async (lang: Language) => {
    await updateTheme({ language: lang });
  };

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
