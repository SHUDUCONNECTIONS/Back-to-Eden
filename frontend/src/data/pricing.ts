/**
 * About the prices in this app.
 *
 * Every price in foodDatabase.ts and recipes.ts is a hand-entered estimate of
 * a typical South African supermarket price - not a live price from any shop.
 * The app says so wherever it shows them (see components/PriceNote.tsx).
 *
 * When you check the prices against real shops, update them in those files
 * and set PRICES_LAST_REVIEWED to that month (e.g. 'March 2027'). Leave it
 * null until someone has actually checked: the app then shows no date rather
 * than a date nobody can stand behind.
 */
export const PRICES_LAST_REVIEWED: string | null = null;

/**
 * Exchange rates in utils/currency.ts are fixed approximations too. Same rule:
 * set the month when they were last checked, or leave null.
 */
export const EXCHANGE_RATES_LAST_REVIEWED: string | null = null;
