/**
 * Persistence for the Fasting Journey.
 *
 * Backed by node:sqlite (built into Node 22+) like the community feed, but in
 * its own file at data/fasting.db. Keeping it separate means the feed and the
 * fasting tracker can be changed or reset independently; neither holds a
 * foreign key into the other.
 *
 * IDENTITY
 * --------
 * `userKey` is the signed-in account's email, taken from a server-verified
 * session (see common/viewer.decorator.ts). Every fasting route requires
 * sign-in. Health data is sensitive under POPIA: email addresses are not yet
 * verified, and account deletion is still to come.
 *
 * TIMEZONE NOTE
 * -------------
 * Everything here is stored as a UTC millisecond timestamp. Day-boundary work
 * (streaks, "fasts this week") is deliberately NOT done here: the server does
 * not know the user's timezone, and a fast that ends at 01:00 in Johannesburg
 * belongs to a different calendar day than it would in UTC. The client gets raw
 * timestamps and does the calendar maths in local time - see src/utils/fasting.ts.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// CommonJS gives us __dirname directly. This file sits in src/database (or
// dist/database once compiled), so the data directory is two levels up at the
// backend root - the same folder either way.
import { DATA_DIR } from './data-dir';
const DB_PATH = path.join(DATA_DIR, 'fasting.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS fasting_sessions (
    id           TEXT PRIMARY KEY,
    user_key     TEXT    NOT NULL,
    schedule_id  TEXT    NOT NULL,
    target_hours REAL    NOT NULL,
    started_at   INTEGER NOT NULL,
    ended_at     INTEGER,
    note         TEXT    NOT NULL DEFAULT '',
    created_at   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON fasting_sessions (user_key, started_at DESC);

  -- Only one fast may run per person. A partial unique index enforces that in
  -- storage, so a double-tapped Start button cannot leave two open rows behind
  -- even if the check in startFast() loses a race.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_fast
    ON fasting_sessions (user_key) WHERE ended_at IS NULL;

  -- Remembers the last schedule chosen so the picker opens where you left off.
  CREATE TABLE IF NOT EXISTS fasting_prefs (
    user_key     TEXT PRIMARY KEY,
    schedule_id  TEXT NOT NULL,
    target_hours REAL NOT NULL,
    updated_at   INTEGER NOT NULL
  );
`);

/** Longest fast we will accept a target for. Past this it is not habit tracking. */
const MAX_TARGET_HOURS = 48;
const MIN_TARGET_HOURS = 4;
/** How far back an "I actually started earlier" backdate may reach. */
const MAX_BACKDATE_MS = 48 * 60 * 60 * 1000;

export interface FastingSessionRow {
  id: string;
  scheduleId: string;
  targetHours: number;
  startedAt: number;
  endedAt: number | null;
  note: string;
  /** Milliseconds fasted. For a running fast, the time so far at read time. */
  durationMs: number;
  /** True when a finished fast reached its target. Always false while running. */
  reachedGoal: boolean;
}

function newId(): string {
  return `fast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toSession(row: any, now: number): FastingSessionRow {
  const endedAt: number | null = row.ended_at ?? null;
  const durationMs = Math.max(0, (endedAt ?? now) - row.started_at);
  const targetMs = row.target_hours * 3600000;
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    targetHours: row.target_hours,
    startedAt: row.started_at,
    endedAt,
    note: row.note || '',
    durationMs,
    reachedGoal: endedAt !== null && durationMs >= targetMs,
  };
}

function clampTarget(value: unknown): number {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return 16;
  // Quarter-hour granularity keeps a custom target tidy without rejecting 16.5.
  return Math.min(MAX_TARGET_HOURS, Math.max(MIN_TARGET_HOURS, Math.round(hours * 4) / 4));
}

function cleanScheduleId(value: unknown): string {
  const id = String(value ?? '').trim().toLowerCase();
  // Slug characters only: the id is echoed back to the UI to look up a label.
  const safe = id.replace(/[^a-z0-9:_-]/g, '');
  return safe.slice(0, 32) || 'custom';
}

export function getActiveSession(userKey: string): FastingSessionRow | null {
  const row = db
    .prepare(
      `SELECT * FROM fasting_sessions
        WHERE user_key = ? AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1`,
    )
    .get(userKey);
  return row ? toSession(row, Date.now()) : null;
}

/** Thrown when Start is pressed while a fast is already running. */
export class ActiveFastError extends Error {
  session: FastingSessionRow;
  constructor(session: FastingSessionRow) {
    super('A fast is already running.');
    this.session = session;
  }
}

export function startFast(
  userKey: string,
  scheduleIdInput: unknown,
  targetHoursInput: unknown,
  startedAtInput?: unknown,
): FastingSessionRow {
  const existing = getActiveSession(userKey);
  if (existing) {
    throw new ActiveFastError(existing);
  }

  const now = Date.now();
  const scheduleId = cleanScheduleId(scheduleIdInput);
  const targetHours = clampTarget(targetHoursInput);

  // A backdated start lets someone log the fast from their last real meal
  // rather than from the moment they opened the app. Clamped so a wrong device
  // clock or a hand-edited request cannot create a fast that starts in the
  // future or claims to have been running for a month.
  let startedAt = now;
  const requested = Number(startedAtInput);
  if (Number.isFinite(requested) && requested > 0) {
    startedAt = Math.min(now, Math.max(now - MAX_BACKDATE_MS, Math.floor(requested)));
  }

  const id = newId();
  db.prepare(
    `INSERT INTO fasting_sessions
       (id, user_key, schedule_id, target_hours, started_at, ended_at, note, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, '', ?)`,
  ).run(id, userKey, scheduleId, targetHours, startedAt, now);

  db.prepare(
    `INSERT INTO fasting_prefs (user_key, schedule_id, target_hours, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_key) DO UPDATE SET
       schedule_id = excluded.schedule_id,
       target_hours = excluded.target_hours,
       updated_at = excluded.updated_at`,
  ).run(userKey, scheduleId, targetHours, now);

  return toSession(db.prepare('SELECT * FROM fasting_sessions WHERE id = ?').get(id), now);
}

/** Ends the running fast and keeps it in history. Returns null if none was running. */
export function stopFast(userKey: string, note?: unknown): FastingSessionRow | null {
  const active = getActiveSession(userKey);
  if (!active) return null;

  const now = Date.now();
  const cleanNote = String(note ?? '').trim().slice(0, 300);
  db.prepare('UPDATE fasting_sessions SET ended_at = ?, note = ? WHERE id = ?').run(
    now,
    cleanNote,
    active.id,
  );
  return toSession(
    db.prepare('SELECT * FROM fasting_sessions WHERE id = ?').get(active.id),
    now,
  );
}

/** Throws the running fast away without recording it - for a mistaken start. */
export function discardActiveFast(userKey: string): boolean {
  const result = db
    .prepare('DELETE FROM fasting_sessions WHERE user_key = ? AND ended_at IS NULL')
    .run(userKey);
  return Number(result.changes) > 0;
}

export function deleteSession(userKey: string, sessionId: string): boolean {
  const result = db
    .prepare('DELETE FROM fasting_sessions WHERE id = ? AND user_key = ?')
    .run(sessionId, userKey);
  return Number(result.changes) > 0;
}

/**
 * Finished fasts, newest first. The default window is wide enough for the
 * client to work out a day streak and still show a couple of months of history
 * without paging.
 */
export function listSessions(userKey: string, limit = 90): FastingSessionRow[] {
  const capped = Math.min(365, Math.max(1, Number(limit) || 90));
  const rows = db
    .prepare(
      `SELECT * FROM fasting_sessions
        WHERE user_key = ? AND ended_at IS NOT NULL
        ORDER BY started_at DESC LIMIT ?`,
    )
    .all(userKey, capped);
  const now = Date.now();
  return rows.map((row) => toSession(row, now));
}

export interface FastingTotals {
  /** Finished fasts on record, all time - not just the page that was returned. */
  sessionCount: number;
  /** Finished fasts that reached their own target. */
  goalCount: number;
  totalHours: number;
  longestHours: number;
}

export function totalsFor(userKey: string): FastingTotals {
  const row = db
    .prepare(
      `SELECT
         COUNT(*)                                AS session_count,
         COALESCE(SUM(ended_at - started_at), 0) AS total_ms,
         COALESCE(MAX(ended_at - started_at), 0) AS longest_ms,
         COALESCE(SUM(
           CASE WHEN (ended_at - started_at) >= target_hours * 3600000
                THEN 1 ELSE 0 END), 0)           AS goal_count
       FROM fasting_sessions
       WHERE user_key = ? AND ended_at IS NOT NULL`,
    )
    .get(userKey) as any;

  return {
    sessionCount: Number(row?.session_count || 0),
    goalCount: Number(row?.goal_count || 0),
    totalHours: Number(row?.total_ms || 0) / 3600000,
    longestHours: Number(row?.longest_ms || 0) / 3600000,
  };
}

export function lastScheduleFor(
  userKey: string,
): { scheduleId: string; targetHours: number } | null {
  const row = db
    .prepare('SELECT schedule_id, target_hours FROM fasting_prefs WHERE user_key = ?')
    .get(userKey) as any;
  if (!row) return null;
  return { scheduleId: row.schedule_id, targetHours: Number(row.target_hours) };
}

// --- Personal data (POPIA) ---------------------------------------------------

/** Every fast and the saved schedule for one person, for "download my data". */
export function exportFastingData(userKey: string) {
  return {
    sessions: db
      .prepare(
        `SELECT id, schedule_id AS scheduleId, target_hours AS targetHours, started_at AS startedAt,
                ended_at AS endedAt, note FROM fasting_sessions WHERE user_key = ? ORDER BY started_at`,
      )
      .all(userKey),
    preferences: db
      .prepare('SELECT schedule_id AS scheduleId, target_hours AS targetHours FROM fasting_prefs WHERE user_key = ?')
      .get(userKey) ?? null,
  };
}

/** Permanently erases one person's fasting history and preferences. */
export function purgeFastingData(userKey: string): number {
  const removed = db.prepare('DELETE FROM fasting_sessions WHERE user_key = ?').run(userKey);
  db.prepare('DELETE FROM fasting_prefs WHERE user_key = ?').run(userKey);
  return Number(removed.changes);
}
