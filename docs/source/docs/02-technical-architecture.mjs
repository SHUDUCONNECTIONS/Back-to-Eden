import { table, note, control, figure, blocks, c, code } from '../lib.mjs';

const context = blocks(
  [
    { id: 'web', x: 20, y: 20, w: 200, h: 70, title: 'Web app', sub: 'React 19 + Vite\nany browser', kind: 'client' },
    { id: 'phone', x: 250, y: 20, w: 200, h: 70, title: 'Phone app', sub: 'Expo SDK 58 / React Native\nAndroid and iOS', kind: 'client' },
    { id: 'edge', x: 120, y: 140, w: 230, h: 56, title: 'HTTPS front door', sub: 'host proxy or Cloudflare tunnel' },
    { id: 'api', x: 120, y: 250, w: 230, h: 76, title: 'Back To Eden server', sub: 'NestJS 11 on Node 24\nAPI + serves the web app', kind: 'core' },
    { id: 'data', x: 20, y: 380, w: 200, h: 80, title: 'Data volume', sub: '5 SQLite databases\nuploaded photos\nnightly backups', kind: 'store' },
    { id: 'gem', x: 520, y: 260, w: 190, h: 56, title: 'Google Gemini', sub: 'optional: AI recipes, translation', kind: 'ext' },
    { id: 'op', x: 520, y: 140, w: 190, h: 56, title: 'Server operator', sub: 'set passwords, config, restore' , kind: 'ext'},
    { id: 'files', x: 250, y: 380, w: 200, h: 80, title: 'Shared code', sub: 'shared/types.ts\nshared/i18n (11 languages)' },
  ],
  [
    { from: 'web', to: 'edge', label: 'HTTPS JSON + Bearer token' , dx: -150, anchor: 'start', lx: 22, ly: 118},
    { from: 'phone', to: 'edge', },
    { from: 'edge', to: 'api', label: 'HTTP :3001', dx: 8 },
    { from: 'api', to: 'data', fromSide: 'b', toSide: 't', label: 'read / write', lx: 60, ly: 360 },
    { from: 'api', to: 'gem', fromSide: 'r', toSide: 'l', dashed: true, label: 'HTTPS (if key set)', lx: 372, ly: 272 },
    { from: 'op', to: 'api', fromSide: 'l', toSide: 'r', dashed: true, label: 'docker exec / env', lx: 372, ly: 220 },
    { from: 'files', to: 'api', fromSide: 't', toSide: 'b', dashed: true, label: 'compiled into', lx: 352, ly: 360 },
  ],
  730, 480,
);

const deploy = blocks(
  [
    { id: 'host', x: 20, y: 20, w: 690, h: 300, title: '', kind: 'ext' },
    { id: 'ct', x: 50, y: 60, w: 400, h: 230, title: '' },
    { id: 'node', x: 80, y: 90, w: 340, h: 70, title: 'node dist/main.js  (port 3001)', sub: '/api/*  ->  NestJS controllers\n/uploads/*  /assets/*  /  ->  static files', kind: 'core' },
    { id: 'pub', x: 80, y: 190, w: 160, h: 70, title: '/app/public', sub: 'built web app' },
    { id: 'vol', x: 500, y: 90, w: 180, h: 170, title: '/app/data (volume)', sub: 'auth.db\ncommunity.db\nfasting.db\nsync.db\ntranslations.db\nuploads/  backups/', kind: 'store' },
    { id: 'env', x: 260, y: 190, w: 160, h: 70, title: 'Environment', sub: 'ADMIN_EMAILS, GEMINI_API_KEY\nCORS_ORIGINS, BACKUP_*' },
  ],
  [
    { from: 'node', to: 'vol', fromSide: 'r', toSide: 'l', both: true, label: 'node:sqlite', lx: 452, ly: 100 },
    { from: 'node', to: 'pub', fromSide: 'b', toSide: 't' },
  ],
  730, 340,
).replace('</svg>', '<text x="36" y="44" class="node-title">Host (Docker): Railway, a VPS, or a PC with a tunnel</text><text x="66" y="82" class="node-sub">Container: image "backtoeden" (node:24-slim), healthcheck GET /api/health</text></svg>');

const signin = blocks(
  [
    { id: 'c', x: 20, y: 20, w: 150, h: 40, title: 'App (web/phone)', kind: 'client' },
    { id: 'a', x: 290, y: 20, w: 150, h: 40, title: 'Auth controller', kind: 'core' },
    { id: 'd', x: 560, y: 20, w: 150, h: 40, title: 'auth.db', kind: 'store' },
  ],
  [],
  730, 380,
).replace('</svg>', (() => {
  const lane = (x) => `<line x1="${x}" y1="60" x2="${x}" y2="370" class="edge dashed"/>`;
  const msg = (y, x1, x2, t) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="edge" marker-end="url(#arrow)"/><text x="${(x1 + x2) / 2}" y="${y - 5}" class="edge-label" text-anchor="middle">${t}</text>`;
  return lane(95) + lane(365) + lane(635) +
    msg(95, 95, 365, 'POST /api/auth/login {email, password}') +
    msg(130, 365, 635, 'look up user, verify scrypt hash') +
    msg(165, 635, 365, 'user row (or none)') +
    msg(200, 365, 635, 'store sha256(token), expires +30 days') +
    msg(235, 365, 95, '{ user, token }  (token shown once)') +
    msg(280, 95, 365, 'any API call: Authorization: Bearer token') +
    msg(315, 365, 635, 'find session by sha256(token), check expiry') +
    msg(350, 365, 95, 'result, or 401 -> app signs the person out') + '</svg>';
})());

export default {
  slug: '02-Technical-Architecture',
  number: 'BTE-DOC-02',
  title: 'Technical Architecture',
  subtitle: 'How Back To Eden is built, deployed and secured',
  audience: 'Developers, technical reviewers, hosting and operations staff',
  sections: [
    {
      title: 'Overview',
      html: `
<p>Back To Eden is three applications sharing one server:</p>
<ul>
<li><strong>Web app</strong>: a single-page React application, the full product.</li>
<li><strong>Phone app</strong>: an Expo (React Native) app with the feed, fasting timer and account.</li>
<li><strong>Server</strong>: a NestJS application that provides the JSON API, stores data in SQLite files and, in production, also serves the built web app. One process, one address, one data folder.</li>
</ul>
${figure(context, 'Figure 2.1 System context. Solid lines are always present; dashed lines are optional or operator actions.')}
<p>The design favours few moving parts: no separate database server, no message queue and no third-party sign-in service. That keeps hosting cheap and simple for a community-sized launch. Section 9 sets out where this stops being enough.</p>`,
    },
    {
      title: 'Technology stack',
      html: `
${table(['Layer', 'Technology', 'Version', 'Notes'], [
  ['Server runtime', 'Node.js', '24', 'Uses the built-in <code>node:sqlite</code> module, so no native database driver is needed.'],
  ['Server framework', 'NestJS on Express', '11 / 4.21', 'Controllers, guards and modules.'],
  ['Database', 'SQLite (via node:sqlite)', 'bundled with Node', 'Five database files; accounts, community and fasting use WAL journal mode.'],
  ['AI (optional)', 'Google Gemini through @google/genai', '2.4', 'Recipe ideas and machine translation. Off unless a key is set.'],
  ['Web framework', 'React', '19', 'Single-page app.'],
  ['Web build', 'Vite', '8', 'Code-splitting: each language is a separate download.'],
  ['Web styling', 'Tailwind CSS', '4', 'Utility classes.'],
  ['Web libraries', 'lucide-react (icons), motion (animation), qrcode (sync QR codes)', '', ''],
  ['Phone app', 'Expo, React Native, React', 'SDK 58, 0.88, 19.3', 'expo-secure-store holds the session token.'],
  ['Language', 'TypeScript', '5.7 (server, web), 6.0 (phone)', 'Shared types in <code>shared/types.ts</code>.'],
  ['Packaging', 'Docker (node:24-slim)', '', 'One image for the whole product.'],
  ['Tests', 'node:test', 'bundled with Node', 'End-to-end API tests against a real server.'],
], { widths: ['17%', '30%', '17%', '36%'] })}`,
    },
    {
      title: 'Source code layout',
      html: `
${table(['Folder', 'Contents'], [
  ['<code>backend/src/auth</code>', 'Sign-up, sign-in, sign-out, session check, consent, data export, account deletion.'],
  ['<code>backend/src/community</code>', 'Feed, posts, reactions, comments, reports; moderation controller (admin only).'],
  ['<code>backend/src/fasting</code>', 'Fasting timer, sessions, totals.'],
  ['<code>backend/src/sync</code>', 'Grocery list sync by code.'],
  ['<code>backend/src/ai</code>', 'Recipe suggestions and machine translation, with fallbacks and a daily cost cap.'],
  ['<code>backend/src/common</code>', 'Authentication guard, admin guard, rate limiter, nightly backups, health check.'],
  ['<code>backend/src/database</code>', 'One module per SQLite database: schema, queries and validation.'],
  ['<code>backend/schema.sql</code>', 'The full database schema in one file, generated from the code (<code>npm run schema</code>).'],
  ['<code>backend/src/cli</code>', '<code>set-password</code>: sets a moderator password or resets anyone\'s.'],
  ['<code>backend/test</code>', 'Automated tests (26 tests in 5 files), including a check that <code>schema.sql</code> is current.'],
  ['<code>frontend/src/components</code>', 'Web screens: budget bar, ingredient shelf, recipes, leftover assistant, grocery list, community feed and composer, fasting, account, moderation, sign-in.'],
  ['<code>frontend/src/data</code>', 'Built-in content: foods, recipes, fasting schedules and stages, price notes.'],
  ['<code>frontend/src/i18n</code>', 'Web translation provider and language switcher.'],
  ['<code>mobile/</code>', 'Expo app: <code>App.tsx</code>, screens, API client, secure session storage, translation provider.'],
  ['<code>shared/</code>', 'Code used by both web and phone: data types and the eleven-language dictionaries.'],
  ['<code>scripts/</code>', 'Demo data seeding, translation coverage check.'],
  ['<code>docs/</code>', 'This documentation set and its source.'],
], { widths: ['30%', '70%'] })}`,
    },
    {
      title: 'Server design',
      html: `
<h3>4.1 Modules</h3>
<p>The NestJS application has six feature modules (auth, community, fasting, sync, ai, common). Each feature talks only to its own database module. The API is mounted under <code>/api</code>.</p>
<h3>4.2 Request pipeline</h3>
<ol>
<li><strong>Security headers</strong> on every response: <code>X-Content-Type-Options: nosniff</code>, <code>X-Frame-Options: DENY</code>, <code>Referrer-Policy: strict-origin-when-cross-origin</code>, a <code>Permissions-Policy</code> that turns off camera, microphone and location, and <code>Strict-Transport-Security</code> over HTTPS.</li>
<li><strong>Body parsing</strong> with a 12 MB limit (a recipe photo is sent inline as a data URL; the stored image is capped at 6 MB).</li>
<li><strong>CORS</strong>: closed by default. The web app is served from the same address, so it needs none. Extra origins can be allowed with <code>CORS_ORIGINS</code>.</li>
<li><strong>Authentication guard</strong> (global): every route requires a valid session unless marked public. It fails closed: a new route is private unless someone deliberately makes it public.</li>
<li><strong>Consent gate</strong>: a member who has not accepted the current privacy policy version can only reach <code>/api/auth/*</code> until they accept.</li>
<li><strong>Admin guard</strong> on the moderation controller: the caller's email must be in <code>ADMIN_EMAILS</code>.</li>
<li><strong>Rate limits</strong> inside the controllers (see section 6).</li>
</ol>
<h3>4.3 Static files</h3>
<p>In production the server also serves the web app from <code>/app/public</code>. Files under <code>/assets</code> have fingerprinted names and are cached for a year; <code>index.html</code> is never cached, so a new release is picked up straight away. Any unknown non-API path returns the web app, so links into the app work. Uploaded photos are served from <code>/uploads</code>.</p>
<h3>4.4 Background jobs</h3>
<ul>
<li><strong>Nightly backup</strong>: every 24 hours each database is copied with <code>VACUUM INTO</code> (a consistent snapshot, safe while the app runs) into <code>backups/</code>; snapshots older than <code>BACKUP_KEEP_DAYS</code> (default 7) are deleted.</li>
<li><strong>Clean-up</strong>: expired sessions are pruned at sign-in; grocery lists idle for 90 days are deleted.</li>
</ul>`,
    },
    {
      title: 'Authentication and sessions',
      html: `
${figure(signin, 'Figure 5.1 Sign-in and an authenticated request.')}
<ul>
<li>Passwords are hashed with <strong>scrypt</strong> (64-byte key, random salt per password). Plain passwords are never stored or logged.</li>
<li>A session token is 32 random bytes. The server stores only its SHA-256 hash, so a copy of the database cannot be used to sign in.</li>
<li>Sessions last 30 days. Signing out deletes the session; changing a password deletes all of that account's sessions.</li>
<li>The web app keeps the token in the browser's local storage; the phone app keeps it in the operating system's secure storage (Keychain or Keystore).</li>
<li>Moderators are ordinary accounts whose email is in <code>ADMIN_EMAILS</code>. Because email addresses are not verified, those addresses cannot be registered through the app; the operator sets their passwords with the <code>set-password</code> command.</li>
<li>The member's identity in other databases is their (lower-case) email address. Older versions trusted identity headers sent by the browser; the server now ignores them.</li>
</ul>`,
    },
    {
      title: 'Security controls',
      html: `
${table(['Threat', 'Control'], [
  ['Password guessing', '8 failed sign-ins per account per 15 minutes; 40 per network address. The same message for unknown email and wrong password.'],
  ['Mass account creation', '10 sign-ups per network address per hour.'],
  ['Spam and flooding', 'Per member per hour: 10 posts, 60 comments, 300 reactions, 20 reports. New posts are held for review.'],
  ['Stolen database', 'Passwords hashed with scrypt; only hashes of session tokens stored.'],
  ['Session theft', 'Tokens sent only in the Authorization header, never in URLs; HTTPS required in production (HSTS).'],
  ['Clickjacking, MIME sniffing', 'X-Frame-Options DENY, X-Content-Type-Options nosniff.'],
  ['Cross-site requests', 'CORS closed by default; tokens are not cookies, so the browser does not attach them automatically.'],
  ['Unsafe uploads', 'Only JPEG, PNG or WebP data URLs, decoded and size-checked on the server, saved under random file names.'],
  ['Over-long input', 'Every text field is trimmed and capped (titles 120, comments 1,000 characters, and so on). See BTE-DOC-04.'],
  ['SQL injection', 'All queries use bound parameters.'],
  ['Privilege escalation', 'Admin rights come only from the server\'s ADMIN_EMAILS setting and are checked on every moderation call.'],
  ['Runaway AI cost', 'Daily cap on paid model calls (AI_DAILY_LIMIT, default 500); translation only for known languages.'],
  ['Behind a proxy', 'TRUST_PROXY makes rate limits use the visitor\'s real address rather than the proxy\'s.'],
], { widths: ['26%', '74%'] })}
${note('<p><strong>Residual risks:</strong> email addresses are not verified; grocery lists are protected only by knowing the code; rate-limit counters are kept in memory and reset when the server restarts. None of these expose account or health data.</p>', 'warn')}`,
    },
    {
      title: 'Internationalisation',
      html: `
<p>Text is translated by looking up the English wording in a dictionary per language (<code>shared/i18n/strings/&lt;code&gt;.ts</code>). The English text is the key, so there are no separate message IDs to keep in step.</p>
<ul>
<li><strong>Web:</strong> <code>t('English text')</code> returns the translation. The dictionary for the chosen language is downloaded when it is picked (about 40 KB compressed). If a string is missing and a Gemini key is set, the web app asks <code>/api/translate</code> and caches the answer on the server (translations.db) and in the browser.</li>
<li><strong>Phone:</strong> the same dictionaries, loaded on demand. Placeholders such as <code>{count}</code> are filled after translation. No machine translation on the phone.</li>
<li><strong>Coverage check:</strong> <code>node scripts/i18n-missing.mjs</code> scans the web and phone code for translatable text and lists what each language is missing. At the time of writing every language covers all 1,111 strings.</li>
</ul>`,
    },
    {
      title: 'Deployment',
      html: `
${figure(deploy, 'Figure 8.1 Production deployment: one container and one data volume.')}
<p>The root <code>Dockerfile</code> builds in three stages: the web app (Vite build), the API (TypeScript compile), then a slim runtime image containing only the compiled server, production dependencies and the built web app. The container runs as the unprivileged <code>node</code> user and reports its health through <code>GET /api/health</code>.</p>
<p>Everything that must survive a redeploy lives in <code>/app/data</code>, which must be a persistent volume. Hosting options and step-by-step instructions are in the Administration and Operations Guide (BTE-DOC-05).</p>
<h3>8.1 Current state</h3>
${note('<p>At the time of writing the app runs in Docker on a development PC and is reached through a temporary Cloudflare quick tunnel, whose address changes whenever it restarts. This is suitable for demonstrations only. Production hosting is an open item.</p>', 'warn')}`,
    },
    {
      title: 'Limits and scaling path',
      html: `
${table(['Limit', 'Effect', 'When it matters', 'Path forward'], [
  ['SQLite on one server', 'Only one server instance can run.', 'Thousands of active users at once, or a need for zero-downtime deploys.', 'Move to PostgreSQL; the database modules are the only code that changes.'],
  ['Photos on local disk', 'Photos live on the same volume as the databases.', 'Large photo volumes or several servers.', 'Object storage (S3-compatible) with the same /uploads paths.'],
  ['In-memory rate limits', 'Counters reset on restart; not shared between instances.', 'Several instances, or determined abuse.', 'Store counters in the database or Redis.'],
  ['No email service', 'No verification or reset by email.', 'Before a public launch at scale.', 'Add a transactional email provider.'],
  ['Polling sync', 'Grocery lists sync by polling, not push.', 'Many devices on one list.', 'Server-sent events or WebSockets.'],
], { widths: ['18%', '26%', '26%', '30%'] })}`,
    },
    { title: 'Document control', html: control() },
  ],
};
