import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/i18n/translations/index";
import { AVAILABLE_LANGUAGES } from "@/lib/i18n/languages.config";
import { useLanguageSettings } from "@/hooks/useLanguageSettings";

export const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();
  const { enabledLanguages, loading } = useLanguageSettings();
  
  // Filter to only show enabled languages
  const availableLanguages = AVAILABLE_LANGUAGES.filter(
    lang => enabledLanguages.includes(lang.code)
  );
  
  const currentLang = availableLanguages.find(l => l.code === language) || availableLanguages[0] || AVAILABLE_LANGUAGES[0];

  if (loading || availableLanguages.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.flag} {currentLang.nativeLabel}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code as Language)}
            className={language === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            <span className="font-medium">{lang.nativeLabel}</span>
            <span className="ml-2 text-muted-foreground text-xs">({lang.label})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
