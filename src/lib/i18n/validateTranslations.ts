import { translations } from './translations';
import { AVAILABLE_LANGUAGES } from './languages.config';

type TranslationPath = string;

// Recursively get all translation keys from a nested object
function getAllKeys(obj: any, prefix: string = ''): TranslationPath[] {
  const keys: TranslationPath[] = [];
  
  for (const key in obj) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], path));
    } else {
      keys.push(path);
    }
  }
  
  return keys;
}

export function validateTranslations() {
  const baseKeys = getAllKeys(translations.en);
  const missingTranslations: Record<string, string[]> = {};
  
  // Check each configured language
  for (const langConfig of AVAILABLE_LANGUAGES) {
    const langCode = langConfig.code;
    
    // Skip English (base language)
    if (langCode === 'en') continue;
    
    // Check if language exists in translations
    if (!(langCode in translations)) {
      missingTranslations[langCode] = ['ENTIRE LANGUAGE MISSING'];
      continue;
    }
    
    const langKeys = getAllKeys(translations[langCode as keyof typeof translations]);
    const missing = baseKeys.filter(key => !langKeys.includes(key));
    
    if (missing.length > 0) {
      missingTranslations[langCode] = missing;
    }
  }
  
  return {
    isValid: Object.keys(missingTranslations).length === 0,
    missingTranslations,
    totalKeys: baseKeys.length,
  };
}

// Console logger for development
export function logTranslationStatus() {
  const result = validateTranslations();
  
  if (result.isValid) {
    console.log('✅ All translations are complete!');
  } else {
    console.warn('⚠️ Missing translations detected:');
    Object.entries(result.missingTranslations).forEach(([lang, keys]) => {
      console.warn(`\n${lang}: ${keys.length} missing keys`);
      if (keys[0] === 'ENTIRE LANGUAGE MISSING') {
        console.warn('  → Entire language not in translations.ts');
      } else {
        console.warn(`  → First 5 missing: ${keys.slice(0, 5).join(', ')}`);
      }
    });
  }
  
  console.log(`\nTotal translation keys: ${result.totalKeys}`);
}
