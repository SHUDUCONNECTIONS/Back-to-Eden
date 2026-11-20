/**
 * The eleven written official languages of South Africa.
 *
 * South African Sign Language became the twelfth official language in 2023.
 * It has no written form, so it cannot serve as a UI text locale and is not
 * listed here.
 */

export type Locale =
  | 'en'
  | 'af'
  | 'zu'
  | 'xh'
  | 'nso'
  | 'st'
  | 'tn'
  | 'ss'
  | 'nr'
  | 'ts'
  | 've';

export interface LocaleMeta {
  code: Locale;
  /** The language's name in itself — what a speaker expects to see in a picker. */
  nativeName: string;
  /** The English name, shown as a subtitle so the list stays navigable to everyone. */
  englishName: string;
  /**
   * Whether this project ships a hand-written UI dictionary for the language.
   * Languages without one fall back to on-demand machine translation, and to
   * English when that is unavailable.
   */
  hasStaticDictionary: boolean;
}

export const LOCALES: LocaleMeta[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', hasStaticDictionary: true },
  { code: 'af', nativeName: 'Afrikaans', englishName: 'Afrikaans', hasStaticDictionary: true },
  { code: 'zu', nativeName: 'isiZulu', englishName: 'Zulu', hasStaticDictionary: true },
  { code: 'xh', nativeName: 'isiXhosa', englishName: 'Xhosa', hasStaticDictionary: true },
  { code: 'nso', nativeName: 'Sepedi', englishName: 'Northern Sotho', hasStaticDictionary: true },
  { code: 'st', nativeName: 'Sesotho', englishName: 'Southern Sotho', hasStaticDictionary: true },
  { code: 'tn', nativeName: 'Setswana', englishName: 'Tswana', hasStaticDictionary: true },
  { code: 'ss', nativeName: 'siSwati', englishName: 'Swati', hasStaticDictionary: true },
  { code: 'nr', nativeName: 'isiNdebele', englishName: 'Southern Ndebele', hasStaticDictionary: true },
  { code: 'ts', nativeName: 'Xitsonga', englishName: 'Tsonga', hasStaticDictionary: true },
  { code: 've', nativeName: 'Tshivenḓa', englishName: 'Venda', hasStaticDictionary: true },
];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function isLocale(value: string): value is Locale {
  return (LOCALE_CODES as string[]).includes(value);
}

export function localeMeta(code: Locale): LocaleMeta {
  return LOCALES.find((l) => l.code === code) || LOCALES[0];
}
