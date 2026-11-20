/**
 * Persistence for the shared grocery lists ("sync rooms").
 *
 * A room is one JSON document keyed by its code, stored in data/sync.db so a
 * list survives restarts and redeploys. The code is the only secret: anyone
 * who knows it can read and write the list, which is the point (you share it
 * with your own second device or your household). That is why codes are long
 * and random, why misses are rate limited (sync.controller.ts), and why
 * nothing private belongs in a list.
 *
 * Rooms nobody has touched for ROOM_TTL_DAYS are deleted.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import { DATA_DIR } from './data-dir';
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'sync.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code        TEXT PRIMARY KEY,
    data        TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rooms_updated ON rooms (updated_at);
`);

export const ROOM_TTL_DAYS = 90;

export function loadRoom<T>(code: string): T | null {
  const row = db.prepare('SELECT data FROM rooms WHERE code = ?').get(code) as any;
  if (!row) return null;
  try {
    return JSON.parse(row.data) as T;
  } catch {
    return null;
  }
}

export function saveRoom(code: string, data: unknown): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO rooms (code, data, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(code, JSON.stringify(data), now, now);
}

/** Deletes rooms idle for longer than ROOM_TTL_DAYS. Returns how many went. */
export function pruneRooms(): number {
  const cutoff = Date.now() - ROOM_TTL_DAYS * 24 * 60 * 60 * 1000;
  const result = db.prepare('DELETE FROM rooms WHERE updated_at < ?').run(cutoff);
  return Number(result.changes);
}
