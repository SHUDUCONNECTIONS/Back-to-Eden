import { createContext } from 'react';
import { Locale } from './locales';

/**
 * The translation context object and its type, kept apart from both the
 * provider component and the hooks.
 *
 * This split exists for a concrete reason. React Fast Refresh only works on a
 * module whose exports are all components. When TranslationProvider.tsx also
 * exported `useTranslation` and `useT`, Vite gave up on it:
 *
 *   hmr invalidate /src/i18n/TranslationProvider.tsx
 *   Could not Fast Refresh ("useT" export is incompatible)
 *   page reload src/i18n/TranslationProvider.tsx
 *
 * and fell back to a full page reload. During that reload the provider and the
 * consumers could briefly hold two different context objects, so `useT()` found
 * no provider above it, threw, and - with no error boundary in the tree - took
 * the entire app down to a blank screen.
 *
 * Keeping the context in its own module means the provider file exports only a
 * component, Fast Refresh works, and editing any i18n file no longer reloads
 * and crashes the running app.
 */

export interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a source English string. Returns the English unchanged on miss. */
  t: (source: string) => string;
  /** True while a machine-translation batch is in flight. */
  isTranslating: boolean;
  /** True when machine translation is configured and reachable. */
  machineTranslationAvailable: boolean;
}

export const TranslationContext = createContext<TranslationContextValue | null>(null);
