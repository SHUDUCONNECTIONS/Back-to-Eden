-- Back To Eden database schema (SQLite)
--
-- GENERATED FILE - do not edit by hand. The schema lives in
-- backend/src/database/*.ts and is created automatically when the server
-- starts. Regenerate this file after changing it:
--
--   cd backend && npm run build && npm run schema
--
-- Five separate database files, one per feature. Members are referred to
-- across files by their lower-case email (author_key, user_key,
-- reporter_key, reviewed_by); see docs/BTE-DOC-03 Data Model and ERDs.pdf.
-- Times are milliseconds since 1970 UTC; money is South African rand.


-- ==========================================================================
-- auth.db: Accounts and sign-in sessions
-- ==========================================================================

CREATE TABLE users (
  email         TEXT PRIMARY KEY,
  name          TEXT    NOT NULL,
  password_hash TEXT,
  created_at    INTEGER NOT NULL,
  -- added by later versions (upgraded in place at start-up)
  policy_version TEXT,
  policy_accepted_at INTEGER
);

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  email       TEXT    NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE INDEX idx_sessions_email ON sessions (email);


-- ==========================================================================
-- community.db: Community Kitchen: recipes, reactions, comments, reports
-- ==========================================================================

CREATE TABLE posts (
  id             TEXT PRIMARY KEY,
  author_key     TEXT    NOT NULL,
  author_name    TEXT    NOT NULL,
  title          TEXT    NOT NULL,
  description    TEXT    NOT NULL DEFAULT '',
  servings       INTEGER NOT NULL DEFAULT 4,
  prep_time      TEXT    NOT NULL DEFAULT '',
  cook_time      TEXT    NOT NULL DEFAULT '',
  total_cost_zar REAL    NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  removed_at     INTEGER,
  -- added by later versions (upgraded in place at start-up)
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  reviewed_at INTEGER,
  reviewed_by TEXT
);

CREATE TABLE post_ingredients (
  post_id  TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name     TEXT    NOT NULL,
  amount   TEXT    NOT NULL DEFAULT '',
  cost_zar REAL    NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, position)
);

CREATE TABLE post_steps (
  post_id  TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  body     TEXT    NOT NULL,
  PRIMARY KEY (post_id, position)
);

CREATE TABLE reactions (
  post_id    TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_key   TEXT    NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('like', 'cooked')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_key, kind)
);

CREATE TABLE comments (
  id          TEXT    PRIMARY KEY,
  post_id     TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_key  TEXT    NOT NULL,
  author_name TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  removed_at  INTEGER
);

CREATE TABLE reports (
  id           TEXT    PRIMARY KEY,
  target_type  TEXT    NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id    TEXT    NOT NULL,
  reporter_key TEXT    NOT NULL,
  reason       TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  resolved_at  INTEGER
);

CREATE INDEX idx_posts_created   ON posts (removed_at, created_at DESC);

CREATE INDEX idx_comments_post   ON comments (post_id, removed_at, created_at);

CREATE INDEX idx_reactions_post  ON reactions (post_id, kind);

CREATE INDEX idx_reports_open    ON reports (resolved_at, created_at DESC);


-- ==========================================================================
-- fasting.db: Fasting history (health information)
-- ==========================================================================

CREATE TABLE fasting_sessions (
  id           TEXT PRIMARY KEY,
  user_key     TEXT    NOT NULL,
  schedule_id  TEXT    NOT NULL,
  target_hours REAL    NOT NULL,
  started_at   INTEGER NOT NULL,
  ended_at     INTEGER,
  note         TEXT    NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
);

CREATE TABLE fasting_prefs (
  user_key     TEXT PRIMARY KEY,
  schedule_id  TEXT NOT NULL,
  target_hours REAL NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX idx_sessions_user
  ON fasting_sessions (user_key, started_at DESC);

CREATE UNIQUE INDEX idx_one_active_fast
  ON fasting_sessions (user_key) WHERE ended_at IS NULL;


-- ==========================================================================
-- sync.db: Grocery lists shared by code
-- ==========================================================================

CREATE TABLE rooms (
  code        TEXT PRIMARY KEY,
  data        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_rooms_updated ON rooms (updated_at);


-- ==========================================================================
-- translations.db: Cached machine translations of interface text
-- ==========================================================================

CREATE TABLE translations (
  locale      TEXT NOT NULL,
  source      TEXT NOT NULL,
  translated  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (locale, source)
);
