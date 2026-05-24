// Translation system with lazy loading support
import { en } from './en';
import { es } from './es';

// Type for translations - use English as the canonical type
export type Translations = typeof en;

// Partial translations type for non-English languages
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PartialTranslations = DeepPartial<Translations>;

// Static exports for backward compatibility
export const translations: Record<string, PartialTranslations> = { 
  en: en as PartialTranslations, 
  es: es as PartialTranslations 
};

export type Language = 'en' | 'es';

// Cache for loaded translations
const translationCache: Partial<Record<Language, PartialTranslations>> = {
  en, // Preload English as default
};

// Lazy load translation for a specific language
export const loadTranslation = async (lang: Language): Promise<PartialTranslations> => {
  // Return from cache if available
  if (translationCache[lang]) {
    return translationCache[lang]!;
  }

  // Dynamic import for other languages
  switch (lang) {
    case 'es': {
      const esModule = await import('./es');
      translationCache.es = esModule.es;
      return esModule.es;
    }
    case 'en':
    default:
      return en;
  }
};

// Get translation synchronously (from cache or fallback to English)
export const getTranslation = (lang: Language): PartialTranslations => {
  return translationCache[lang] || en;
};

// Preload a language into cache
export const preloadTranslation = async (lang: Language): Promise<void> => {
  await loadTranslation(lang);
};
