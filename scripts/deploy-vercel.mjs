#!/usr/bin/env node
/**
 * Puts the web app on Vercel for client previews, with the server staying on
 * this PC (Docker on :8081, reached through a Cloudflare tunnel).
 *
 *   node scripts/deploy-vercel.mjs https://<name>.trycloudflare.com
 *
 * Vercel serves the built web app and forwards /api/* and /uploads/* to the
 * tunnel, so the browser sees one address: no CORS, no code changes. Run it
 * again whenever the tunnel address changes (every tunnel restart).
 *
 * Sign-in: either run  npx vercel@66.5.0 login  once, or create a token at
 * https://vercel.com/account/tokens and save it (only the token, one line) in
 * .vercel-deploy/token - that folder is git-ignored. VERCEL_TOKEN also works.
 *
 * Vercel cannot run the server itself: its disk is wiped between requests,
 * and the server keeps its data in SQLite files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERCEL = 'npx --yes vercel@66.5.0';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The folder name becomes the Vercel project name.
const out = path.join(root, '.vercel-deploy', 'back-to-eden-preview');

const tunnel = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(tunnel)) {
  console.error('Usage: node scripts/deploy-vercel.mjs https://<name>.trycloudflare.com');
  process.exit(1);
}

// 1. The server must answer through the tunnel, or the preview is a blank shell.
const health = await fetch(`${tunnel}/api/health`).then((r) => r.ok, () => false);
if (!health) {
  console.error(`${tunnel}/api/health does not answer. Start Docker and the tunnel first.`);
  process.exit(1);
}

// 2. Build the web app.
console.log('Building the web app…');
execSync('npm run build', { cwd: path.join(root, 'frontend'), stdio: 'inherit' });

// 3. Assemble the static site, keeping Vercel's project link (.vercel/) between runs.
fs.mkdirSync(out, { recursive: true });
for (const entry of fs.readdirSync(out)) {
  if (entry !== '.vercel') fs.rmSync(path.join(out, entry), { recursive: true, force: true });
}
fs.cpSync(path.join(root, 'frontend', 'dist'), out, { recursive: true });

fs.writeFileSync(
  path.join(out, 'vercel.json'),
  JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      rewrites: [
        { source: '/api/:path*', destination: `${tunnel}/api/:path*` },
        { source: '/uploads/:path*', destination: `${tunnel}/uploads/:path*` },
        // Any other path is a screen inside the app.
        { source: '/(.*)', destination: '/index.html' },
      ],
      headers: [
        {
          source: '/assets/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        },
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ],
        },
      ],
    },
    null,
    2,
  ) + '\n',
);

// 4. Deploy as a plain static site (no build on Vercel's side).
const tokenFile = path.join(root, '.vercel-deploy', 'token');
const token =
  process.env.VERCEL_TOKEN ||
  (fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '');
console.log('Deploying to Vercel…');
execSync(`${VERCEL} deploy --prod --yes`, {
  cwd: out,
  stdio: 'inherit',
  // Passed through the environment, so it never appears in a command line or log.
  env: token ? { ...process.env, VERCEL_TOKEN: token } : process.env,
});
console.log(`\nAPI requests are forwarded to ${tunnel}`);
