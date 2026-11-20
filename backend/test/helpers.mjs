/**
 * Test harness: starts the real compiled server (dist/main.js) on a free port
 * with its own throwaway data folder, and talks to it over HTTP - the same
 * way the web and mobile apps do. Nothing here touches backend/data.
 *
 * Run with: npm test   (builds first, then node --test)
 */

import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAIN = path.join(BACKEND, 'dist', 'main.js');

export const MODERATOR = { email: 'moderator@test.example', name: 'Test Moderator', password: 'moderator-pass-1' };
export const PASSWORD = 'test-password-1';

/** A 1x1 PNG, for photo uploads. */
export const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/**
 * Starts a server. Pass `dataDir` to reuse a folder (e.g. to test that data
 * survives a restart); otherwise a fresh temporary one is created.
 */
export async function startServer({ dataDir } = {}) {
  if (!fs.existsSync(MAIN)) throw new Error('dist/main.js missing - run "npm run build" first');
  const dir = dataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'eden-test-'));
  const port = await freePort();
  const env = {
    ...process.env,
    DATA_DIR: dir,
    PORT: String(port),
    ADMIN_EMAILS: MODERATOR.email,
    GEMINI_API_KEY: '',
    BACKUPS: 'off',
    WEB_DIR: path.join(dir, 'no-web-app'),
  };

  // The moderator's password can only be set on the server, like in production.
  if (!dataDir) {
    execFileSync(process.execPath, [path.join(BACKEND, 'dist', 'cli', 'set-password.js'), MODERATOR.email, MODERATOR.name], {
      env,
      input: `${MODERATOR.password}\n`,
      stdio: ['pipe', 'ignore', 'pipe'],
    });
  }

  const child = spawn(process.execPath, [MAIN], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));

  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) break;
    } catch {}
    if (child.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    await new Promise((r) => setTimeout(r, 100));
    if (i === 99) throw new Error(`server did not become healthy:\n${log}`);
  }

  const server = {
    base,
    dataDir: dir,
    log: () => log,
    async api(method, route, { token, body, headers = {} } = {}) {
      const res = await fetch(base + route, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      return { status: res.status, body: json, text };
    },
    async register(name, email, password = PASSWORD) {
      const res = await server.api('POST', '/api/auth/register', {
        body: { name, email, password, acceptedPrivacyPolicy: true },
      });
      if (res.status !== 201) throw new Error(`register ${email} -> ${res.status} ${res.text}`);
      return res.body.token;
    },
    async login(email, password = PASSWORD) {
      const res = await server.api('POST', '/api/auth/login', { body: { email, password } });
      if (res.status !== 200) throw new Error(`login ${email} -> ${res.status} ${res.text}`);
      return res.body.token;
    },
    /** Opens one of the server's SQLite files directly, for checks the API cannot make. */
    db(name) {
      return new DatabaseSync(path.join(dir, name));
    },
    async stop({ keepData = false } = {}) {
      if (child.exitCode === null) {
        const exited = new Promise((r) => child.once('exit', r));
        child.kill();
        await exited;
      }
      if (!keepData && !dataDir) fs.rmSync(dir, { recursive: true, force: true });
    },
  };
  return server;
}

/** A minimal valid recipe post. */
export function recipe(title, extra = {}) {
  return {
    title,
    description: 'A test recipe',
    servings: 2,
    ingredients: [{ name: 'Beans', amount: '1 tin', costZar: 14 }],
    steps: ['Cook it'],
    ...extra,
  };
}
