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
import { Sun, Moon, Monitor, Palette, Type, Calendar, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Language } from '@/lib/i18n/translations';
import { AVAILABLE_LANGUAGES } from '@/lib/i18n/languages.config';

const colorPresets = [
  { name: 'Ocean Blue', primary: '221 83% 53%', accent: '199 89% 48%' },
  { name: 'Forest Green', primary: '142 76% 36%', accent: '120 60% 50%' },
  { name: 'Sunset Orange', primary: '25 95% 53%', accent: '38 92% 50%' },
  { name: 'Royal Purple', primary: '271 76% 53%', accent: '280 87% 65%' },
  { name: 'Rose Pink', primary: '340 82% 52%', accent: '350 89% 60%' },
  { name: 'Slate Gray', primary: '215 16% 47%', accent: '210 20% 40%' },
];

export const AppearanceSettings = () => {
  const { preferences, loading, updateTheme, resetToDefaults } = useTheme();
  const { t, language, changeLanguage } = useLanguage();
  const [tempPrefs, setTempPrefs] = useState(preferences);

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

      {/* Color Scheme */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('settings.primaryColor')} & {t('settings.accentColor')}</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {colorPresets.map((preset) => (
                <Card
                  key={preset.name}
                  className={`p-4 cursor-pointer hover:border-primary transition-colors ${
                    currentPrefs.primary_color === preset.primary &&
                    currentPrefs.accent_color === preset.accent
                      ? 'border-primary border-2'
                      : 'border'
                  }`}
                  onClick={() => updateTempPrefs({ primary_color: preset.primary, accent_color: preset.accent })}
                >
                  <div className="flex gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: `hsl(${preset.primary})` }}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: `hsl(${preset.accent})` }}
                    />
                  </div>
                  <p className="text-sm font-medium">{preset.name}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">{t('settings.primaryColor')} (HSL)</Label>
              <Input
                id="primary-color"
                value={currentPrefs.primary_color}
                onChange={(e) => updateTempPrefs({ primary_color: e.target.value })}
                placeholder="221 83% 53%"
              />
              <div
                className="w-full h-10 rounded border"
                style={{ backgroundColor: `hsl(${currentPrefs.primary_color})` }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent-color">{t('settings.accentColor')} (HSL)</Label>
              <Input
                id="accent-color"
                value={currentPrefs.accent_color}
                onChange={(e) => updateTempPrefs({ accent_color: e.target.value })}
                placeholder="199 89% 48%"
              />
              <div
                className="w-full h-10 rounded border"
                style={{ backgroundColor: `hsl(${currentPrefs.accent_color})` }}
              />
            </div>
          </div>
        </div>
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
        <Button variant="outline" onClick={handleReset}>{t('settings.resetDefaults')}</Button>
      </div>
    </div>
  );
};
