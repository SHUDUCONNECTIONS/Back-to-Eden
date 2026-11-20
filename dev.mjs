#!/usr/bin/env node
/**
 * Starts the backend and the web frontend together.
 *
 *   node dev.mjs            backend + frontend
 *   node dev.mjs backend    just the API
 *   node dev.mjs frontend   just the web app
 *   node dev.mjs mobile     Expo (Metro) only
 *
 * Why a script instead of npm scripts: this folder's name contains an "&",
 * which breaks npm's Windows .bin shims ("'-grocery-sync\\node_modules\\.bin\\'
 * is not recognized"). Spawning node directly with an explicit cwd sidesteps
 * the shell entirely, so this works the same on every platform.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const TARGETS = {
  backend: {
    label: 'api',
    colour: '\x1b[32m',
    cwd: path.join(root, 'backend'),
    // Built output, not ts-node: NestJS needs emitDecoratorMetadata, and the
    // compiled bundle starts in a fraction of the time.
    args: [path.join(root, 'backend', 'dist', 'main.js')],
    env: { PORT: process.env.PORT || '3001' },
    precheck() {
      const built = path.join(root, 'backend', 'dist', 'main.js');
      if (!existsSync(built)) {
        return 'backend/dist is missing. Build it first:\n' +
          '  cd backend && node node_modules/typescript/bin/tsc -p tsconfig.build.json';
      }
      return null;
    },
  },
  frontend: {
    label: 'web',
    colour: '\x1b[36m',
    cwd: path.join(root, 'frontend'),
    args: [path.join(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js')],
    env: {},
  },
  mobile: {
    label: 'expo',
    colour: '\x1b[35m',
    cwd: path.join(root, 'mobile'),
    args: [path.join(root, 'mobile', 'node_modules', 'expo', 'bin', 'cli'), 'start'],
    env: {},
  },
};

const requested = process.argv.slice(2);
const names = requested.length > 0 ? requested : ['backend', 'frontend'];

const unknown = names.filter((n) => !TARGETS[n]);
if (unknown.length > 0) {
  console.error(`Unknown target(s): ${unknown.join(', ')}`);
  console.error(`Available: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

const children = [];

for (const name of names) {
  const target = TARGETS[name];

  const problem = target.precheck?.();
  if (problem) {
    console.error(`\n[${name}] ${problem}\n`);
    process.exit(1);
  }

  const child = spawn(process.execPath, target.args, {
    cwd: target.cwd,
    env: { ...process.env, ...target.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prefix = `${target.colour}[${target.label}]\x1b[0m `;
  const write = (stream) => (chunk) => {
    const text = chunk.toString();
    for (const line of text.split('\n')) {
      if (line.trim()) stream.write(prefix + line + '\n');
    }
  };
  child.stdout.on('data', write(process.stdout));
  child.stderr.on('data', write(process.stderr));

  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    // One process dying makes the rest useless, so take them all down rather
    // than leaving a half-running stack that looks healthy.
    for (const other of children) {
      if (other !== child && !other.killed) other.kill();
    }
    process.exit(code ?? 0);
  });

  children.push(child);
}

const shutdown = () => {
  for (const child of children) if (!child.killed) child.kill();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`\nStarted: ${names.join(', ')}`);
if (names.includes('frontend')) console.log('  web  http://localhost:5173');
if (names.includes('backend')) console.log(`  api  http://localhost:${process.env.PORT || 3001}/api`);
console.log('');
