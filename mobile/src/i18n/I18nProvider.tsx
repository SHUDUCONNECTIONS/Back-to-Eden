import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../../../shared/i18n/locales';
import { fill, I18nContext, type TranslateVars } from './I18nContext';

/**
 * Translations for the phone app.
 *
 * The dictionaries are the same files the web app uses (shared/i18n/strings),
 * keyed by the English text, so a string translated once is translated in
 * both places. Unlike the web there is no machine-translation fallback: a
 * string missing from a dictionary simply shows in English.
 *
 * The chosen language is remembered on the device. On first launch it follows
 * the phone's own language when that is one of ours.
 */

const LOCALE_KEY = 'eden.locale';

const LOADERS: Partial<Record<Locale, () => Promise<Record<string, string>>>> = {
  af: () => import('../../../shared/i18n/strings/af').then((m) => m.af),
  zu: () => import('../../../shared/i18n/strings/zu').then((m) => m.zu),
  xh: () => import('../../../shared/i18n/strings/xh').then((m) => m.xh),
  nso: () => import('../../../shared/i18n/strings/nso').then((m) => m.nso),
  st: () => import('../../../shared/i18n/strings/st').then((m) => m.st),
  tn: () => import('../../../shared/i18n/strings/tn').then((m) => m.tn),
  ss: () => import('../../../shared/i18n/strings/ss').then((m) => m.ss),
  nr: () => import('../../../shared/i18n/strings/nr').then((m) => m.nr),
  ts: () => import('../../../shared/i18n/strings/ts').then((m) => m.ts),
  ve: () => import('../../../shared/i18n/strings/ve').then((m) => m.ve),
};

/** The phone's language, if it is one the app speaks. */
function deviceLocale(): Locale | null {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const lang = tag.toLowerCase().split(/[-_]/)[0];
    return isLocale(lang) ? lang : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Record<string, string>>({});

  // Restore the saved choice once.
  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(LOCALE_KEY)
      .catch(() => null)
      .then((saved) => {
        if (cancelled) return;
        const next = saved && isLocale(saved) ? saved : deviceLocale();
        if (next) setLocaleState(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the dictionary whenever the language changes.
  useEffect(() => {
    let cancelled = false;
    const loader = LOADERS[locale];
    if (!loader) {
      setDict({});
      return;
    }
    loader()
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict({});
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    SecureStore.setItemAsync(LOCALE_KEY, next).catch(() => {
      // Not remembered across launches, but the switch still works now.
    });
  }, []);

  const t = useCallback(
    (source: string, vars?: TranslateVars) => fill(dict[source] || source, vars),
    [dict],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
