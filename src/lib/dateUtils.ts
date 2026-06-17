import { format as dateFnsFormat } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export function getBrowserDateFormat(): string {
  if (typeof navigator === 'undefined') return 'PPP';

  const locale = navigator.language || 'en-US';

  if (locale === 'en-US' || locale === 'en') return 'MM/dd/yyyy';

  const isoLocales = ['ja', 'zh', 'ko', 'sv', 'fi'];
  if (isoLocales.some(l => locale.startsWith(l))) return 'yyyy-MM-dd';

  return 'dd/MM/yyyy';
}

let userDateFormat = getBrowserDateFormat();
let userLocale = 'en'; // Default

export const setUserDateFormat = (format: string) => {
  userDateFormat = format;
};

export const setUserLocale = (locale: string) => {
  userLocale = locale;
};

export const getUserDateFormat = () => userDateFormat;
export const getUserLocale = () => userLocale;

/** Convert a local-midnight Date to "yyyy-MM-dd" using local timezone methods. */
export function dateToISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const formatDate = (date: Date | string, formatOverride?: string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formatToUse = formatOverride || userDateFormat;
  
  // Map custom formats to date-fns formats
  const formatMap: Record<string, string> = {
    'PPP': 'PPP',              // Apr 29, 2023
    'MM/dd/yyyy': 'MM/dd/yyyy', // 04/29/2023
    'dd/MM/yyyy': 'dd/MM/yyyy', // 29/04/2023
    'yyyy-MM-dd': 'yyyy-MM-dd', // 2023-04-29
  };
  
  const localeMap: Record<string, Locale> = {
    'es': es,
  };
  
  return dateFnsFormat(dateObj, formatMap[formatToUse] || formatToUse, {
    locale: localeMap[userLocale],
  });
};

export const formatDateTime = (date: Date | string, formatOverride?: string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formatToUse = formatOverride || userDateFormat;
  
  const formatMap: Record<string, string> = {
    'PPP': 'PPp',                    // Apr 29, 2023, 9:30 AM
    'MM/dd/yyyy': 'MM/dd/yyyy p',    // 04/29/2023 9:30 AM
    'dd/MM/yyyy': 'dd/MM/yyyy p',    // 29/04/2023 9:30 AM
    'yyyy-MM-dd': 'yyyy-MM-dd HH:mm', // 2023-04-29 09:30
  };
  
  const localeMap: Record<string, Locale> = {
    'es': es,
  };
  
  return dateFnsFormat(dateObj, formatMap[formatToUse] || formatToUse, {
    locale: localeMap[userLocale],
  });
};
