import { format as dateFnsFormat } from 'date-fns';
import { es } from 'date-fns/locale';

let userDateFormat = 'PPP'; // Default
let userLocale = 'en'; // Default

export const setUserDateFormat = (format: string) => {
  userDateFormat = format;
};

export const setUserLocale = (locale: string) => {
  userLocale = locale;
};

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
  
  const localeMap: Record<string, any> = {
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
  
  const localeMap: Record<string, any> = {
    'es': es,
  };
  
  return dateFnsFormat(dateObj, formatMap[formatToUse] || formatToUse, {
    locale: localeMap[userLocale],
  });
};
