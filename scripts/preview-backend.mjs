#!/usr/bin/env node
/**
 * Points the Vercel preview at a new server address.
 *
 *   node scripts/preview-backend.mjs https://<name>.trycloudflare.com
 *   git commit -am "Preview: new tunnel address" && git push
 *
 * The preview (frontend/vercel.json, Vercel project Root Directory = frontend) serves the web app from Vercel and forwards
 * /api and /uploads to the server running on the development PC through a
 * Cloudflare quick tunnel. Quick tunnels get a new address on every restart,
 * so after restarting one, run this and push: Vercel redeploys on push.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'vercel.json');
const url = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url)) {
  console.error('Usage: node scripts/preview-backend.mjs https://<name>.trycloudflare.com');
  process.exit(1);
}

const ok = await fetch(`${url}/api/health`).then((r) => r.ok, () => false);
if (!ok) console.warn(`Warning: ${url}/api/health does not answer yet (new tunnels can take a minute).`);

const config = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const rule of config.rewrites) {
  // Only the forwarding rules point outside; the app's own fallback stays.
  rule.destination = rule.destination.replace(/^https:\/\/[^/]+/, url);
}
fs.writeFileSync(
  file,
  JSON.stringify(config, null, 2).replace(/\{\n\s+"source": "([^"]+)",\n\s+"destination": "([^"]+)"\n\s+\}/g, '{ "source": "$1", "destination": "$2" }') + '\n',
);
console.log(`vercel.json now forwards /api and /uploads to ${url}`);
console.log('Commit and push to redeploy the preview.');
