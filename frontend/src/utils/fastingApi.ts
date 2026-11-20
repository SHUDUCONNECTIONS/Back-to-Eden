import { FastingSession, FastingState, UserProfile } from '../types';
import { authHeaders, parseResponse } from './auth';

/**
 * Client for the Fasting Journey endpoints.
 *
 * Calls carry the session token (see auth.ts). Every fasting route needs a
 * signed-in account; history is scoped to that account on the server.
 */

function headers(user: UserProfile): HeadersInit {
  return authHeaders(user);
}

const parse = parseResponse;

const EMPTY_TOTALS = { sessionCount: 0, goalCount: 0, totalHours: 0, longestHours: 0 };

export async function fetchFastingState(user: UserProfile): Promise<FastingState> {
  const res = await fetch('/api/fasting/state', { headers: headers(user) });
  const data = await parse<FastingState>(res);
  return {
    active: data.active ?? null,
    sessions: data.sessions || [],
    totals: data.totals || EMPTY_TOTALS,
    lastSchedule: data.lastSchedule ?? null,
  };
}

export async function startFast(
  user: UserProfile,
  scheduleId: string,
  targetHours: number,
  startedAt?: number,
): Promise<FastingSession> {
  const res = await fetch('/api/fasting/start', {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify({ scheduleId, targetHours, startedAt }),
  });
  const data = await parse<{ session: FastingSession }>(res);
  return data.session;
}

export async function stopFast(user: UserProfile, note?: string): Promise<FastingSession | null> {
  const res = await fetch('/api/fasting/stop', {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify({ note: note || '' }),
  });
  const data = await parse<{ session: FastingSession | null }>(res);
  return data.session ?? null;
}

/** Drops the running fast without recording it - for a start that was a mistake. */
export async function discardFast(user: UserProfile): Promise<void> {
  const res = await fetch('/api/fasting/active', {
    method: 'DELETE',
    headers: headers(user),
  });
  await parse(res);
}

export async function deleteFastingSession(user: UserProfile, sessionId: string): Promise<void> {
  const res = await fetch(`/api/fasting/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: headers(user),
  });
  await parse(res);
}
