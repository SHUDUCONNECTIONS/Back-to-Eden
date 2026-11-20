import { useContext } from 'react';
import { TranslationContext, TranslationContextValue } from './TranslationContext';

/**
 * Hooks for reading the translation context.
 *
 * These live outside TranslationProvider.tsx on purpose - see the comment in
 * TranslationContext.ts. A file that exports both a component and a hook cannot
 * be Fast Refreshed, and the full page reload that replaced it was crashing the
 * app. Import `useT` from here, never from the provider.
 */

export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error('useTranslation must be used inside a TranslationProvider');
  }
  return ctx;
}

/** Shorthand for components that only need the translate function. */
export function useT(): (source: string) => string {
  return useTranslation().t;
}
