import { createContext, useContext } from 'react';
import type { Locale } from '../../../shared/i18n/locales';

/** Values filled into `{name}` placeholders, e.g. t('Serves {count}', { count: 4 }). */
export type TranslateVars = Record<string, string | number>;
export type Translate = (source: string, vars?: TranslateVars) => string;

export interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

/** Fill `{name}` placeholders. Unknown names are left as they are. */
export function fill(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key) => (key in vars ? String(vars[key]) : whole));
}

// The default lets a screen render (in English) even outside the provider,
// which keeps components usable in isolation.
export const I18nContext = createContext<I18nValue>({
  locale: 'en',
  setLocale: () => {},
  t: fill,
});

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Shorthand for screens that only need the translate function. */
export function useT(): Translate {
  return useContext(I18nContext).t;
}
