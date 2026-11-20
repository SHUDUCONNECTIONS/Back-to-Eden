/**
 * Machine translations, kept on disk so each UI string is paid for once -
 * not once per server restart. Keyed by (locale, English source string).
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import { DATA_DIR } from './data-dir';
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'translations.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS translations (
    locale      TEXT NOT NULL,
    source      TEXT NOT NULL,
    translated  TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (locale, source)
  );
`);

const select = db.prepare('SELECT translated FROM translations WHERE locale = ? AND source = ?');
const insert = db.prepare(
  'INSERT OR REPLACE INTO translations (locale, source, translated, created_at) VALUES (?, ?, ?, ?)',
);
const countFor = db.prepare('SELECT count(*) AS n FROM translations WHERE locale = ?');

export function getTranslation(locale: string, source: string): string | null {
  const row = select.get(locale, source) as { translated: string } | undefined;
  return row?.translated ?? null;
}

export function saveTranslation(locale: string, source: string, translated: string): void {
  insert.run(locale, source, translated, Date.now());
}

export function translationCount(locale: string): number {
  return Number((countFor.get(locale) as { n: number }).n);
}
