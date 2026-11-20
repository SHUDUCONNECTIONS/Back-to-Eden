import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CURATED_FALLBACK, ERROR_FALLBACK } from './fallback-recipes';
import { getTranslation, saveTranslation, translationCount } from '../database/translations-db';

/**
 * The languages the app offers. Names come from here, never from the request,
 * because they are written into the model prompt.
 */
const LOCALES: Record<string, { languageName: string; nativeName: string }> = {
  af: { languageName: 'Afrikaans', nativeName: 'Afrikaans' },
  zu: { languageName: 'Zulu', nativeName: 'isiZulu' },
  xh: { languageName: 'Xhosa', nativeName: 'isiXhosa' },
  nso: { languageName: 'Northern Sotho', nativeName: 'Sepedi' },
  st: { languageName: 'Southern Sotho', nativeName: 'Sesotho' },
  tn: { languageName: 'Tswana', nativeName: 'Setswana' },
  ss: { languageName: 'Swati', nativeName: 'siSwati' },
  nr: { languageName: 'Southern Ndebele', nativeName: 'isiNdebele' },
  ts: { languageName: 'Tsonga', nativeName: 'Xitsonga' },
  ve: { languageName: 'Venda', nativeName: 'Tshivenḓa' },
};

const MAX_STRINGS_PER_REQUEST = 200;
const MAX_STRING_LENGTH = 500;
/** Past this many stored strings for one language, stop asking the model for more. */
const MAX_TRANSLATIONS_PER_LOCALE = 20_000;

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const out = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string' && item.trim() && item.length <= maxLength) out.add(item);
    if (out.size >= maxItems) break;
  }
  return [...out];
}

export interface RecipeRequest {
  availableIngredients?: string[];
  budget?: number;
  targetServings?: number;
  currency?: string;
}

export interface TranslateRequest {
  locale?: string;
  languageName?: string;
  nativeName?: string;
  strings?: string[];
}

/**
 * Gemini-backed recipe suggestions and machine translation.
 *
 * Both degrade rather than fail. Without GEMINI_API_KEY the recipe endpoint
 * returns a real curated recipe and the translation endpoint reports
 * `available: false` so the client stops asking and stays on English. A screen
 * that works without a key is worth more than one that errors with a nice
 * message.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * A ceiling on paid model calls per day (UTC), across recipes and
   * translations, so a bug or an abuser cannot run up an unbounded bill.
   * Set AI_DAILY_LIMIT to change it. In memory: a restart resets the count.
   */
  private readonly dailyLimit = Math.max(0, Number(process.env.AI_DAILY_LIMIT) || 500);
  private callDay = '';
  private callsToday = 0;

  /** Reserves one model call. False when today's budget is spent. */
  private takeModelCall(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.callDay) {
      this.callDay = today;
      this.callsToday = 0;
    }
    if (this.callsToday >= this.dailyLimit) {
      if (this.callsToday === this.dailyLimit) {
        this.logger.warn(`AI_DAILY_LIMIT (${this.dailyLimit}) reached; using fallbacks until midnight UTC.`);
        this.callsToday++;
      }
      return false;
    }
    this.callsToday++;
    return true;
  }

  private get apiKey(): string | undefined {
    return process.env.GEMINI_API_KEY || undefined;
  }

  /** Resolved once, then reused. */
  private genai?: Promise<typeof import('@google/genai', { with: { 'resolution-mode': 'import' } })>;

  /**
   * Loads the Gemini SDK on first use.
   *
   * It has to be a dynamic import. @google/genai declares "type": "module" and
   * ships its CommonJS entry without a matching .d.cts, so TypeScript rejects a
   * static import from this CommonJS build even though require() would work at
   * runtime. import() is the supported way in.
   *
   * Loading it lazily is the better shape anyway: the SDK is large, most
   * requests never reach it, and with no API key configured it is never loaded
   * at all.
   */
  private loadGenAi(): Promise<typeof import('@google/genai', { with: { 'resolution-mode': 'import' } })> {
    if (!this.genai) {
      this.genai = import('@google/genai');
    }
    return this.genai;
  }

  async suggestRecipe(req: RecipeRequest) {
    const availableIngredients = cleanList(req?.availableIngredients, 30, 60);
    const budget = Math.min(100_000, Math.max(1, Number(req?.budget) || 50));
    const targetServings = Math.min(20, Math.max(1, Math.round(Number(req?.targetServings) || 4)));
    const currency = /^[A-Z]{3}$/.test(String(req?.currency)) ? String(req.currency) : 'ZAR';

    if (!this.apiKey) {
      return { success: true, recipe: CURATED_FALLBACK, source: 'curated-fallback' };
    }
    if (!this.takeModelCall()) {
      return { success: true, recipe: CURATED_FALLBACK, source: 'daily-limit' };
    }

    try {
      const { GoogleGenAI } = await this.loadGenAi();
      const ai = new GoogleGenAI();
      const prompt = `You are an expert nutritionist and budget meal planning advisor.
The user has the following ingredients and constraints:
- Available or chosen ingredients: ${JSON.stringify(
        availableIngredients.length ? availableIngredients : ['beans', 'spinach', 'maize meal', 'onions'],
      )}
- Target budget limit: ${currency} ${budget || 50}
- Desired servings: ${targetServings || 4}
- Currency: ${currency}

Create 1 nutritious, healthy, delicious, and deeply affordable recipe that stays within this financial limit.
Respond strictly with valid JSON format:
{
  "title": "string",
  "description": "string",
  "estimatedTotalCost": number,
  "costPerServing": number,
  "servings": number,
  "prepTime": "string",
  "cookTime": "string",
  "ingredients": [
    { "name": "string", "amount": "string", "cost": number, "nutrition": "string" }
  ],
  "steps": ["string"],
  "nutritionalHighlights": ["string"]
}
Do not include markdown ticks \`\`\`json. Output plain JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      return { success: true, recipe: JSON.parse(cleanJson), source: 'gemini' };
    } catch (err: any) {
      this.logger.error(`Gemini recipe suggestion failed: ${err?.message || err}`);
      return { success: true, recipe: ERROR_FALLBACK, source: 'fallback' };
    }
  }

  /**
   * `mayCallModel` is the caller's per-visitor limit, asked only when a call
   * to the model is actually needed - stored translations are always free.
   */
  async translate(req: TranslateRequest, mayCallModel: () => boolean = () => true) {
    const locale = String(req?.locale || '');
    const meta = LOCALES[locale];
    const strings = cleanList(req?.strings, MAX_STRINGS_PER_REQUEST, MAX_STRING_LENGTH);

    if (!meta || strings.length === 0) {
      throw new BadRequestException('A supported locale and a non-empty strings array are required');
    }
    const { languageName, nativeName } = meta;

    const translations: Record<string, string> = {};
    const missing: string[] = [];

    for (const source of strings) {
      const hit = getTranslation(locale, source);
      if (hit) {
        translations[source] = hit;
      } else {
        missing.push(source);
      }
    }

    if (missing.length === 0) {
      return { translations, source: 'cache' };
    }

    if (!this.apiKey) {
      // No key configured: tell the client to stop asking and stay on English.
      return {
        translations,
        available: false,
        reason: 'GEMINI_API_KEY is not set, so only hand-written translations are available.',
      };
    }

    if (
      translationCount(locale) >= MAX_TRANSLATIONS_PER_LOCALE ||
      !mayCallModel() ||
      !this.takeModelCall()
    ) {
      // Not now: the client keeps English for the rest and asks again later.
      return { translations, source: 'partial', error: 'rate_limited' };
    }

    try {
      const { GoogleGenAI } = await this.loadGenAi();
      const ai = new GoogleGenAI();
      const prompt = `You are a professional translator working into ${
        nativeName || languageName || locale
      } (${languageName || locale}), an official language of South Africa.

Translate each string in the JSON array below from English. These are user interface labels and food/nutrition content for a South African grocery budgeting app.

Rules:
- Keep the translation short and natural for a UI. Do not pad or explain.
- Preserve numbers, currency amounts, units (g, kg, ml, tbsp, tsp) and proper nouns exactly.
- Keep any leading/trailing punctuation and capitalisation style of the source.
- Use everyday vocabulary a home cook would recognise, not academic register.
- If a term has no established equivalent, keep the widely used English loanword.

Input:
${JSON.stringify(missing, null, 2)}

Respond with ONLY a JSON object mapping each exact English source string to its translation. No markdown fences, no commentary.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned) as Record<string, string>;

      // Only store answers to strings that were actually asked for.
      const asked = new Set(missing);
      for (const [source, translated] of Object.entries(parsed)) {
        if (asked.has(source) && typeof translated === 'string' && translated.trim()) {
          const value = translated.slice(0, MAX_STRING_LENGTH * 3);
          saveTranslation(locale, source, value);
          translations[source] = value;
        }
      }

      return { translations, source: 'gemini' };
    } catch (err: any) {
      this.logger.error(`Translation failed: ${err?.message || err}`);
      // Hand back whatever was already cached; the client keeps English for the rest.
      return { translations, source: 'partial', error: 'translation_failed' };
    }
  }
}
