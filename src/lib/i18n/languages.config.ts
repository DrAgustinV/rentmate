export interface LanguageConfig {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  rtl?: boolean; // For RTL languages like Arabic
}

export const AVAILABLE_LANGUAGES: LanguageConfig[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇵🇹' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski', flag: '🇵🇱' },
  { code: 'sr', label: 'Serbian', nativeLabel: 'Српски', flag: '🇷🇸' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦', rtl: true },
];

export const DEFAULT_LANGUAGE = 'en';

// Helper to get language config
export const getLanguageConfig = (code: string): LanguageConfig | undefined => {
  return AVAILABLE_LANGUAGES.find(lang => lang.code === code);
};

// Helper to validate if a language code is supported
export const isLanguageSupported = (code: string): boolean => {
  return AVAILABLE_LANGUAGES.some(lang => lang.code === code);
};
