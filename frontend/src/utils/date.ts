import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { id as idLocale, enUS as enLocale } from 'date-fns/locale';

/**
 * Get date-fns locale based on current language
 */
export const getDateLocale = (language: string) => {
  return language === 'id' ? idLocale : enLocale;
};

/**
 * Format date with localization support
 */
export const formatDate = (
  date: string | Date,
  formatStr: string = 'dd MMM yyyy',
  language: string = 'en'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    
    return format(dateObj, formatStr, {
      locale: getDateLocale(language),
    });
  } catch {
    return '-';
  }
};

/**
 * Format date and time
 */
export const formatDateTime = (
  date: string | Date,
  language: string = 'en'
): string => {
  return formatDate(date, 'dd MMM yyyy, HH:mm', language);
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (
  date: string | Date,
  language: string = 'en'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: getDateLocale(language),
    });
  } catch {
    return '-';
  }
};

/**
 * Get current date in ISO format
 */
export const getCurrentDate = (): string => {
  return new Date().toISOString();
};

/**
 * Check if date is today
 */
export const isToday = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
};
