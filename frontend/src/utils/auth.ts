import { UserProfile } from '../types';

/**
 * Sign-in against the backend's /api/auth routes.
 *
 * The server returns a session token, which travels as
 * `Authorization: Bearer <token>` on every call. The server works out who the
 * caller is from that token alone - nothing else the client sends about itself
 * is trusted. Guests have no token: they can browse, but anything that writes
 * is refused with 401.
 */

export const STORAGE_KEY = 'back_to_eden_user';

/** Fired when the server rejects a stored session (expired or signed out elsewhere). */
export const AUTH_EXPIRED_EVENT = 'back-to-eden:auth-expired';

export function authHeaders(user?: UserProfile | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user?.token) headers.Authorization = `Bearer ${user.token}`;
  return headers;
}

/** The saved user, for code that is not handed one as a prop. */
export function storedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

/** Reads a JSON response, turning server errors into readable Error messages. */
export async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && storedUser()?.token) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    const message =
      res.status === 401 && !storedUser()?.token
        ? 'Create a free account or sign in to do that.'
        : (data as any)?.message || (data as any)?.error || 'Something went wrong. Please try again.';
    throw new Error(Array.isArray(message) ? message.join(' ') : String(message));
  }
  return data as T;
}

interface AuthResponse {
  token: string;
  user: { email: string; name: string; isAdmin: boolean; needsConsent?: boolean };
}

async function authCall(path: string, body: unknown): Promise<{ profile: UserProfile; isAdmin: boolean }> {
  let res: Response;
  try {
    res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Please check your connection.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.message || 'Something went wrong. Please try again.');
  }
  const { token, user } = data as AuthResponse;
  return {
    profile: {
      name: user.name,
      email: user.email,
      isGuest: false,
      token,
      needsConsent: Boolean(user.needsConsent),
    },
    isAdmin: Boolean(user.isAdmin),
  };
}

export function signIn(email: string, password: string) {
  return authCall('login', { email, password });
}

export function register(name: string, email: string, password: string, acceptedPrivacyPolicy: boolean) {
  return authCall('register', { name, email, password, acceptedPrivacyPolicy });
}

/** Re-reads the account from the server: checks the session and the consent state. */
export async function fetchMe(user: UserProfile): Promise<{ needsConsent: boolean } | null> {
  try {
    const res = await fetch('/api/auth/me', { headers: authHeaders(user) });
    if (res.status === 401) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    return { needsConsent: Boolean(data?.user?.needsConsent) };
  } catch {
    return null; // Offline: keep going with what we have.
  }
}

export async function acceptPrivacyPolicy(user: UserProfile): Promise<void> {
  const res = await fetch('/api/auth/consent', {
    method: 'POST',
    headers: authHeaders(user),
    body: JSON.stringify({ acceptedPrivacyPolicy: true }),
  });
  await parseResponse(res);
}

/** Downloads everything the server holds about this account as a JSON file. */
export async function downloadMyData(user: UserProfile): Promise<void> {
  const res = await fetch('/api/auth/export', { headers: authHeaders(user) });
  const data = await parseResponse<unknown>(res);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `back-to-eden-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Permanently deletes the account and all its data. Needs the password again. */
export async function deleteAccount(user: UserProfile, password: string): Promise<void> {
  const res = await fetch('/api/auth/delete-account', {
    method: 'POST',
    headers: authHeaders(user),
    body: JSON.stringify({ password }),
  });
  // A wrong password is a 401 here, but the session is fine - so read the
  // message directly instead of going through parseResponse's sign-out path.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || 'Could not delete the account.');
}

/** Ends the session on the server. Never throws: signing out locally always works. */
export async function signOut(user: UserProfile | null): Promise<void> {
  if (!user?.token) return;
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders(user) });
  } catch {
    // The token is dropped locally either way.
  }
}
