/**
 * Fasting maths, formatting and the live clock hook.
 *
 * All day-boundary logic lives here rather than on the server, because only the
 * browser knows the user's timezone. A fast that ends at 01:00 in Johannesburg
 * belongs to that local day, not to the UTC day the timestamp falls in.
 * See the TIMEZONE NOTE in fasting-db.ts.
 */

import { useEffect, useState } from 'react';
import { FastingSession } from '../types';

export const MS_PER_HOUR = 3600000;
export const MS_PER_DAY = 86400000;

/** Live elapsed milliseconds since `startedAt`, ticking once a second. */
export function useElapsedMs(startedAt: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);

    // Background tabs get their timers throttled, so the clock can be minutes
    // stale by the time someone switches back. The value is derived from
    // Date.now() so it self-heals on the next tick, but catching the visibility
    // change makes the correction instant instead of up to a second late.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [startedAt]);

  if (!startedAt) return 0;
  return Math.max(0, now - startedAt);
}

/** "16:04:31" - hours are not wrapped at 24. For the big running timer. */
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** "16h 30m", or "45m" under an hour. For durations in prose and history rows. */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** "16.5h" - compact, for stat tiles. */
export function formatHours(hours: number): string {
  if (hours >= 100) return `${Math.round(hours)}h`;
  return `${Math.round(hours * 10) / 10}h`;
}

export function formatClockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDayAndTime(ts: number): string {
  const date = new Date(ts);
  const day = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${formatClockTime(ts)}`;
}

/** Local-day key, e.g. "2026-11-05". Not UTC - see the note at the top. */
export function localDayKey(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function shiftDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/**
 * Groups finished fasts by the local day they ended on, keeping the longest
 * fast for each day. A fast is credited to the day it finished, which is how
 * people describe them ("I broke my fast at lunch today").
 */
export function sessionsByDay(sessions: FastingSession[]): Map<string, FastingSession> {
  const byDay = new Map<string, FastingSession>();
  for (const session of sessions) {
    if (session.endedAt === null) continue;
    const key = localDayKey(session.endedAt);
    const existing = byDay.get(key);
    if (!existing || session.durationMs > existing.durationMs) {
      byDay.set(key, session);
    }
  }
  return byDay;
}

export interface StreakInfo {
  current: number;
  best: number;
}

/**
 * Day streaks.
 *
 * A day counts if ANY fast was recorded that day, regardless of whether it hit
 * its target. That is deliberate: this is a habit tracker, and breaking a
 * fifteen-hour streak because a sixteen-hour goal was missed by minutes
 * punishes exactly the behaviour we want to encourage. How often the target is
 * actually met is reported separately as the goal-hit rate.
 *
 * The current streak is still alive if the most recent day with a fast is today
 * OR yesterday - it only breaks once a full day has gone by with nothing
 * recorded, so an in-progress day never looks like a miss.
 */
export function computeStreaks(sessions: FastingSession[]): StreakInfo {
  const byDay = sessionsByDay(sessions);
  if (byDay.size === 0) return { current: 0, best: 0 };

  const days = Array.from(byDay.keys()).sort();

  // Best streak: walk the sorted days and count consecutive calendar dates.
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const previous = new Date(`${days[i - 1]}T00:00:00`);
    const expected = localDayKey(shiftDays(previous.getTime(), 1));
    run = days[i] === expected ? run + 1 : 1;
    if (run > best) best = run;
  }

  // Current streak: step backwards from today (or yesterday) while days are filled.
  const today = Date.now();
  let cursor = byDay.has(localDayKey(today))
    ? today
    : byDay.has(localDayKey(shiftDays(today, -1)))
      ? shiftDays(today, -1)
      : null;

  let current = 0;
  while (cursor !== null && byDay.has(localDayKey(cursor))) {
    current += 1;
    cursor = shiftDays(cursor, -1);
  }

  return { current, best: Math.max(best, current) };
}

export interface DayBar {
  key: string;
  /** Midnight of this local day. */
  ts: number;
  /** Longest fast finished that day, in hours. 0 when nothing was recorded. */
  hours: number;
  reachedGoal: boolean;
  isToday: boolean;
}

/** The last `count` local days, oldest first, for the consistency strip. */
export function recentDayBars(sessions: FastingSession[], count = 14): DayBar[] {
  const byDay = sessionsByDay(sessions);
  const todayKey = localDayKey(Date.now());
  const bars: DayBar[] = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const ts = shiftDays(Date.now(), -offset);
    const key = localDayKey(ts);
    const session = byDay.get(key);
    bars.push({
      key,
      ts,
      hours: session ? session.durationMs / MS_PER_HOUR : 0,
      reachedGoal: Boolean(session?.reachedGoal),
      isToday: key === todayKey,
    });
  }

  return bars;
}

/** Fraction of the target completed, capped at 1 for the progress ring. */
export function progressFraction(elapsedMs: number, targetHours: number): number {
  const targetMs = targetHours * MS_PER_HOUR;
  if (targetMs <= 0) return 0;
  return Math.min(1, elapsedMs / targetMs);
}

/** When the fast is due to finish. */
export function targetEndTime(startedAt: number, targetHours: number): number {
  return startedAt + targetHours * MS_PER_HOUR;
}
