/**
 * Format currency amount in Indonesian Rupiah (IDR)
 */
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (value: string): number => {
  // Remove all non-numeric characters except dots and commas
  const cleaned = value.replace(/[^\d.,-]/g, '');
  // Convert to number
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
};

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export const formatCompactCurrency = (amount: number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(numAmount);
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (): string => 'Rp';

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};
