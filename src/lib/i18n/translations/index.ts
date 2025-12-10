// Translation system with lazy loading support
import { en } from './en';
import { es } from './es';

// Static exports for backward compatibility
export const translations = { en, es };

export type Language = keyof typeof translations;
export type Translations = typeof en;

// Cache for loaded translations
const translationCache: Partial<Record<Language, Translations>> = {
  en, // Preload English as default
};

// Lazy load translation for a specific language
export const loadTranslation = async (lang: Language): Promise<Translations> => {
  // Return from cache if available
  if (translationCache[lang]) {
    return translationCache[lang]!;
  }

  // Dynamic import for other languages
  switch (lang) {
    case 'es':
      const esModule = await import('./es');
      translationCache.es = esModule.es;
      return esModule.es;
    case 'en':
    default:
      return en;
  }
};

// Get translation synchronously (from cache or fallback to English)
export const getTranslation = (lang: Language): Translations => {
  return translationCache[lang] || en;
};

// Preload a language into cache
export const preloadTranslation = async (lang: Language): Promise<void> => {
  await loadTranslation(lang);
};
