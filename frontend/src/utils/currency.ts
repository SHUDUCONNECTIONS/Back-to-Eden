import { CurrencyCode, CurrencyConfig } from '../types';

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand (R)', rateFromZar: 1, symbolPlacement: 'before' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)', rateFromZar: 0.055, symbolPlacement: 'before' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)', rateFromZar: 0.051, symbolPlacement: 'before' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)', rateFromZar: 0.043, symbolPlacement: 'before' },
  KES: { code: 'KES', symbol: 'KSh ', name: 'Kenyan Shilling (KSh)', rateFromZar: 7.1, symbolPlacement: 'before' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira (₦)', rateFromZar: 85, symbolPlacement: 'before' },
};

export function formatPrice(amountInZar: number, currency: CurrencyCode = 'ZAR'): string {
  const cfg = CURRENCIES[currency] || CURRENCIES.ZAR;
  const converted = amountInZar * cfg.rateFromZar;

  // Formatting decimal precision: For large currencies like NGN or KES, no decimals
  const isLargeUnit = cfg.rateFromZar > 5;
  const formattedNumber = isLargeUnit
    ? Math.round(converted).toLocaleString()
    : converted.toFixed(2);

  if (cfg.symbolPlacement === 'after') {
    return `${formattedNumber} ${cfg.symbol}`;
  }
  return `${cfg.symbol}${formattedNumber}`;
}

export function convertFromZar(amountInZar: number, currency: CurrencyCode = 'ZAR'): number {
  const cfg = CURRENCIES[currency] || CURRENCIES.ZAR;
  return amountInZar * cfg.rateFromZar;
}

export function convertToZar(amountInSelectedCurrency: number, currency: CurrencyCode = 'ZAR'): number {
  const cfg = CURRENCIES[currency] || CURRENCIES.ZAR;
  if (!cfg.rateFromZar) return amountInSelectedCurrency;
  return amountInSelectedCurrency / cfg.rateFromZar;
}
