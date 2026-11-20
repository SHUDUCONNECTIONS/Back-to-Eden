import { table, note, control, code } from '../lib.mjs';

const m = (verb) => `<span class="method ${verb}">${verb}</span>`;
const access = { P: 'Public', M: 'Member', A: 'Moderator' };

/** One endpoint block. */
function ep(verb, path, who, purpose, { body, resp, rules, errors } = {}) {
  let h = `<div class="keep"><h4>${m(verb)} <code>${path}</code> <span class="tag${who === 'A' ? ' open' : who === 'M' ? ' must' : ''}">${access[who]}</span></h4><p>${purpose}</p>`;
  if (body) h += `<p class="small"><strong>Request body</strong></p>${code(body)}`;
  if (resp) h += `<p class="small"><strong>Response</strong></p>${code(resp)}`;
  if (rules) h += `<p class="small"><strong>Rules:</strong> ${rules}</p>`;
  if (errors) h += `<p class="small"><strong>Errors:</strong> ${errors}</p>`;
  return h + '</div>';
}

const summary = [
  ['GET', '/api/health', 'P', 'Server is up'],
  ['POST', '/api/auth/register', 'P', 'Create an account'],
  ['POST', '/api/auth/login', 'P', 'Sign in'],
  ['POST', '/api/auth/logout', 'P', 'Sign out (ends the session)'],
  ['GET', '/api/auth/me', 'M', 'Check the session; who am I'],
  ['POST', '/api/auth/consent', 'M*', 'Accept the current privacy policy'],
  ['GET', '/api/auth/export', 'M*', 'Download my data'],
  ['POST', '/api/auth/delete-account', 'M*', 'Delete my account'],
  ['GET', '/api/community/me', 'P', 'Am I a moderator; queue sizes'],
  ['GET', '/api/community/posts', 'P', 'Feed page'],
  ['POST', '/api/community/posts', 'M', 'Share a recipe'],
  ['DELETE', '/api/community/posts/:id', 'M', 'Delete my post'],
  ['POST', '/api/community/posts/:id/reactions', 'M', 'Toggle like / cooked'],
  ['GET', '/api/community/posts/:id/comments', 'P', 'List comments'],
  ['POST', '/api/community/posts/:id/comments', 'M', 'Add a comment'],
  ['DELETE', '/api/community/comments/:id', 'M', 'Delete my comment'],
  ['POST', '/api/community/report', 'M', 'Report a post or comment'],
  ['GET', '/api/community/admin/pending', 'A', 'Posts waiting for review'],
  ['POST', '/api/community/admin/posts/:id/approve', 'A', 'Approve a post'],
  ['POST', '/api/community/admin/posts/:id/reject', 'A', 'Reject a post'],
  ['DELETE', '/api/community/admin/posts/:id', 'A', 'Delete any post'],
  ['GET', '/api/community/admin/reports', 'A', 'Open reports'],
  ['POST', '/api/community/admin/reports/:id/resolve', 'A', 'Close a report'],
  ['DELETE', '/api/community/admin/comments/:id', 'A', 'Remove any comment'],
  ['GET', '/api/fasting/state', 'M', 'Active fast, history, totals'],
  ['POST', '/api/fasting/start', 'M', 'Start a fast'],
  ['POST', '/api/fasting/stop', 'M', 'End the active fast'],
  ['DELETE', '/api/fasting/active', 'M', 'Discard the active fast'],
  ['DELETE', '/api/fasting/sessions/:id', 'M', 'Delete a fasting record'],
  ['POST', '/api/sync/create', 'P', 'Create a grocery list'],
  ['GET', '/api/sync/:code', 'P', 'Read a grocery list'],
  ['POST', '/api/sync/:code', 'P', 'Save a grocery list'],
  ['POST', '/api/ai/recipe-suggest', 'M', 'Recipe idea from ingredients'],
  ['POST', '/api/translate', 'P', 'Machine-translate interface strings'],
];

export default {
  slug: '04-API-Reference',
  number: 'BTE-DOC-04',
  title: 'API Reference',
  subtitle: 'Every endpoint of the Back To Eden server: access, inputs, outputs and errors',
  audience: 'Developers building or maintaining the web app, phone app or integrations',
  sections: [
    {
      title: 'Conventions',
      html: `
<h3>1.1 Base address</h3>
<p>All endpoints are under <code>/api</code> on the server's address, for example <code>https://&lt;host&gt;/api/health</code>. Locally the server listens on port 3001; in Docker it is published on 8081 and 3001.</p>
<h3>1.2 Format</h3>
<p>Requests and responses are JSON (<code>Content-Type: application/json</code>), UTF-8. Request bodies may be up to 12 MB (to allow a recipe photo). Times are milliseconds since 1970 UTC. Money is South African rand.</p>
<h3>1.3 Authentication</h3>
<p>Sign in with <code>POST /api/auth/login</code> or <code>/register</code> to get a token, then send it on every call:</p>
${code('Authorization: Bearer <token>')}
<p>Access levels used below:</p>
${table(['Level', 'Meaning'], [
  ['<span class="tag">Public</span>', 'No token needed. If a token is sent, the response may be personalised (for example, which posts you have liked).'],
  ['<span class="tag must">Member</span>', 'A valid token is required, and the member must have accepted the current privacy policy. Otherwise 401 (no or bad token) or 403 (policy not accepted).'],
  ['Member*', 'A valid token is required, but these routes work before the policy is accepted, so the member can accept it, download their data or delete their account.'],
  ['<span class="tag open">Moderator</span>', 'A member whose email is in the server\'s ADMIN_EMAILS. Otherwise 403.'],
], { widths: ['18%', '82%'] })}
<h3>1.4 Errors</h3>
<p>Errors use standard HTTP status codes with a JSON body. <code>message</code> is a sentence that can be shown to the person.</p>
${code(`{ "statusCode": 400, "message": "Please enter your name.", "error": "Bad Request" }`)}
${table(['Status', 'When'], [
  ['400 Bad Request', 'Missing or invalid input.'],
  ['401 Unauthorized', 'No token, an unknown or expired token, or a wrong email or password at sign-in. Clients should sign the person out on 401 (except a wrong password on delete-account).'],
  ['403 Forbidden', 'Not allowed: not your post, not a moderator, or the privacy policy must be accepted first.'],
  ['404 Not Found', 'The post, comment, report, fast or grocery list does not exist.'],
  ['409 Conflict', 'Email already registered, a reserved moderator address, or a fast already running.'],
  ['429 Too Many Requests', 'A rate limit was hit. Try again later.'],
], { widths: ['22%', '78%'] })}
<h3>1.5 Rate limits</h3>
${table(['Action', 'Limit', 'Counted per'], [
  ['Failed sign-in', '8 per 15 minutes', 'account (email)'],
  ['Failed sign-in', '40 per 15 minutes', 'network address'],
  ['Account creation', '10 per hour', 'network address'],
  ['Posts', '10 per hour', 'member (moderators exempt)'],
  ['Comments', '60 per hour', 'member (moderators exempt)'],
  ['Reactions', '300 per hour', 'member (moderators exempt)'],
  ['Reports', '20 per hour', 'member (moderators exempt)'],
  ['Unknown grocery list codes', '60 per 15 minutes', 'network address'],
  ['Paid AI calls', '500 per day (AI_DAILY_LIMIT)', 'whole server'],
], { widths: ['36%', '34%', '30%'] })}`,
    },
    {
      title: 'Endpoint summary',
      html: table(['Method', 'Path', 'Access', 'Purpose'], summary.map(([v, p, a, d]) => [m(v), `<code>${p}</code>`, access[a] || 'Member*', d]), { widths: ['12%', '46%', '14%', '28%'], cls: 'compact' }),
    },
    {
      title: 'Health and accounts',
      html: `
${ep('GET', '/api/health', 'P', 'Used by Docker and hosting platforms to check the server is running.', { resp: '{ "ok": true }' })}
${ep('POST', '/api/auth/register', 'P', 'Creates an account, records consent and signs the person in.', {
  body: `{ "name": "Thandi M", "email": "thandi@example.com",
  "password": "at least 8 characters", "acceptedPrivacyPolicy": true }`,
  resp: `{ "token": "…", "expiresAt": 1766100000000,
  "user": { "email": "thandi@example.com", "name": "Thandi M",
            "isAdmin": false, "needsConsent": false } }   // 201 Created`,
  rules: 'Name required (trimmed, up to 80 characters). Valid email. Password 8 to 200 characters. acceptedPrivacyPolicy must be true. Email is stored in lower case.',
  errors: '400 invalid input or consent missing; 409 email already registered or reserved for a moderator; 429 too many sign-ups.',
})}
${ep('POST', '/api/auth/login', 'P', 'Signs in and returns a new 30-day session.', {
  body: '{ "email": "thandi@example.com", "password": "…" }',
  resp: 'Same shape as register (200). needsConsent is true if the policy changed since they last accepted.',
  errors: '400 missing email or password; 401 "That email and password do not match." (same for unknown email); 429 locked out.',
})}
${ep('POST', '/api/auth/logout', 'P', 'Deletes the session for the token sent, if any. Always succeeds.', { resp: '{ "ok": true }' })}
${ep('GET', '/api/auth/me', 'M', 'Checks a saved token when the app opens.', {
  resp: '{ "user": { "email": "…", "name": "…", "isAdmin": false, "needsConsent": false } }',
  errors: '401 if the session is gone; the app then signs the person out.',
})}
${ep('POST', '/api/auth/consent', 'M*', 'Records acceptance of the current privacy policy version.', {
  body: '{ "acceptedPrivacyPolicy": true }',
  resp: '{ "ok": true, "policyVersion": "2026-11-16" }',
})}
${ep('GET', '/api/auth/export', 'M*', 'Everything stored about the member, as one JSON document (POPIA right of access). Never includes password or token hashes.', {
  resp: `{ "exportedAt": "2026-11-19T08:00:00.000Z", "privacyPolicyVersion": "2026-11-16",
  "note": "…", "account": { …, "activeSessions": [ … ] },
  "community": { "recipes": [ … ], "comments": [ … ], "reactions": [ … ], "reports": [ … ] },
  "fasting": { … } }`,
})}
${ep('POST', '/api/auth/delete-account', 'M*', 'Permanently deletes the account and everything linked to it (see BTE-DOC-03, section 8).', {
  body: '{ "password": "…" }',
  resp: '{ "ok": true, "removed": { "recipes": 2, "photos": 1, "fastingSessions": 14 } }',
  errors: '401 "That password is not right." (the session stays valid).',
})}`,
    },
    {
      title: 'Community Kitchen',
      html: `
${ep('GET', '/api/community/me', 'P', 'Tells the app whether to show the Admin page.', { resp: '{ "isAdmin": true, "pendingCount": 3, "reportCount": 1 }   // counts are 0 for non-moderators' })}
${ep('GET', '/api/community/posts?sort=recent|popular&limit=20&offset=0', 'P', 'One page of the feed: approved posts, plus the caller\'s own pending posts.', {
  resp: `{ "posts": [ CommunityPost, … ], "total": 42, "hasMore": true }

CommunityPost = { "id", "authorKey", "authorName", "title", "description", "servings",
  "prepTime", "cookTime", "totalCostZar", "costPerServingZar", "createdAt",
  "imageUrl": "/uploads/img_….jpg" | null,
  "ingredients": [ { "name", "amount", "costZar" } ], "steps": [ "…" ],
  "likeCount", "cookedCount", "commentCount",
  "viewerReactions": [ "like" | "cooked" ], "isOwn": false,
  "status": "pending" | "approved" | "rejected" }`,
})}
${ep('POST', '/api/community/posts', 'M', 'Shares a recipe. A member\'s post starts as pending; a moderator\'s is approved immediately.', {
  body: `{ "title": "Lentil curry", "description": "…", "servings": 4,
  "prepTime": "10 min", "cookTime": "30 min",
  "ingredients": [ { "name": "Brown lentils", "amount": "500 g", "costZar": 19.5 } ],
  "steps": [ "Rinse the lentils…" ],
  "imageDataUrl": "data:image/jpeg;base64,…" }       // optional`,
  resp: '{ "id": "post_…", "post": CommunityPost }   // 201 Created',
  rules: 'Title 1 to 120 characters; description up to 600; 1 to 30 ingredients (name 120, amount 60); 1 to 30 steps (600 each); image JPEG, PNG or WebP, at most 6 MB after decoding.',
  errors: '400 invalid recipe or image; 429 more than 10 posts in an hour.',
})}
${ep('DELETE', '/api/community/posts/:id', 'M', 'Deletes the caller\'s own post, with its photo, reactions and comments.', { resp: '{ "ok": true }', errors: '403 not yours; 404 not found.' })}
${ep('POST', '/api/community/posts/:id/reactions', 'M', 'Turns a like or "cooked this" on, or off if it was on.', { body: '{ "kind": "like" | "cooked" }', resp: '{ "ok": true, "kind": "like", "active": true }' })}
${ep('GET', '/api/community/posts/:id/comments', 'P', 'Comments on a post, oldest first, excluding removed ones.', { resp: '{ "comments": [ { "id", "postId", "authorName", "body", "createdAt", "isOwn" } ] }' })}
${ep('POST', '/api/community/posts/:id/comments', 'M', 'Adds a comment and returns the updated list.', { body: '{ "body": "Made this tonight, lovely." }', resp: '{ "comments": [ … ] }   // 201 Created', rules: '1 to 1,000 characters.' })}
${ep('DELETE', '/api/community/comments/:id', 'M', 'Deletes the caller\'s own comment.', { errors: '403 not yours; 404 not found.' })}
${ep('POST', '/api/community/report', 'M', 'Reports a post or comment to the moderators.', { body: '{ "targetType": "post" | "comment", "targetId": "…", "reason": "Spam" }', resp: '{ "ok": true }   // 201 Created', rules: 'Reason up to 300 characters ("No reason given" if blank).' })}`,
    },
    {
      title: 'Moderation',
      html: `
<p>All routes in this section return 403 "That area is for moderators." to anyone whose email is not in ADMIN_EMAILS.</p>
${ep('GET', '/api/community/admin/pending', 'A', 'Posts waiting for review, oldest first (up to 50).', { resp: '{ "posts": [ CommunityPost, … ] }' })}
${ep('POST', '/api/community/admin/posts/:id/approve', 'A', 'Publishes the post to the feed and records who approved it.', { resp: '{ "ok": true, "status": "approved" }' })}
${ep('POST', '/api/community/admin/posts/:id/reject', 'A', 'Keeps the post off the feed. Reversible: approving it later publishes it.', { resp: '{ "ok": true, "status": "rejected" }' })}
${ep('DELETE', '/api/community/admin/posts/:id', 'A', 'Deletes any post for good, with its photo.', { resp: '{ "ok": true }' })}
${ep('GET', '/api/community/admin/reports', 'A', 'Open reports, newest first (up to 50).', { resp: '{ "reports": [ { "id", "targetType", "targetId", "reason", "createdAt", "targetSummary", "targetAuthor" } ] }' })}
${ep('POST', '/api/community/admin/reports/:id/resolve', 'A', 'Closes a report.', { errors: '404 "That report is already closed."' })}
${ep('DELETE', '/api/community/admin/comments/:id', 'A', 'Removes any comment from view.', { resp: '{ "ok": true }' })}`,
    },
    {
      title: 'Fasting',
      html: `
${ep('GET', '/api/fasting/state', 'M', 'Everything the fasting screen needs.', {
  resp: `{ "active": FastingSession | null,
  "sessions": [ FastingSession, … ],
  "totals": { "sessionCount", "goalCount", "totalHours", "longestHours" },
  "lastSchedule": { "scheduleId": "16-8", "targetHours": 16 } | null }

FastingSession = { "id", "scheduleId", "targetHours", "startedAt",
  "endedAt": number | null, "note", "durationMs", "reachedGoal" }`,
})}
${ep('POST', '/api/fasting/start', 'M', 'Starts a fast. startedAt may be in the past (when the person last ate).', {
  body: '{ "scheduleId": "16-8", "targetHours": 16, "startedAt": 1763500000000 }   // startedAt optional',
  resp: '{ "session": FastingSession }',
  rules: 'targetHours is clamped to 4 to 48 (quarter hours). startedAt is clamped to the last 48 hours and never in the future. Only one fast can run at a time.',
  errors: '409 a fast is already running.',
})}
${ep('POST', '/api/fasting/stop', 'M', 'Ends the running fast and records it.', { body: '{ "note": "Felt good" }   // optional', resp: '{ "session": FastingSession }', errors: '404 no fast running.' })}
${ep('DELETE', '/api/fasting/active', 'M', 'Discards the running fast without recording it.', { resp: '{ "ok": true }', errors: '404 no fast running.' })}
${ep('DELETE', '/api/fasting/sessions/:id', 'M', 'Deletes one of the caller\'s fasting records.', { errors: '403 not yours; 404 not found.' })}`,
    },
    {
      title: 'Grocery list sync',
      html: `
${note('<p>These routes are public: whoever has a code can read and change that list. Lists are not linked to accounts.</p>', 'warn')}
${ep('POST', '/api/sync/create', 'P', 'Creates a list with a new code, or returns the existing list if customCode is already taken (it never overwrites).', {
  body: '{ "customCode": "K7QM-4XTB", "initialData": { "items": [ … ], "budget": 600, "currency": "ZAR", "householdSize": 4 } }   // both optional',
  resp: 'SyncData (see below)',
})}
${ep('GET', '/api/sync/:code', 'P', 'Reads a list. The code is not case sensitive.', { resp: 'SyncData', errors: '400 badly formed code; 404 "Sync code not found"; 429 too many unknown codes.' })}
${ep('POST', '/api/sync/:code', 'P', 'Saves the list (creates it if missing). The server cleans the data: unknown fields dropped, text trimmed, at most 300 items.', {
  body: '{ "items": [ … ], "budget": 600, "currency": "ZAR", "householdSize": 4 }',
  resp: `SyncData = { "code", "items": [ { "id", "name", "category", "priceZar", "quantity",
  "checked", "note"?, "recipeSource"? } ], "budget", "currency", "householdSize",
  "lastUpdated", "deviceAgent"? }`,
  rules: 'Code: 4 to 24 characters of A-Z, 0-9 and hyphen.',
})}`,
    },
    {
      title: 'AI and translation',
      html: `
${ep('POST', '/api/ai/recipe-suggest', 'M', 'Suggests a recipe from the ingredients a member has, within a budget. Uses Gemini when configured; otherwise, or when the daily limit is reached, returns a matching built-in recipe.', {
  body: '{ "availableIngredients": [ "cabbage", "rice", "eggs" ], "budget": 60, "targetServings": 4, "currency": "ZAR" }',
  resp: `{ "success": true, "recipe": { title, description, servings, costs, ingredients, steps },
  "source": "gemini" | "curated-fallback" | "daily-limit" | "fallback" }`,
})}
${ep('POST', '/api/translate', 'P', 'Machine-translates interface strings the hand-written dictionaries do not cover. Answers are cached in translations.db. Without a Gemini key, returns the strings untranslated.', {
  body: '{ "locale": "zu", "languageName": "Zulu", "nativeName": "isiZulu", "strings": [ "Add to list" ] }',
  resp: '{ "translations": { "Add to list": "…" }, "source": "cache" | … }',
  rules: 'locale must be one of the ten supported language codes.',
  errors: '400 unknown language.',
})}`,
    },
    { title: 'Document control', html: control() },
  ],
};
