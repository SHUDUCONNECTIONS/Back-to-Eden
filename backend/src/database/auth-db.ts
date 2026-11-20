/**
 * Accounts and sign-in sessions.
 *
 * Passwords are hashed with scrypt (built into node:crypto) using a per-user
 * random salt, and compared in constant time. Sessions are random 256-bit
 * tokens; only their SHA-256 hash is stored, so a copy of this database does
 * not hand out working sign-ins.
 *
 * A user's `key` everywhere else in the backend (post authors, reactions,
 * fasting history) is their lower-cased email, exactly as it was under the old
 * header-based identity, so existing rows keep belonging to the same person.
 *
 * Known gap: email addresses are not verified yet. Anyone can register any
 * address that is not already taken. Addresses in ADMIN_EMAILS are therefore
 * refused at registration and can only be given a password from the server
 * (see src/cli/set-password.ts), so moderator access cannot be claimed by
 * registering an admin's address first.
 */

import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

import { DATA_DIR } from './data-dir';
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'auth.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email         TEXT PRIMARY KEY,
    name          TEXT    NOT NULL,
    password_hash TEXT,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    email       TEXT    NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions (email);
`);

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;
const KEY_LENGTH = 64;

export interface AuthUser {
  email: string;
  name: string;
}

export function normaliseEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().slice(0, 200);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function cleanName(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

// ------------------------------------------------------------------ passwords

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function checkPassword(password: string, stored: string | null): Promise<boolean> {
  const [scheme, saltB64, hashB64] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) {
    // Still do the work, so "no such user" and "wrong password" take the same
    // time and an attacker cannot use timing to discover which emails exist.
    await scrypt(password, randomBytes(16), KEY_LENGTH);
    return false;
  }
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------- users

export function findUser(email: string): (AuthUser & { passwordHash: string | null }) | null {
  const row = db
    .prepare('SELECT email, name, password_hash FROM users WHERE email = ?')
    .get(normaliseEmail(email)) as any;
  return row ? { email: row.email, name: row.name, passwordHash: row.password_hash } : null;
}

export async function createUser(email: string, name: string, password: string): Promise<AuthUser> {
  const user = { email: normaliseEmail(email), name: cleanName(name) };
  db.prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    user.email,
    user.name,
    await hashPassword(password),
    Date.now(),
  );
  return user;
}

/** Creates the account if needed and (re)sets its password. Used by the CLI. */
export async function setPassword(email: string, name: string, password: string): Promise<AuthUser> {
  const key = normaliseEmail(email);
  const hash = await hashPassword(password);
  const existing = findUser(key);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, key);
    // A password change signs out every existing session.
    db.prepare('DELETE FROM sessions WHERE email = ?').run(key);
    return { email: key, name: existing.name };
  }
  db.prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    key,
    cleanName(name) || key.split('@')[0],
    hash,
    Date.now(),
  );
  return { email: key, name: cleanName(name) || key.split('@')[0] };
}

/** Returns the user when the password matches, otherwise null. */
export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  const user = findUser(email);
  const ok = await checkPassword(password, user?.passwordHash ?? null);
  return ok && user ? { email: user.email, name: user.name } : null;
}

// ------------------------------------------------------------------- sessions

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(email: string): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  db.prepare('INSERT INTO sessions (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    normaliseEmail(email),
    now,
    expiresAt,
  );
  return { token, expiresAt };
}

/** The signed-in user for a session token, or null if it is unknown or expired. */
export function userForToken(token: string): (AuthUser & { policyVersion: string | null }) | null {
  if (!token || token.length > 200) return null;
  const row = db
    .prepare(
      `SELECT u.email, u.name, u.policy_version, s.expires_at FROM sessions s
         JOIN users u ON u.email = s.email
        WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as any;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    deleteSession(token);
    return null;
  }
  return { email: row.email, name: row.name, policyVersion: row.policy_version ?? null };
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

/** Housekeeping: drop expired sessions. Cheap; called on each sign-in. */
export function pruneSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

// --------------------------------------------------------- consent (POPIA)

/**
 * The privacy policy version people must accept. Bump it whenever the policy
 * changes in a way users should agree to again; everyone whose recorded
 * version differs is asked on their next visit. Keep in step with
 * frontend/src/content/privacyPolicy.ts.
 */
export const PRIVACY_POLICY_VERSION = '2026-11-16';

for (const [column, type] of [
  ['policy_version', 'TEXT'],
  ['policy_accepted_at', 'INTEGER'],
] as const) {
  const columns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE users ADD COLUMN ${column} ${type}`);
}

export function recordConsent(email: string): void {
  db.prepare('UPDATE users SET policy_version = ?, policy_accepted_at = ? WHERE email = ?').run(
    PRIVACY_POLICY_VERSION,
    Date.now(),
    normaliseEmail(email),
  );
}

export function needsConsent(email: string): boolean {
  const row = db.prepare('SELECT policy_version FROM users WHERE email = ?').get(normaliseEmail(email)) as any;
  return !row || row.policy_version !== PRIVACY_POLICY_VERSION;
}

/** The account record itself, for "download my data". Never includes the password hash. */
export function exportAccount(email: string) {
  const row = db
    .prepare(
      `SELECT email, name, created_at AS createdAt, policy_version AS privacyPolicyVersion,
              policy_accepted_at AS privacyPolicyAcceptedAt FROM users WHERE email = ?`,
    )
    .get(normaliseEmail(email)) as any;
  const sessions = db
    .prepare('SELECT created_at AS signedInAt, expires_at AS expiresAt FROM sessions WHERE email = ?')
    .all(normaliseEmail(email));
  return { ...row, activeSessions: sessions };
}

/** Deletes the account and, through ON DELETE CASCADE, all its sessions. */
export function deleteUser(email: string): void {
  db.prepare('DELETE FROM users WHERE email = ?').run(normaliseEmail(email));
}
