import { table, note, control, figure, erd, blocks, code } from '../lib.mjs';

// ------------------------------------------------------------ entities
const users = { id: 'users', name: 'users', db: 'auth.db', fields: [
  ['email', 'TEXT', 'PK'], ['name', 'TEXT'], ['password_hash', 'TEXT'], ['created_at', 'INTEGER'],
  ['policy_version', 'TEXT'], ['policy_accepted_at', 'INTEGER'],
] };
const sessions = { id: 'sessions', name: 'sessions', db: 'auth.db', fields: [
  ['token_hash', 'TEXT', 'PK'], ['email', 'TEXT', 'FK'], ['created_at', 'INTEGER'], ['expires_at', 'INTEGER'],
] };
const posts = { id: 'posts', name: 'posts', db: 'community.db', w: 250, fields: [
  ['id', 'TEXT', 'PK'], ['author_key', 'TEXT', 'ref'], ['author_name', 'TEXT'], ['title', 'TEXT'], ['description', 'TEXT'],
  ['servings', 'INTEGER'], ['prep_time', 'TEXT'], ['cook_time', 'TEXT'], ['total_cost_zar', 'REAL'], ['image_path', 'TEXT'],
  ['status', 'TEXT'], ['reviewed_at', 'INTEGER'], ['reviewed_by', 'TEXT', 'ref'], ['created_at', 'INTEGER'], ['removed_at', 'INTEGER'],
] };
const ingredients = { id: 'ing', name: 'post_ingredients', db: 'community.db', w: 230, fields: [
  ['post_id', 'TEXT', 'PK FK'], ['position', 'INTEGER', 'PK'], ['name', 'TEXT'], ['amount', 'TEXT'], ['cost_zar', 'REAL'],
] };
const steps = { id: 'steps', name: 'post_steps', db: 'community.db', w: 230, fields: [
  ['post_id', 'TEXT', 'PK FK'], ['position', 'INTEGER', 'PK'], ['body', 'TEXT'],
] };
const reactions = { id: 'react', name: 'reactions', db: 'community.db', w: 230, fields: [
  ['post_id', 'TEXT', 'PK FK'], ['user_key', 'TEXT', 'PK'], ['kind', 'TEXT', 'PK'], ['created_at', 'INTEGER'],
] };
const comments = { id: 'comm', name: 'comments', db: 'community.db', w: 230, fields: [
  ['id', 'TEXT', 'PK'], ['post_id', 'TEXT', 'FK'], ['author_key', 'TEXT', 'ref'], ['author_name', 'TEXT'], ['body', 'TEXT'],
  ['created_at', 'INTEGER'], ['removed_at', 'INTEGER'],
] };
const reports = { id: 'rep', name: 'reports', db: 'community.db', w: 230, fields: [
  ['id', 'TEXT', 'PK'], ['target_type', 'TEXT'], ['target_id', 'TEXT', 'ref'], ['reporter_key', 'TEXT', 'ref'], ['reason', 'TEXT'],
  ['created_at', 'INTEGER'], ['resolved_at', 'INTEGER'],
] };
const fs1 = { id: 'fs', name: 'fasting_sessions', db: 'fasting.db', w: 250, fields: [
  ['id', 'TEXT', 'PK'], ['user_key', 'TEXT', 'ref'], ['schedule_id', 'TEXT'], ['target_hours', 'REAL'], ['started_at', 'INTEGER'],
  ['ended_at', 'INTEGER'], ['note', 'TEXT'], ['created_at', 'INTEGER'],
] };
const fp = { id: 'fp', name: 'fasting_prefs', db: 'fasting.db', w: 250, fields: [
  ['user_key', 'TEXT', 'PK'], ['schedule_id', 'TEXT'], ['target_hours', 'REAL'], ['updated_at', 'INTEGER'],
] };
const rooms = { id: 'rooms', name: 'rooms', db: 'sync.db', w: 250, fields: [
  ['code', 'TEXT', 'PK'], ['data', 'TEXT (JSON)'], ['created_at', 'INTEGER'], ['updated_at', 'INTEGER'],
] };
const tr = { id: 'tr', name: 'translations', db: 'translations.db', w: 250, fields: [
  ['locale', 'TEXT', 'PK'], ['source', 'TEXT', 'PK'], ['translated', 'TEXT'], ['created_at', 'INTEGER'],
] };

const at = (e, x, y) => ({ ...e, x, y });

// ------------------------------------------------------------- diagrams
const overview = blocks(
  [
    { id: 'u', x: 270, y: 20, w: 190, h: 54, title: 'User (account)', sub: 'auth.db: users', kind: 'core' },
    { id: 's', x: 20, y: 20, w: 170, h: 54, title: 'Session', sub: 'auth.db: sessions' },
    { id: 'p', x: 20, y: 150, w: 170, h: 54, title: 'Recipe post', sub: 'community.db: posts' },
    { id: 'c', x: 270, y: 150, w: 190, h: 54, title: 'Comment', sub: 'community.db: comments' },
    { id: 'r', x: 540, y: 150, w: 170, h: 54, title: 'Report', sub: 'community.db: reports' },
    { id: 're', x: 20, y: 280, w: 170, h: 54, title: 'Reaction', sub: 'like / cooked' },
    { id: 'pi', x: 270, y: 280, w: 190, h: 54, title: 'Ingredient, Step', sub: 'post_ingredients, post_steps' },
    { id: 'f', x: 540, y: 20, w: 170, h: 54, title: 'Fast', sub: 'fasting.db: fasting_sessions' },
    { id: 'fpp', x: 540, y: 280, w: 170, h: 54, title: 'Fasting preference', sub: 'fasting.db: fasting_prefs' },
    { id: 'g', x: 20, y: 400, w: 330, h: 50, title: 'Grocery list (sync.db: rooms)', sub: 'shared by code, no owner', kind: 'ext' },
    { id: 't', x: 380, y: 400, w: 330, h: 50, title: 'Translation cache (translations.db)', sub: 'not personal data', kind: 'ext' },
  ],
  [
    { from: 'u', to: 's', fromSide: 'l', toSide: 'r', label: 'has 0..n', lx: 200, ly: 40 },
    { from: 'u', to: 'f', fromSide: 'r', toSide: 'l', label: 'has 0..n', lx: 470, ly: 40 },
    { from: 'u', to: 'p', fromSide: 'b', toSide: 't', label: 'writes 0..n', lx: 120, ly: 110 },
    { from: 'u', to: 'c', fromSide: 'b', toSide: 't', label: 'writes 0..n', lx: 372, ly: 118 },
    { from: 'u', to: 'r', fromSide: 'b', toSide: 't', label: 'files 0..n', lx: 560, ly: 110 },
    { from: 'p', to: 'c', fromSide: 'r', toSide: 'l', label: 'has 0..n', lx: 200, ly: 170 },
    { from: 'p', to: 're', fromSide: 'b', toSide: 't', label: 'has 0..n', lx: 30, ly: 248 },
    { from: 'p', to: 'pi', fromSide: 'b', toSide: 't', label: 'has 1..30 each', lx: 196, ly: 262 },
    { from: 'r', to: 'c', fromSide: 'l', toSide: 'r', dashed: true, label: 'targets', lx: 482, ly: 171 },
    { from: 'u', to: 'fpp', fromSide: 'r', toSide: 't', dashed: true, label: 'has 0..1', lx: 630, ly: 245 },
  ],
  730, 465,
);

const authErd = erd([at(users, 20, 20), at(sessions, 420, 20)], [
  { from: 'users.email', to: 'sessions.email', card: '1:N', label: '1 user : 0..n sessions' },
], 690, 190);

const communityErd = erd(
  [at(ingredients, 20, 20), at(steps, 20, 170), at(reactions, 20, 290), at(posts, 330, 20), at(comments, 660, 20), at(reports, 660, 220)],
  [
    { from: 'posts.id', to: 'ing.post_id', card: '1:N' },
    { from: 'posts.id', to: 'steps.post_id', card: '1:N' },
    { from: 'posts.id', to: 'react.post_id', card: '1:N' },
    { from: 'posts.id', to: 'comm.post_id', card: '1:N' },
    { from: 'posts.id', to: 'rep.target_id', card: '1:N', dashed: true, mid: 620 },
    { from: 'comm.id', to: 'rep.target_id', card: '1:N', dashed: true, loop: 26 },
  ],
  930, 420,
);

const fastingErd = erd([at(fs1, 20, 20), at(fp, 440, 20)], [], 710, 200);
const otherErd = erd([at(rooms, 20, 20), at(tr, 440, 20)], [], 710, 130);

const dict = (rows) => table(['Column', 'Type', 'Rules', 'Meaning'], rows, { widths: ['20%', '12%', '24%', '44%'], cls: 'compact' });

export default {
  slug: '03-Data-Model-and-ERDs',
  number: 'BTE-DOC-03',
  title: 'Data Model and ERDs',
  subtitle: 'Entity relationship diagrams, data dictionary and data lifecycle',
  audience: 'Developers, database and hosting staff, privacy reviewers',
  sections: [
    {
      title: 'Overview',
      html: `
<p>Back To Eden stores its data in five SQLite database files in the server's data folder (<code>/app/data</code> in Docker), plus uploaded photos in <code>uploads/</code>. Splitting by feature keeps each file small and lets a feature be moved to a different database later without touching the others.</p>
${table(['Database file', 'Tables', 'Holds', 'Personal data?'], [
  ['auth.db', 'users, sessions', 'Accounts, password hashes, consent, sign-in sessions', 'Yes'],
  ['community.db', 'posts, post_ingredients, post_steps, reactions, comments, reports', 'Community Kitchen content and moderation', 'Yes (authorship)'],
  ['fasting.db', 'fasting_sessions, fasting_prefs', 'Fasting history', 'Yes (health information)'],
  ['sync.db', 'rooms', 'Grocery lists shared by code', 'No account link'],
  ['translations.db', 'translations', 'Cached machine translations of interface text', 'No'],
], { widths: ['18%', '34%', '32%', '16%'] })}
<h3>1.1 How records are linked</h3>
<p>SQLite foreign keys only work inside one file. Inside a database they are declared and enforced (with <code>ON DELETE CASCADE</code>). Across databases, records refer to a member by their <strong>email address</strong> (lower case), held in columns named <code>author_key</code>, <code>user_key</code>, <code>reporter_key</code> or <code>reviewed_by</code>. The application keeps these consistent; account deletion removes every one of them (section 8).</p>
${figure(overview, 'Figure 1.1 Conceptual model. Solid arrows: one-to-many. Dashed: optional or polymorphic.')}
<h3>1.2 Conventions</h3>
<ul>
<li>Times are stored as <strong>milliseconds since 1 January 1970 UTC</strong> (JavaScript time) in INTEGER columns.</li>
<li>Money is stored in <strong>South African rand</strong> as REAL, rounded to cents. Other currencies are display conversions only.</li>
<li>Generated identifiers are text made of a prefix, a timestamp and random characters (for example <code>post_…</code>, <code>fast_…</code>), not sequential numbers, so they do not reveal how many records exist.</li>
<li>"Soft" deletion: <code>removed_at</code> hides a post or comment without deleting the row; <code>resolved_at</code> closes a report.</li>
<li>In the diagrams: <strong>PK</strong> primary key, <strong>FK</strong> enforced foreign key, <strong>ref</strong> application-level reference to another database.</li>
</ul>`,
    },
    {
      title: 'Accounts (auth.db)',
      html: `
${figure(authErd, 'Figure 2.1 ERD: auth.db. A session belongs to exactly one user and is deleted with it.')}
<h4>users</h4>
${dict([
  ['email', 'TEXT', 'PK, lower case', 'The member\'s email address and their identity across all databases.'],
  ['name', 'TEXT', 'required', 'Display name shown on posts and comments.'],
  ['password_hash', 'TEXT', 'scrypt', '<code>scrypt$salt$hash</code> (base64). Never returned by the API or included in data downloads.'],
  ['created_at', 'INTEGER', 'required', 'When the account was created.'],
  ['policy_version', 'TEXT', 'nullable', 'Privacy policy version the member last accepted (currently 2026-11-16).'],
  ['policy_accepted_at', 'INTEGER', 'nullable', 'When they accepted it. Evidence of consent under POPIA.'],
])}
<h4>sessions</h4>
${dict([
  ['token_hash', 'TEXT', 'PK', 'SHA-256 of the session token. The token itself is never stored.'],
  ['email', 'TEXT', 'FK users.email, cascade', 'Whose session it is.'],
  ['created_at', 'INTEGER', 'required', 'Sign-in time.'],
  ['expires_at', 'INTEGER', 'required', 'Sign-in time plus 30 days. Expired rows are pruned.'],
])}
<p class="small">Index: <code>idx_sessions_email</code> on <code>sessions(email)</code>, used when signing an account out everywhere.</p>`,
    },
    {
      title: 'Community Kitchen (community.db)',
      html: `
${figure(communityErd, 'Figure 3.1 ERD: community.db. Solid lines are enforced foreign keys with cascade delete; dashed lines are the report target (a post or a comment, chosen by target_type).')}
<h4>posts</h4>
${dict([
  ['id', 'TEXT', 'PK', 'Generated identifier.'],
  ['author_key', 'TEXT', 'ref users.email', 'Who posted it.'],
  ['author_name', 'TEXT', 'required', 'Name at the time of posting.'],
  ['title', 'TEXT', '1 to 120 chars', 'Recipe name.'],
  ['description', 'TEXT', 'up to 600 chars', 'Short description.'],
  ['servings', 'INTEGER', 'default 4', 'Number of servings.'],
  ['prep_time, cook_time', 'TEXT', 'free text', 'For example "15 min".'],
  ['total_cost_zar', 'REAL', '≥ 0', 'Sum of ingredient costs. Cost per serving is calculated, not stored.'],
  ['image_path', 'TEXT', 'nullable', 'Public path of the photo, for example <code>/uploads/img_….jpg</code>.'],
  ['status', 'TEXT', "'pending' | 'approved' | 'rejected'", 'Moderation state. Default for existing rows: approved.'],
  ['reviewed_at, reviewed_by', 'INTEGER, TEXT', 'nullable', 'When, and by which moderator (email), it was approved or rejected.'],
  ['created_at', 'INTEGER', 'required', 'When it was posted.'],
  ['removed_at', 'INTEGER', 'nullable', 'Set when removed by a moderator; hidden from the feed.'],
])}
<h4>post_ingredients and post_steps</h4>
${dict([
  ['post_id + position', 'TEXT + INTEGER', 'PK; post_id FK posts.id cascade', 'Ingredients and steps in display order (1 to 30 of each).'],
  ['name, amount, cost_zar', 'TEXT, TEXT, REAL', 'name 120, amount 60 chars', 'Ingredient line (post_ingredients).'],
  ['body', 'TEXT', 'up to 600 chars', 'One cooking step (post_steps).'],
])}
<h4>reactions</h4>
${dict([
  ['post_id + user_key + kind', 'TEXT ×3', 'PK; post_id FK cascade', 'One row per member per post per kind, so a member can like a post once. Toggling deletes the row.'],
  ['kind', 'TEXT', "'like' | 'cooked'", '"Like" or "I cooked this".'],
  ['created_at', 'INTEGER', 'required', 'When.'],
])}
<h4>comments</h4>
${dict([
  ['id', 'TEXT', 'PK', 'Generated identifier.'],
  ['post_id', 'TEXT', 'FK posts.id cascade', 'The recipe commented on.'],
  ['author_key, author_name', 'TEXT', 'ref users.email', 'Who wrote it.'],
  ['body', 'TEXT', '1 to 1,000 chars', 'The comment.'],
  ['created_at, removed_at', 'INTEGER', 'removed_at nullable', 'Posted, and removed by a moderator.'],
])}
<h4>reports</h4>
${dict([
  ['id', 'TEXT', 'PK', 'Generated identifier.'],
  ['target_type', 'TEXT', "'post' | 'comment'", 'What was reported.'],
  ['target_id', 'TEXT', 'ref posts.id or comments.id', 'Which post or comment.'],
  ['reporter_key', 'TEXT', 'ref users.email', 'Who reported it. Not shown to the reported author.'],
  ['reason', 'TEXT', 'up to 300 chars', 'Why. "No reason given" when blank.'],
  ['created_at, resolved_at', 'INTEGER', 'resolved_at nullable', 'Filed, and closed by a moderator.'],
])}
<p class="small">Indexes: <code>idx_posts_created (removed_at, created_at DESC)</code> for the feed; <code>idx_comments_post (post_id, removed_at, created_at)</code>; <code>idx_reactions_post (post_id, kind)</code> for counts; <code>idx_reports_open (resolved_at, created_at DESC)</code> for the moderation queue.</p>
${note('<p><strong>Post lifecycle:</strong> a member\'s post is created as <em>pending</em> and seen only by its author. A moderator sets it to <em>approved</em> (on the feed) or <em>rejected</em> (kept, can be approved later). A moderator can also delete it, which removes the row and, by cascade, its ingredients, steps, reactions and comments, and deletes the photo file.</p>')}`,
    },
    {
      title: 'Fasting (fasting.db)',
      html: `
${figure(fastingErd, 'Figure 4.1 ERD: fasting.db. Both tables refer to the member by user_key (their email in auth.db).')}
<h4>fasting_sessions</h4>
${dict([
  ['id', 'TEXT', 'PK', 'Identifier (<code>fast_…</code>).'],
  ['user_key', 'TEXT', 'ref users.email', 'Whose fast.'],
  ['schedule_id', 'TEXT', "'12-12', '14-10', '16-8', '18-6', '20-4', 'omad'", 'Eating window chosen.'],
  ['target_hours', 'REAL', '> 0', 'Target length (12 to 23 hours).'],
  ['started_at', 'INTEGER', 'required, may be backdated', 'When the fast began.'],
  ['ended_at', 'INTEGER', 'NULL while running', 'When it ended. Duration and "reached goal" are calculated from these.'],
  ['note', 'TEXT', 'optional', 'Note added when ending.'],
  ['created_at', 'INTEGER', 'required', 'When the record was made.'],
])}
<p class="small">Indexes: <code>idx_sessions_user (user_key, started_at DESC)</code>; <code>idx_one_active_fast</code>, a unique partial index on <code>user_key WHERE ended_at IS NULL</code>, which makes it impossible for a member to have two fasts running.</p>
<h4>fasting_prefs</h4>
${dict([
  ['user_key', 'TEXT', 'PK', 'The member.'],
  ['schedule_id, target_hours', 'TEXT, REAL', 'required', 'Last schedule chosen, so the picker opens there next time.'],
  ['updated_at', 'INTEGER', 'required', 'When it was last changed.'],
])}
${note('<p>Fasting history is <strong>health information</strong>, a special category of personal information under POPIA. It is collected only with explicit consent and is only ever returned to its owner.</p>', 'warn')}`,
    },
    {
      title: 'Grocery lists and translations',
      html: `
${figure(otherErd, 'Figure 5.1 ERD: sync.db and translations.db. Neither links to an account.')}
<h4>rooms (sync.db)</h4>
${dict([
  ['code', 'TEXT', 'PK, 4 to 24 of A-Z 0-9 -', 'The sync code, upper case. Generated codes avoid I, O, 0 and 1.'],
  ['data', 'TEXT', 'JSON, cleaned', 'The list (structure below).'],
  ['created_at, updated_at', 'INTEGER', 'required', 'Lists with updated_at older than 90 days are deleted.'],
])}
<p>The <code>data</code> column holds a JSON document. The server keeps only these fields and trims each to size:</p>
${code(`{
  "code": "K7QM-4XTB",
  "budget": 600,              // rand
  "currency": "ZAR",
  "householdSize": 4,
  "lastUpdated": 1763500000000,
  "deviceAgent": "...",        // which browser last saved it
  "items": [                   // at most 300
    { "id": "item-1", "name": "Dried Sugar Beans (1kg)",   // name up to 120 chars
      "category": "Proteins", "priceZar": 28, "quantity": 1,
      "checked": false, "note": "High plant protein & iron",  // up to 300 chars
      "recipeSource": "..." }                                    // optional
  ]
}`)}
<h4>translations (translations.db)</h4>
${dict([
  ['locale + source', 'TEXT + TEXT', 'PK', 'Language code (af, zu, …) and the English text.'],
  ['translated', 'TEXT', 'required', 'Machine translation returned by Gemini.'],
  ['created_at', 'INTEGER', 'required', 'When it was cached.'],
])}
<p>This table fills only when a Gemini key is set and a string is missing from the hand-written dictionaries. It holds interface text, never anything a member typed.</p>`,
    },
    {
      title: 'Files and data outside the databases',
      html: `
${table(['Location', 'What', 'Lifecycle'], [
  ['<code>/app/data/uploads/</code>', 'Recipe photos (JPEG, PNG, WebP, up to 6 MB), random file names.', 'Deleted with the post or the author\'s account.'],
  ['<code>/app/data/backups/&lt;date&gt;/</code>', 'Nightly consistent copies of every database.', 'Kept 7 days (BACKUP_KEEP_DAYS), then deleted.'],
  ['<code>shared/i18n/strings/</code> (code)', 'Hand-written translations, 1,111 strings in each of 10 languages.', 'Part of the release; changed by developers.'],
  ['<code>frontend/src/data/</code> (code)', 'Built-in foods (16), recipes (5), fasting schedules and stages, education text, estimated prices.', 'Part of the release.'],
  ['Browser local storage', 'Signed-in member (name, email, session token); grocery list code and a copy of its items, so the list works offline in a shop; chosen language and machine-translation cache.', 'Cleared on sign-out (session) or by the browser.'],
  ['Phone secure storage', 'Session token and member name and email (Keychain or Keystore); chosen language.', 'Cleared on sign-out or account deletion.'],
], { widths: ['26%', '46%', '28%'] })}`,
    },
    {
      title: 'Retention',
      html: `
${table(['Data', 'Kept for', 'Removed by'], [
  ['Account, posts, comments, reactions, reports, fasting history', 'Until the member deletes their account', 'Account deletion (immediate)'],
  ['Sessions', '30 days, or until sign-out or password change', 'Sign-out, pruning, account deletion'],
  ['Posts and comments removed by a moderator', 'Row kept (hidden) until the author\'s account is deleted', 'Account deletion'],
  ['Rejected posts', 'Kept so a moderator can reverse the decision', 'Moderator delete, or account deletion'],
  ['Resolved reports', 'Kept as a moderation record', 'Account deletion of the reporter'],
  ['Grocery lists', '90 days after last change', 'Automatic clean-up at server start'],
  ['Backups', '7 days', 'Automatic clean-up after each nightly backup'],
  ['Translation cache', 'Indefinitely (not personal)', 'Manual'],
], { widths: ['42%', '30%', '28%'] })}`,
    },
    {
      title: 'Account deletion and data export',
      html: `
<h3>8.1 What deletion removes</h3>
<p>When a member deletes their account, in this order:</p>
<ol>
<li>community.db: their posts (and by cascade the ingredients, steps, reactions and comments on those posts, including other people\'s comments), the photo files of those posts, their own comments and reactions on other posts, reports they filed, and reports about their posts and comments.</li>
<li>fasting.db: all their fasting sessions and their preference row.</li>
<li>auth.db: their sessions and their user row.</li>
</ol>
<p>Backups still contain the data until they expire (7 days by default; the privacy policy promises at most 30). An automated test checks that no trace remains after deletion, including photo files.</p>
<h3>8.2 What the data download contains</h3>
<p><code>GET /api/auth/export</code> returns one JSON file with: the account (email, name, created, policy version and acceptance time, active sessions with sign-in and expiry times), their posts with ingredients and steps, comments, reactions, reports filed, and fasting sessions and preference. The password hash and session token hashes are never included.</p>`,
    },
    {
      title: 'Schema changes',
      html: `
<p>Each database module creates its tables with <code>CREATE TABLE IF NOT EXISTS</code> when the server starts. Columns added after the first release (for example <code>posts.status</code>, <code>posts.image_path</code>, <code>users.policy_version</code>) are added by an <em>add column if missing</em> step, so databases created by older builds are upgraded in place at start-up, with no separate migration command.</p>
<p>The complete schema is also kept in one readable file, <code>backend/schema.sql</code>, generated from the code with <code>npm run build &amp;&amp; npm run schema</code>. An automated test fails if the file falls out of date, so it always matches what the server creates.</p>
${note('<p>If the product moves to PostgreSQL (see BTE-DOC-02, section 9), these tables map directly. The cross-database references (author_key, user_key and so on) would become real foreign keys to <code>users.email</code>, ideally replaced by a numeric user id so that a member could change their email address.</p>')}`,
    },
    { title: 'Document control', html: control() },
  ],
};
