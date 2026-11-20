import { API_BASE_URL } from './config';
import type {
  CommunityComment,
  CommunityPost,
  FastingSession,
  FastingState,
  FeedPage,
  ReactionKind,
  UserProfile,
} from '../../../shared/types';

/**
 * Client for the NestJS backend.
 *
 * The same endpoints the web app uses - nothing mobile-specific on the server.
 * Identity is the session token from signIn/register, sent as a Bearer token.
 */

function headers(user: UserProfile): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(user.token ? { Authorization: `Bearer ${user.token}` } : {}),
  };
}

/**
 * Called when the server rejects a session the app thought was valid
 * (expired, password changed, account deleted elsewhere). App.tsx sets it to
 * sign the person out.
 */
let onSessionExpired: () => void = () => {};
export function setOnSessionExpired(handler: () => void): void {
  onSessionExpired = handler;
}

async function request<T>(
  path: string,
  user: UserProfile,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: init?.method || 'GET',
      headers: headers(user),
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    // A network failure on a phone is nearly always the API address, not the
    // server, so the message points at the thing worth checking.
    throw new Error(
      `Could not reach the server at ${API_BASE_URL}. If you are on a physical device, ` +
        'make sure it is on the same Wi-Fi and that the backend is listening on 0.0.0.0.',
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A wrong password on delete-account is also a 401, but the session is fine.
    if (res.status === 401 && user.token && path !== '/api/auth/delete-account') onSessionExpired();
    throw new Error((data as any)?.message || (data as any)?.error?.message || (data as any)?.error || 'Something went wrong.');
  }
  return data as T;
}

// --- Account ---------------------------------------------------------------

async function authCall(path: string, body: unknown): Promise<UserProfile> {
  const data = await request<{ token: string; user: { email: string; name: string; needsConsent?: boolean } }>(
    `/api/auth/${path}`,
    { name: '', email: '', isGuest: true },
    { method: 'POST', body },
  );
  return {
    name: data.user.name,
    email: data.user.email,
    isGuest: false,
    token: data.token,
    needsConsent: Boolean(data.user.needsConsent),
  };
}

export function signIn(email: string, password: string): Promise<UserProfile> {
  return authCall('login', { email, password });
}

export function register(name: string, email: string, password: string): Promise<UserProfile> {
  // Only called once the person has ticked the consent box on the sign-up form.
  return authCall('register', { name, email, password, acceptedPrivacyPolicy: true });
}

export async function acceptPrivacyPolicy(user: UserProfile): Promise<void> {
  await request('/api/auth/consent', user, { method: 'POST', body: { acceptedPrivacyPolicy: true } });
}

/** Checks a saved session on launch: null if it is no longer valid. */
export async function fetchMe(user: UserProfile): Promise<{ needsConsent: boolean } | null> {
  try {
    const data = await request<{ user: { needsConsent?: boolean } }>('/api/auth/me', user);
    return { needsConsent: Boolean(data.user?.needsConsent) };
  } catch (err) {
    // Offline: keep the saved session and let the screens report the network.
    if (err instanceof Error && err.message.startsWith('Could not reach')) return { needsConsent: false };
    return null;
  }
}

/** Permanently deletes the account and all its data. Needs the password again. */
export async function deleteAccount(user: UserProfile, password: string): Promise<void> {
  await request('/api/auth/delete-account', user, { method: 'POST', body: { password } });
}

export async function signOut(user: UserProfile): Promise<void> {
  await request('/api/auth/logout', user, { method: 'POST' }).catch(() => {});
}

// --- Community -------------------------------------------------------------

export function fetchFeed(
  user: UserProfile,
  sort: 'recent' | 'popular' = 'recent',
  limit = 8,
  offset = 0,
): Promise<FeedPage> {
  return request<FeedPage>(
    `/api/community/posts?sort=${sort}&limit=${limit}&offset=${offset}`,
    user,
  );
}

export async function toggleReaction(
  user: UserProfile,
  postId: string,
  kind: ReactionKind,
): Promise<boolean> {
  const data = await request<{ active: boolean }>(
    `/api/community/posts/${postId}/reactions`,
    user,
    { method: 'POST', body: { kind } },
  );
  return data.active;
}

export async function fetchComments(
  user: UserProfile,
  postId: string,
): Promise<CommunityComment[]> {
  const data = await request<{ comments: CommunityComment[] }>(
    `/api/community/posts/${postId}/comments`,
    user,
  );
  return data.comments || [];
}

export async function addComment(
  user: UserProfile,
  postId: string,
  body: string,
): Promise<CommunityComment[]> {
  const data = await request<{ comments: CommunityComment[] }>(
    `/api/community/posts/${postId}/comments`,
    user,
    { method: 'POST', body: { body } },
  );
  return data.comments || [];
}

export async function createPost(
  user: UserProfile,
  input: {
    title: string;
    description: string;
    servings: number;
    prepTime: string;
    cookTime: string;
    ingredients: { name: string; amount: string; costZar: number }[];
    steps: string[];
  },
): Promise<{ id: string; post: CommunityPost }> {
  return request(`/api/community/posts`, user, { method: 'POST', body: input });
}

// --- Fasting ---------------------------------------------------------------

export function fetchFastingState(user: UserProfile): Promise<FastingState> {
  return request<FastingState>('/api/fasting/state', user);
}

export async function startFast(
  user: UserProfile,
  scheduleId: string,
  targetHours: number,
): Promise<FastingSession> {
  const data = await request<{ session: FastingSession }>('/api/fasting/start', user, {
    method: 'POST',
    body: { scheduleId, targetHours },
  });
  return data.session;
}

export async function stopFast(user: UserProfile): Promise<FastingSession | null> {
  const data = await request<{ session: FastingSession | null }>('/api/fasting/stop', user, {
    method: 'POST',
    body: {},
  });
  return data.session ?? null;
}

export function discardFast(user: UserProfile): Promise<unknown> {
  return request('/api/fasting/active', user, { method: 'DELETE' });
}
