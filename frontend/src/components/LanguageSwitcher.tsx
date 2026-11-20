import React, { useEffect, useRef, useState } from 'react';
import { Check, Globe, Loader2 } from 'lucide-react';
import { LOCALES, Locale } from '../i18n/locales';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Language picker for the eleven written official languages of South Africa.
 * Renders each language in its own name, with the English name beneath.
 */
export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { locale, setLocale, t, isTranslating } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  // Close on outside click or Escape.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const choose = (code: Locale) => {
    setLocale(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('Choose your language')}
        title={t('Choose your language')}
        className="flex items-center gap-1.5 bg-white border border-[#e9dfc8] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#2f4026] hover:bg-[#fdfaf3] transition-colors cursor-pointer"
      >
        {isTranslating ? (
          <Loader2 className="w-3.5 h-3.5 text-[#4e6b3e] animate-spin" />
        ) : (
          <Globe className="w-3.5 h-3.5 text-[#4e6b3e]" />
        )}
        <span className={compact ? 'sr-only' : 'whitespace-nowrap'}>{active.nativeName}</span>
        <span className="text-[10px] font-bold uppercase text-[#7b8370]">{active.code}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('Language')}
          className="absolute right-0 mt-2 w-60 max-h-[22rem] overflow-y-auto bg-white border border-[#e9dfc8] rounded-xl shadow-lg z-50 p-1.5"
        >
          <div className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7b8370]">
            {t('Choose your language')}
          </div>

          {LOCALES.map((option) => {
            const isActive = option.code === locale;
            return (
              <button
                key={option.code}
                role="option"
                aria-selected={isActive}
                onClick={() => choose(option.code)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                  isActive ? 'bg-[#eef3e3]' : 'hover:bg-[#fdfaf3]'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[#2f4026] truncate">
                    {option.nativeName}
                  </span>
                  <span className="block text-[10px] text-[#7b8370] truncate">
                    {option.englishName}
                  </span>
                </span>
                {isActive && <Check className="w-3.5 h-3.5 text-[#4e6b3e] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
