/**
 * The translation provider component, and nothing else.
 *
 * The context lives in TranslationContext.ts and the hooks in
 * useTranslation.ts so that this file exports only a component. That is what
 * React Fast Refresh requires; when the hooks were exported from here too,
 * every i18n edit forced a full page reload that could crash the whole app.
 * Do not re-export a hook from this file.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_LOCALE, Locale, isLocale, localeMeta } from './locales';
import { TranslationContext, TranslationContextValue } from './TranslationContext';
import { STATIC_STRING_LOADERS } from './strings';

const STORAGE_KEY_LOCALE = 'nourish_locale';
const storageKeyCache = (locale: Locale) => `nourish_i18n_${locale}`;

/** Strings are sent to the translation endpoint in batches of this size. */
const BATCH_SIZE = 60;
/** How long to wait for more strings before flushing a batch. */
const FLUSH_DELAY_MS = 120;

type Cache = Record<string, string>;

function readCache(locale: Locale): Cache {
  if (locale === DEFAULT_LOCALE) return {};
  try {
    const raw = localStorage.getItem(storageKeyCache(locale));
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    // Private mode, blocked storage or corrupt JSON — start empty.
    return {};
  }
}

function writeCache(locale: Locale, cache: Cache): void {
  try {
    localStorage.setItem(storageKeyCache(locale), JSON.stringify(cache));
  } catch {
    // Quota or blocked storage. The in-memory cache still serves this session.
  }
}

function readStoredLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LOCALE);
    if (saved && isLocale(saved)) return saved;
  } catch {
    // Fall through to the default.
  }
  return DEFAULT_LOCALE;
}


export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);
  const [isTranslating, setIsTranslating] = useState(false);
  const [machineAvailable, setMachineAvailable] = useState(true);

  // Machine-translation results for the active locale. Kept in a ref so that
  // t() can read the newest values without the ref identity changing, and
  // mirrored into `version` to drive re-renders when a batch lands.
  const cacheRef = useRef<Cache>(readCache(locale));
  const [version, setVersion] = useState(0);

  // The hand-written dictionary for the active locale, downloaded on demand.
  // Until it arrives t() shows English and queues nothing for machine
  // translation - the dictionary already covers almost every string, and
  // sending them all to the paid endpoint during a load would waste money.
  const staticRef = useRef<Record<string, string>>({});
  const [staticReady, setStaticReady] = useState(locale === DEFAULT_LOCALE);

  // Strings seen during render that have no translation yet.
  const pendingRef = useRef<Set<string>>(new Set());
  // Strings already sent, so a failed or empty result is not requested forever.
  const requestedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the hand-written dictionary whenever the language changes.
  useEffect(() => {
    let cancelled = false;
    staticRef.current = {};
    const loader = STATIC_STRING_LOADERS[locale];
    if (!loader) {
      setStaticReady(true);
      return;
    }
    setStaticReady(false);
    loader()
      .then((dict) => {
        if (cancelled) return;
        staticRef.current = dict;
      })
      .catch(() => {
        // Offline or a failed chunk: fall back to machine translation/English.
      })
      .finally(() => {
        if (cancelled) return;
        setStaticReady(true);
        setVersion((v) => v + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Swap caches when the language changes.
  useEffect(() => {
    cacheRef.current = readCache(locale);
    pendingRef.current = new Set();
    requestedRef.current = new Set();
    setVersion((v) => v + 1);

    try {
      localStorage.setItem(STORAGE_KEY_LOCALE, locale);
    } catch {
      // Not fatal — the choice just will not survive a reload.
    }
    document.documentElement.lang = locale;
  }, [locale]);

  const flush = useCallback(async () => {
    const batch = Array.from(pendingRef.current).slice(0, BATCH_SIZE);
    if (batch.length === 0 || locale === DEFAULT_LOCALE) return;

    batch.forEach((s) => {
      pendingRef.current.delete(s);
      requestedRef.current.add(s);
    });

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          languageName: localeMeta(locale).englishName,
          nativeName: localeMeta(locale).nativeName,
          strings: batch,
        }),
      });

      const data = await res.json();

      if (data?.available === false) {
        setMachineAvailable(false);
        return;
      }

      const translations: Cache = data?.translations || {};
      if (Object.keys(translations).length > 0) {
        cacheRef.current = { ...cacheRef.current, ...translations };
        writeCache(locale, cacheRef.current);
        setVersion((v) => v + 1);
      }
    } catch {
      // Network or server error: leave the English text in place. The strings
      // stay in requestedRef so we do not hammer a dead endpoint.
      setMachineAvailable(false);
    } finally {
      setIsTranslating(false);
      // More strings may have queued up while this batch was away.
      if (pendingRef.current.size > 0) {
        timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
      }
    }
  }, [locale]);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
  }, [flush]);

  const t = useCallback(
    (source: string): string => {
      if (!source || locale === DEFAULT_LOCALE) return source;

      const staticHit = staticRef.current[source];
      if (staticHit) return staticHit;

      const cached = cacheRef.current[source];
      if (cached) return cached;

      // Dictionary still downloading: show English for a moment, ask for nothing.
      if (!staticReady) return source;

      // Unknown string: queue it for the next machine-translation batch and
      // render the English in the meantime.
      if (machineAvailable && !requestedRef.current.has(source)) {
        if (!pendingRef.current.has(source)) {
          pendingRef.current.add(source);
          schedule();
        }
      }
      return source;
    },
    [locale, machineAvailable, schedule, staticReady],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      isTranslating,
      machineTranslationAvailable: machineAvailable,
    }),
    // `version` is in the dependency list on purpose: when a translation batch
    // lands it is the only thing that changes, and without a fresh context
    // value React would skip re-rendering the (memoised) children and the new
    // text would never appear.
    [locale, setLocale, t, isTranslating, machineAvailable, version],
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};
