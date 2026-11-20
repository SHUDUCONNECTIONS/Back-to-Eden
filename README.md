# Back To Eden / NourishBudget

Nutritious food on a South African budget: a recipe feed, a grocery planner and
an intermittent-fasting tracker.

Three packages, one API.

```
backend/     NestJS API + SQLite          -> http://localhost:3001/api
frontend/    React + Vite web app         -> http://localhost:5173
mobile/      React Native (Expo) app      -> Metro on :8081
shared/      TypeScript types both clients import
dev.mjs      starts backend + frontend together
```

## Running it

Install once per package:

```bash
cd backend  && npm install
cd frontend && npm install
cd mobile   && npm install
```

Build the backend (NestJS runs from compiled output), then start both:

```bash
cd backend && node node_modules/typescript/bin/tsc -p tsconfig.build.json
cd ..      && node dev.mjs
```

| Command | What it starts |
|---|---|
| `node dev.mjs` | backend + web app |
| `node dev.mjs backend` | API only |
| `node dev.mjs frontend` | web app only |
| `node dev.mjs mobile` | Expo / Metro |

### Why `node dev.mjs` and not `npm run dev`

This folder's name contains an `&`, which breaks npm's Windows `.bin` shims
(`'-grocery-sync\node_modules\.bin\' is not recognized`). Every script in this
repo invokes `node` with an explicit path instead of relying on a shim. Renaming
the folder would let you use ordinary npm scripts again.

## Production (Docker and Railway)

Production is **one image** built from the root `Dockerfile`: the NestJS API
also serves the built web app, so there is one service, one address and one
data volume (`/app/data`: SQLite databases, photos, nightly snapshots).

```bash
# Same image locally -> http://localhost:8081
docker build -t backtoeden .
docker compose up -d --no-build
```

### Deploying to Railway

```bash
npm i -g @railway/cli
railway login                 # opens the browser
railway init                  # new project
railway add                   # choose "Empty service", name it "app"
railway link                  # link this folder to that service
railway volume add            # mount path: /app/data
railway variable set ADMIN_EMAILS=you@example.com
railway variable set GEMINI_API_KEY=...        # optional
railway up --detach           # uploads this folder, builds the Dockerfile
railway domain                # gives you https://<name>.up.railway.app
```

Then, in the Railway dashboard for the service:

- **Settings → Healthcheck path:** `/api/health`
- **Backups:** enable **Daily** and **Weekly** (the privacy policy promises
  deleted data leaves backups within 30 days; Monthly would keep it 89 days).
- **Moderator password:** `railway ssh`, then
  `node dist/cli/set-password.js you@example.com "Your Name"`.

Notes: a service with a volume runs as a single instance, and redeploys have a
few seconds of downtime. Wiping the volume also deletes its Railway backups.
`.railwayignore` keeps `.env`, local data and `node_modules` out of uploads.

### Production settings (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_EMAILS` | none | moderator accounts (comma separated) |
| `GEMINI_API_KEY` | none | AI recipes and translation; both fall back without it |
| `AI_DAILY_LIMIT` | 500 | max paid Gemini calls per day (cost cap) |
| `CORS_ORIGINS` | none | extra origins allowed to call the API (same-origin needs none) |
| `TRUST_PROXY` | `1` on Railway | proxies trusted for the visitor IP (rate limits) |
| `BACKUP_KEEP_DAYS` | 7 | nightly snapshot retention in `/app/data/backups` |
| `BACKUPS` | on | set `off` to disable nightly snapshots |

### Built-in limits

Per person per hour: 10 posts, 60 comments, 300 likes, 20 reports, 20 AI
recipe ideas (moderators exempt). Per IP: 60 translation batches that need the
model per hour, 60 misses looking up grocery-list codes per 15 minutes, 10
registrations per hour. Sign-in: 8 wrong passwords per account per 15 minutes.

## backend/ — NestJS

One module per area, each with its own controller and service:

| Module | Routes | Does |
|---|---|---|
| `community` | `/api/community/*` | feed, reactions, comments, reports |
| `community` (admin) | `/api/community/admin/*` | review queue, approve/reject, moderation |
| `fasting` | `/api/fasting/*` | timer, sessions, totals |
| `sync` | `/api/sync/*` | cross-device shopping list (SQLite, shared by code, idle lists removed after 90 days) |
| `ai` | `/api/ai/recipe-suggest`, `/api/translate` | Gemini recipes and translation |

SQLite lives in `backend/src/database` and is wrapped by the services rather
than reached into from controllers, so replacing SQLite later touches the
services only. Data files (`backend/data/`) hold the databases and uploaded
photos; they are gitignored.

It is CommonJS, not ESM, because Nest's dependency injection needs
`emitDecoratorMetadata`, which the esbuild/ESM toolchain does not emit.

### Configuration — `backend/.env`

```
ADMIN_EMAILS=you@example.com   # comma separated; empty means nobody can moderate
GEMINI_API_KEY=                # optional; both AI features degrade gracefully without it
```

### Tests

```bash
cd backend && npm test
```

Builds the backend, then starts the real server against a throwaway data folder
for each file in `backend/test/` and exercises it over HTTP: sign-up, sign-in
and lockout, spoofing attempts, moderation, ownership, posting limits, fasting
privacy, the consent gate, data export, account deletion (including photo
files), grocery-list persistence and validation, security headers and the AI
endpoints. It never touches `backend/data`. Run it before every deploy.

### Database schema

The tables are created by the code in `backend/src/database/*.ts` when the
server starts. `backend/schema.sql` is the same schema in one readable file,
generated from the code - regenerate it after changing a table:

```bash
cd backend && npm run build && npm run schema
```

A test (`test/schema.test.mjs`) fails if it is out of date.

## frontend/ — React + Vite

Unchanged application code. It still calls `/api/...` and `/uploads/...` exactly
as before; `vite.config.ts` proxies both to the backend, so nothing in `src/`
had to learn that the API moved out of process.

Point it elsewhere with `BACKEND_URL=https://api.example.com`.

### Translations

Hand-written translations live in `frontend/src/i18n/strings/<locale>.ts`, keyed
by the English text passed to `t()`. Anything missing falls back to machine
translation (only with `GEMINI_API_KEY` set; results are stored) and then to
English. To see what each language is missing:

```bash
node scripts/i18n-missing.mjs        # coverage for all 10 languages
node scripts/i18n-missing.mjs zu     # the missing strings for one
```

All ten languages cover every interface and content string (food, recipes,
fasting stages and education). The entries were drafted without native
speakers - quality is best in Afrikaans, then isiZulu and isiXhosa, roughest
in siSwati, isiNdebele, Xitsonga and Tshivenḓa - so have them reviewed before
launch. Each dictionary is downloaded only when someone picks that language.

Still English: the privacy policy and the consent statement (deliberately:
consent must be informed, so they need a checked human translation), messages
that come from the server (e.g. a wrong password).

The dictionaries live in `shared/i18n/strings/` and the Expo app uses the same
files: pick a language on the sign-in screen or under Account (the phone
remembers it, and follows the phone's own language on first launch). The phone
has no machine-translation fallback - anything missing shows in English.
`node scripts/i18n-missing.mjs` checks the web and phone strings together.

## mobile/ — React Native (Expo)

Same accounts and API as the web app, with three tabs: the **Community
Kitchen** feed (photos, like / cooked this, expandable recipes, pull to refresh,
infinite scroll), the **Fasting Journey** timer (schedule picker, live progress,
stage, history) and **Account** (sign out, and deleting the account in the app,
which Apple and Google require).

Sign-up asks for the same privacy consent as the web. The session is kept in the
phone's secure storage (`expo-secure-store`: iOS Keychain / Android Keystore)
and checked with the server on each launch, so an expired or deleted account
goes back to sign-in and a policy change asks for consent again.

Expo SDK 58 (React 19.3, React Native 0.88), the current release, so it opens
in the Expo Go app from the stores: run `npm start` in `mobile/` and scan the QR
code with a phone on the same Wi-Fi as this computer. Check that every Expo
package matches the SDK with `node node_modules/expo/bin/cli install --check`,
and run `npx expo-doctor` for a fuller health check.

Budgeting, the ingredient shelf and the grocery list stay on the web — those are
planning tasks done sitting down, while the feed and the timer are what you
reach for standing in a shop.

### Pointing the app at your backend

`src/lib/config.ts` works it out: it reads the host Metro served the bundle
from, which is your machine's LAN address, and talks to port 3001 there. Android
emulators get `10.0.2.2`. Override with `EXPO_PUBLIC_API_URL` for a deployed
API. The current address is printed at the bottom of the app, because a wrong
API address is the most common reason a phone build looks broken.

`localhost` on a physical phone means the phone, which is why it is never the
default off-web.

## Accounts and security

Sign-in is real: email + password accounts stored in `backend/data/auth.db`.

- Passwords are hashed with scrypt; sessions are random tokens (only their hash
  is stored) sent as `Authorization: Bearer <token>`, valid for 30 days.
- The server identifies callers from the token alone. Every route needs a
  session unless marked `@Public()` (browsing the feed and comments, the shared
  grocery list, translation). Writing anything, fasting history and the AI
  recipe helper all require an account. Guests can browse.
- Failed sign-ins are rate limited per account (8 per 15 min) and per IP (40).
- Moderators are signed-in accounts whose email is in `ADMIN_EMAILS`. Those
  addresses cannot be registered from the web; set their password on the server:

  ```bash
  # Docker
  docker compose exec app node dist/cli/set-password.js you@example.com "Your Name"
  # Local
  cd backend && node dist/cli/set-password.js you@example.com "Your Name"
  ```

  The same command resets any user's password (it signs them out everywhere).

### Privacy (POPIA)

- Sign-up needs explicit consent (age 18+, the privacy policy, and storing
  fasting history as health information). The accepted policy version and time
  are recorded per account.
- The server refuses everything except `/api/auth/*` for an account that has not
  accepted the current version, so people who registered earlier (or before a
  policy change) are asked on their next visit.
- Account & Privacy page: download my data (`GET /api/auth/export`) and delete my
  account (`POST /api/auth/delete-account`, password required). Deletion erases
  the account, sessions, recipes and their photo files, comments, likes, reports
  and fasting history. `backend/src/auth/account.service.ts` lists every store;
  add any new kind of personal data there.
- The policy text is `frontend/src/content/privacyPolicy.ts`. It is a DRAFT: fill
  in the [PLACEHOLDERS] and have it reviewed before launch. To change it, bump
  `PRIVACY_POLICY_VERSION` there and in `backend/src/database/auth-db.ts`.

Still to do: email verification and password reset by email (both need an
email-sending service), account deletion inside the mobile app (required by the
app stores), and keeping the mobile app's session across restarts.

Demo data: `node scripts/seed-demo.mjs` creates @example.com accounts with the
password `eden-demo-2026`.

## Documentation

Client documentation lives in `docs/` as PDFs (BTE-DOC-01 to 09: functional
specification, architecture, data model and ERDs, API reference, operations
guide, user guide, POPIA compliance, test plan and report, status and handover),
plus one combined file. They are generated from `docs/source/`:

```bash
node docs/source/screenshots.mjs   # user-guide screenshots (app running with demo data)
node docs/source/build.mjs         # all PDFs (needs Edge or Chrome); add 03 for one
python docs/source/merge.py        # the combined PDF (needs pypdf)
```

## Archived: the pre-restructure files

The old single-package version (Express `server.ts`, the root `src/`, its
`package.json` and its data folder) and the old root `node_modules/` were moved
out of the project to `D:\BackToEden\_archive\` (`legacy-root/` and
`root-node_modules/`). Nothing in the project uses them: all of the old posts,
comments and photos also exist in `backend/data`, and every package installs
its own dependencies. Move `legacy-root` back if you ever need to compare with
the old code; delete `_archive` once you no longer want the copy.
