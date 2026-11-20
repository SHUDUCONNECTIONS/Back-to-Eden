import fs from 'node:fs';
import path from 'node:path';

/**
 * Where every database, photo and snapshot lives.
 *
 * Defaults to backend/data (or /app/data in the Docker image). Override with
 * the DATA_DIR environment variable - the test suite does, so tests run
 * against a throwaway folder and never touch real data. It must be set in the
 * process environment, not in .env: the database modules open their files as
 * soon as they are imported, before main.ts loads .env.
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '..', '..', 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });
