import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, BookOpen, Leaf, Stethoscope } from 'lucide-react';
import { EDUCATION_SECTIONS } from '../data/fastingSchedules';
import { useT } from '../i18n/useTranslation';

interface FastingEducationProps {
  /** Jumps to another view, used by the "see cheap break-fast foods" shortcut. */
  onNavigate?: (sectionId: string) => void;
}

/**
 * The learning half of the Fasting Journey.
 *
 * The safety section opens by default and is styled as a warning rather than
 * body copy. That is a deliberate choice: the rest of this is interesting, but
 * the list of people who should not fast is the part that can actually prevent
 * harm, so it does not sit behind a closed accordion row.
 */
export const FastingEducation: React.FC<FastingEducationProps> = ({ onNavigate }) => {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>('safety');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#eef3e3] border border-[#d4dfc6] flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-[#4e6b3e]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#2f4026] leading-tight">
            {t('Understanding fasting')}
          </h3>
          <p className="text-xs text-[#5a6b4f]">
            {t('What it does, what it does not do, and when to leave it alone.')}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {EDUCATION_SECTIONS.map((section) => {
          const isOpen = openId === section.id;
          const isCaution = Boolean(section.caution);

          return (
            <div
              key={section.id}
              className={`rounded-2xl border overflow-hidden transition-colors ${
                isCaution
                  ? 'bg-[#fdf4ec] border-[#e7c9ad]'
                  : 'bg-white border-[#e9dfc8]'
              }`}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : section.id)}
                aria-expanded={isOpen}
                className="w-full flex items-start gap-3 text-left px-4 py-3.5 cursor-pointer hover:bg-[#faf6ec] transition-colors"
              >
                {isCaution ? (
                  <AlertTriangle className="w-4 h-4 text-[#b4642e] shrink-0 mt-0.5" />
                ) : (
                  <span className="w-4 h-4 shrink-0 mt-0.5 rounded-full border-2 border-[#d4dfc6]" />
                )}

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-bold leading-snug ${
                      isCaution ? 'text-[#7a4e32]' : 'text-[#2f4026]'
                    }`}
                  >
                    {t(section.title)}
                  </div>
                  {!isOpen && (
                    <div className="text-xs text-[#5a6b4f] mt-0.5">{t(section.summary)}</div>
                  )}
                </div>

                <ChevronDown
                  className={`w-4 h-4 shrink-0 mt-0.5 text-[#627f50] transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-dashed border-[#e9dfc8]/80">
                  <div className="h-1" />

                  {section.bullets && (
                    <ul className="space-y-2">
                      {section.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span
                            className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${
                              isCaution ? 'bg-[#b4642e]' : 'bg-[#4e6b3e]'
                            }`}
                          />
                          <span className="text-[13px] leading-relaxed text-[#3e5531]">
                            {t(bullet)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.paragraphs?.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className={`text-[13px] leading-relaxed ${
                        isCaution ? 'text-[#7a4e32] font-medium' : 'text-[#3e5531]'
                      }`}
                    >
                      {t(paragraph)}
                    </p>
                  ))}

                  {/* The break-fast list is only useful if you can act on it, and
                      every food named is already priced on the shelf. */}
                  {section.id === 'breakfast' && onNavigate && (
                    <button
                      onClick={() => onNavigate('shelf')}
                      className="inline-flex items-center gap-2 mt-1 px-3.5 py-2 rounded-xl bg-[#4e6b3e] text-white text-xs font-bold hover:bg-[#3e5531] transition-colors cursor-pointer"
                    >
                      <Leaf className="w-3.5 h-3.5" />
                      {t('See these on the Ingredient Shelf')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Standing disclaimer. Sits outside the accordion so it is visible even
          when every section is closed. */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-[#f2e9d6]/70 border border-[#e9dfc8] px-4 py-3">
        <Stethoscope className="w-4 h-4 text-[#7a4e32] shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-[#5a6b4f]">
          {t(
            'This is a tracker and a reading guide, not medical advice. If you are pregnant, under 18, diabetic, underweight, taking daily medication such as TB treatment or ARVs, or have ever had an eating disorder, speak to a clinic or doctor before changing when you eat.',
          )}
        </p>
      </div>
    </div>
  );
};
