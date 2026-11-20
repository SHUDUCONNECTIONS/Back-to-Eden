#!/usr/bin/env node
/**
 * Writes backend/schema.sql: the complete database schema, generated from the
 * code itself so it can never drift from what the server really creates.
 *
 *   npm run schema           regenerate schema.sql (after "npm run build")
 *   npm run schema -- --check  exit 1 if schema.sql is out of date (used by the tests)
 *
 * How: loads each compiled database module against an empty temporary data
 * folder - the modules create their tables on load, exactly as the server does
 * on first start - then reads the definitions back out of SQLite.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(BACKEND, 'schema.sql');
const DIST = path.join(BACKEND, 'dist', 'database');

const DATABASES = [
  ['auth.db', 'auth-db.js', 'Accounts and sign-in sessions'],
  ['community.db', 'community-db.js', 'Community Kitchen: recipes, reactions, comments, reports'],
  ['fasting.db', 'fasting-db.js', 'Fasting history (health information)'],
  ['sync.db', 'sync-db.js', 'Grocery lists shared by code'],
  ['translations.db', 'translations-db.js', 'Cached machine translations of interface text'],
];

export function generateSchema() {
  if (!fs.existsSync(DIST)) throw new Error('dist/ missing - run "npm run build" first');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-schema-'));
  process.env.DATA_DIR = dir;
  const require = createRequire(import.meta.url);
  for (const [, mod] of DATABASES) require(path.join(DIST, mod));

  const parts = [
    '-- Back To Eden database schema (SQLite)',
    '--',
    '-- GENERATED FILE - do not edit by hand. The schema lives in',
    '-- backend/src/database/*.ts and is created automatically when the server',
    '-- starts. Regenerate this file after changing it:',
    '--',
    '--   cd backend && npm run build && npm run schema',
    '--',
    '-- Five separate database files, one per feature. Members are referred to',
    '-- across files by their lower-case email (author_key, user_key,',
    '-- reporter_key, reviewed_by); see docs/BTE-DOC-03 Data Model and ERDs.pdf.',
    '-- Times are milliseconds since 1970 UTC; money is South African rand.',
  ];

  for (const [file, , about] of DATABASES) {
    const db = new DatabaseSync(path.join(dir, file), { readOnly: true });
    const rows = db
      .prepare(
        `SELECT type, name, sql FROM sqlite_master
          WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
          ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, rowid`,
      )
      .all();
    db.close();
    parts.push('', '', `-- ${'='.repeat(74)}`, `-- ${file}: ${about}`, `-- ${'='.repeat(74)}`);
    for (const row of rows) {
      // SQLite keeps the CREATE text as written; tidy the indentation only.
      const sql = row.sql
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .map((l, i) => (i === 0 ? l.trim() : '  ' + l.trim()))
        .join('\n')
        .replace(/\n {2}\)$/, '\n)')
        // Columns added later by ALTER TABLE are stored as ", a, b)" on the
        // last line. Give each its own line so the table reads normally.
        .replace(/\n {2}, ([^\n]*)\)$/, (_, added) =>
          `,\n  -- added by later versions (upgraded in place at start-up)\n${added
            .split(/, (?=[a-z_]+ [A-Z])/)
            .map((col) => `  ${col}`)
            .join(',\n')}\n)`,
        );
      parts.push('', `${sql};`);
    }
  }

  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Windows can hold the files briefly; the OS cleans its temp folder.
  }
  return parts.join('\n') + '\n';
}

// Run as a script (not when imported by a test).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const schema = generateSchema();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (current !== schema) {
      console.error('schema.sql is out of date. Run: npm run build && npm run schema');
      process.exit(1);
    }
    console.log('schema.sql is up to date.');
  } else {
    fs.writeFileSync(OUT, schema);
    console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
  }
}
