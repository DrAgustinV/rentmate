import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sun, Moon, Monitor, Type, Calendar, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Language } from '@/lib/i18n/translations/index';
import { AVAILABLE_LANGUAGES } from '@/lib/i18n/languages.config';
import { showToast } from '@/lib/toast';

export const AppearanceSettings = () => {
  const { preferences, loading, updateTheme, resetToDefaults } = useTheme();
  const { t, language, changeLanguage } = useLanguage();
  const [tempPrefs, setTempPrefs] = useState(preferences);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  if (loading || !preferences) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentPrefs = tempPrefs || preferences;

  const handleSave = async () => {
    if (tempPrefs) {
      await updateTheme(tempPrefs);
    }
  };

  const handleReset = async () => {
    await resetToDefaults();
    setTempPrefs(null);
    setResetDialogOpen(false);
    showToast.success(t('settings.resetComplete') || 'Preferences reset to defaults');
  };

  const handleResetClick = () => {
    setResetDialogOpen(true);
  };

  const updateTempPrefs = (update: Partial<typeof currentPrefs>) => {
    setTempPrefs({ ...currentPrefs, ...update });
  };

  return (
    <div className="space-y-8">
      {/* Theme Mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('settings.themeMode')}</h3>
        </div>
        <RadioGroup
          value={currentPrefs.theme_mode}
          onValueChange={(value) => updateTempPrefs({ theme_mode: value as any })}
          className="grid grid-cols-3 gap-4"
        >
          <Label
            htmlFor="light"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="light" id="light" className="sr-only" />
            <Sun className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">{t('settings.light')}</span>
          </Label>
          <Label
            htmlFor="dark"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="dark" id="dark" className="sr-only" />
            <Moon className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">{t('settings.dark')}</span>
          </Label>
          <Label
            htmlFor="system"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="system" id="system" className="sr-only" />
            <Monitor className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">{t('settings.system')}</span>
          </Label>
        </RadioGroup>
      </div>

      {/* Font Size */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('settings.fontSize')}</h3>
        </div>
        <RadioGroup
          value={currentPrefs.font_size}
          onValueChange={(value) => updateTempPrefs({ font_size: value as any })}
          className="grid grid-cols-3 gap-4"
        >
          <Label
            htmlFor="sm"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="sm" id="sm" className="sr-only" />
            <span className="text-sm mb-2">Aa</span>
            <span className="text-xs font-medium">{t('settings.small')}</span>
          </Label>
          <Label
            htmlFor="md"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="md" id="md" className="sr-only" />
            <span className="text-base mb-2">Aa</span>
            <span className="text-xs font-medium">{t('settings.medium')}</span>
          </Label>
          <Label
            htmlFor="lg"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
          >
            <RadioGroupItem value="lg" id="lg" className="sr-only" />
            <span className="text-lg mb-2">Aa</span>
            <span className="text-xs font-medium">{t('settings.large')}</span>
          </Label>
        </RadioGroup>
      </div>

      {/* Language */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('settings.language')}</h3>
        </div>
        <Select
          value={language}
          onValueChange={(value) => changeLanguage(value as Language)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('settings.language')} />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            {AVAILABLE_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.flag} {lang.nativeLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Format */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('settings.dateFormat')}</h3>
        </div>
        <Select
          value={currentPrefs.date_format}
          onValueChange={(value) => updateTempPrefs({ date_format: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select date format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PPP">Apr 29, 2023</SelectItem>
            <SelectItem value="MM/dd/yyyy">04/29/2023</SelectItem>
            <SelectItem value="dd/MM/yyyy">29/04/2023</SelectItem>
            <SelectItem value="yyyy-MM-dd">2023-04-29</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Week Starts On */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('settings.weekStartDay')}</h3>
        </div>
        <Select
          value={currentPrefs.week_start_day || 'monday'}
          onValueChange={(value) => updateTempPrefs({ week_start_day: value as 'sunday' | 'monday' })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select week start day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monday">{t('settings.monday')}</SelectItem>
            <SelectItem value="sunday">{t('settings.sunday')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave}>{t('settings.saveChanges')}</Button>
        <Button variant="outline" onClick={handleResetClick}>{t('settings.resetDefaults')}</Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.resetConfirmTitle') || 'Reset Preferences?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.resetConfirmDesc') || 'This will reset all appearance settings to their defaults. This action can be undone by saving your current preferences again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              {t('settings.resetDefaults') || 'Reset to Defaults'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
