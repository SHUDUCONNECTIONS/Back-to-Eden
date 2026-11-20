import { API_BASE_URL } from './config';
import type { Translate } from '../i18n/I18nContext';

/**
 * The text to show for a failed request.
 *
 * src/lib/api.ts throws plain English (it sits outside React, and
 * fetchMe matches on its wording), so translation happens here, at display.
 * Messages from the server are looked up too; any the dictionaries do not
 * know stay in English.
 */
export function errorText(err: unknown, t: Translate, fallback: string): string {
  const message = err instanceof Error ? err.message : typeof (err as any)?.message === 'string' ? (err as any).message : '';
  if (!message) return fallback;
  if (message.startsWith('Could not reach the server')) {
    return t(
      'Could not reach the server at {url}. If you are on a physical device, make sure it is on the same Wi-Fi and that the backend is listening on 0.0.0.0.',
      { url: API_BASE_URL },
    );
  }
  return t(message);
}
