import type { Locale } from '../locales';

/**
 * Hand-written UI translations, keyed by the English source string.
 *
 * Each language lives in its own file under shared/i18n/strings (the Expo
 * app reads the same files) and is downloaded only when someone
 * picks that language - every dictionary covers the whole app (over a thousand
 * strings), so bundling all ten up front would make every visitor download
 * nine languages they never use.
 *
 * English has no entry: `t()` returns the source text unchanged for 'en'.
 * A string missing from a language's map is not an error — it falls through to
 * machine translation, and then to English.
 */
export const STATIC_STRING_LOADERS: Partial<Record<Locale, () => Promise<Record<string, string>>>> = {
  af: () => import('../../../../shared/i18n/strings/af').then((m) => m.af),
  zu: () => import('../../../../shared/i18n/strings/zu').then((m) => m.zu),
  xh: () => import('../../../../shared/i18n/strings/xh').then((m) => m.xh),
  nso: () => import('../../../../shared/i18n/strings/nso').then((m) => m.nso),
  st: () => import('../../../../shared/i18n/strings/st').then((m) => m.st),
  tn: () => import('../../../../shared/i18n/strings/tn').then((m) => m.tn),
  ss: () => import('../../../../shared/i18n/strings/ss').then((m) => m.ss),
  nr: () => import('../../../../shared/i18n/strings/nr').then((m) => m.nr),
  ts: () => import('../../../../shared/i18n/strings/ts').then((m) => m.ts),
  ve: () => import('../../../../shared/i18n/strings/ve').then((m) => m.ve),
};
