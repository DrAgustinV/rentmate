import { format as dateFnsFormat } from 'date-fns';

let userDateFormat = 'PPP'; // Default

export const setUserDateFormat = (format: string) => {
  userDateFormat = format;
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
  
  return dateFnsFormat(dateObj, formatMap[formatToUse] || formatToUse);
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
  
  return dateFnsFormat(dateObj, formatMap[formatToUse] || formatToUse);
};
