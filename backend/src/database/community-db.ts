/**
 * Persistence for the community recipe feed.
 *
 * Backed by node:sqlite (built into Node 22+), so there is no native module to
 * compile and no external database to run. The file lives at data/community.db
 * and survives restarts, unlike the in-memory sync store in server.ts.
 *
 * IDENTITY
 * --------
 * Every `userKey` below is the signed-in account's email, taken from a
 * server-verified session (see common/viewer.decorator.ts), so ownership checks
 * such as deletePost and deleteComment are real. Writing anything requires
 * sign-in; browsing the feed does not.
 *
 * ADMIN BOUNDARY
 * --------------
 * This file stores moderation decisions; it does NOT decide who may make them.
 * That is common/admin.service.ts: a signed-in account whose email is listed in
 * ADMIN_EMAILS. Admin passwords are set on the server (cli/set-password.ts), never
 * through web registration.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// CommonJS gives us __dirname directly. This file sits in src/database (or
// dist/database once compiled), so the data directory is two levels up at the
// backend root - the same folder either way.
import { DATA_DIR } from './data-dir';
const DB_PATH = path.join(DATA_DIR, 'community.db');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
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
    removed_at     INTEGER
  );

  CREATE TABLE IF NOT EXISTS post_ingredients (
    post_id  TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name     TEXT    NOT NULL,
    amount   TEXT    NOT NULL DEFAULT '',
    cost_zar REAL    NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, position)
  );

  CREATE TABLE IF NOT EXISTS post_steps (
    post_id  TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    body     TEXT    NOT NULL,
    PRIMARY KEY (post_id, position)
  );

  -- One row per (post, user, kind), so a second tap removes the reaction
  -- instead of stacking another one.
  CREATE TABLE IF NOT EXISTS reactions (
    post_id    TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_key   TEXT    NOT NULL,
    kind       TEXT    NOT NULL CHECK (kind IN ('like', 'cooked')),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_key, kind)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT    PRIMARY KEY,
    post_id     TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_key  TEXT    NOT NULL,
    author_name TEXT    NOT NULL,
    body        TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    removed_at  INTEGER
  );

  CREATE TABLE IF NOT EXISTS reports (
    id           TEXT    PRIMARY KEY,
    target_type  TEXT    NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id    TEXT    NOT NULL,
    reporter_key TEXT    NOT NULL,
    reason       TEXT    NOT NULL,
    created_at   INTEGER NOT NULL,
    resolved_at  INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_posts_created   ON posts (removed_at, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments (post_id, removed_at, created_at);
  CREATE INDEX IF NOT EXISTS idx_reactions_post  ON reactions (post_id, kind);
  CREATE INDEX IF NOT EXISTS idx_reports_open    ON reports (resolved_at, created_at DESC);
`);

/**
 * Adds a column to an existing table when it is missing.
 *
 * CREATE TABLE IF NOT EXISTS silently does nothing once a table exists, so new
 * columns have to be added explicitly or databases created by an earlier build
 * keep the old shape.
 */
function addColumnIfMissing(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('posts', 'image_path', 'TEXT');

// Moderation. The DEFAULT matters: it grandfathers every post that already
// existed before approval was introduced, so turning this on does not blank the
// feed. Only posts written after this point can arrive as 'pending'.
addColumnIfMissing('posts', 'status', "TEXT NOT NULL DEFAULT 'approved'");
addColumnIfMissing('posts', 'reviewed_at', 'INTEGER');
addColumnIfMissing('posts', 'reviewed_by', 'TEXT');

// --- Images ----------------------------------------------------------------

/** Roughly 6MB of decoded image, which a client-side resize should stay well under. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

/**
 * Decodes a data URL into data/uploads and returns the public path to serve it
 * from. Returns null when the input is absent or not an image data URL.
 */
export function saveImageDataUrl(dataUrl: unknown): string | null {
  if (typeof dataUrl !== 'string' || !dataUrl) return null;

  const match = DATA_URL_RE.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Only JPEG, PNG or WebP images are supported.');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    throw new Error('That image could not be read.');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('That image is too large. Please use one under 6MB.');
  }

  const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpg' : match[1];
  const filename = `${newId('img')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

// --- Types -----------------------------------------------------------------

export type ReactionKind = 'like' | 'cooked';

export interface PostIngredientInput {
  name: string;
  amount?: string;
  costZar?: number;
}

export interface CreatePostInput {
  authorKey: string;
  authorName: string;
  title: string;
  description?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  ingredients: PostIngredientInput[];
  steps: string[];
  /** A data URL from the composer; decoded to a file on disk. */
  imageDataUrl?: string;
  /**
   * True when the author is an admin, so the post skips the queue and goes
   * straight to the feed. The caller decides this - see the ADMIN BOUNDARY note.
   */
  autoApprove?: boolean;
}

export interface CommunityPost {
  id: string;
  authorKey: string;
  authorName: string;
  title: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  totalCostZar: number;
  costPerServingZar: number;
  createdAt: number;
  /** Public path such as /uploads/img_xxx.jpg, or null when no photo was added. */
  imageUrl: string | null;
  ingredients: { name: string; amount: string; costZar: number }[];
  steps: string[];
  likeCount: number;
  cookedCount: number;
  commentCount: number;
  /** Which reactions the requesting user has left on this post. */
  viewerReactions: ReactionKind[];
  isOwn: boolean;
  /** Moderation state. Mirrors PostStatus in src/types/index.ts. */
  status: 'pending' | 'approved' | 'rejected';
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: number;
  isOwn: boolean;
}

// --- Validation ------------------------------------------------------------

export const LIMITS = {
  title: 120,
  description: 600,
  ingredientName: 120,
  ingredientAmount: 60,
  step: 600,
  comment: 1000,
  reportReason: 300,
  maxIngredients: 30,
  maxSteps: 30,
};

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Throws an Error with a user-facing message when the input is unusable. */
export function validatePost(input: CreatePostInput): void {
  if (!clean(input.title, LIMITS.title)) {
    throw new Error('A title is required.');
  }
  const ingredients = (input.ingredients || []).filter((i) => clean(i?.name, LIMITS.ingredientName));
  if (ingredients.length === 0) {
    throw new Error('List at least one ingredient.');
  }
  if (ingredients.length > LIMITS.maxIngredients) {
    throw new Error(`A recipe can list at most ${LIMITS.maxIngredients} ingredients.`);
  }
  const steps = (input.steps || []).filter((s) => clean(s, LIMITS.step));
  if (steps.length === 0) {
    throw new Error('Add at least one direction.');
  }
  if (steps.length > LIMITS.maxSteps) {
    throw new Error(`A recipe can have at most ${LIMITS.maxSteps} steps.`);
  }
}

// --- Writes ----------------------------------------------------------------

const insertPost = db.prepare(`
  INSERT INTO posts (id, author_key, author_name, title, description, servings,
                     prep_time, cook_time, total_cost_zar, created_at, image_path, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertIngredient = db.prepare(`
  INSERT INTO post_ingredients (post_id, position, name, amount, cost_zar)
  VALUES (?, ?, ?, ?, ?)
`);
const insertStep = db.prepare(`
  INSERT INTO post_steps (post_id, position, body) VALUES (?, ?, ?)
`);

export function createPost(input: CreatePostInput): string {
  validatePost(input);

  const ingredients = (input.ingredients || [])
    .filter((i) => clean(i?.name, LIMITS.ingredientName))
    .slice(0, LIMITS.maxIngredients)
    .map((i) => ({
      name: clean(i.name, LIMITS.ingredientName),
      amount: clean(i.amount, LIMITS.ingredientAmount),
      costZar: Number.isFinite(Number(i.costZar)) ? Math.max(0, Number(i.costZar)) : 0,
    }));

  const steps = (input.steps || [])
    .map((s) => clean(s, LIMITS.step))
    .filter(Boolean)
    .slice(0, LIMITS.maxSteps);

  // Written before the transaction: a failed image is a bad request, not a
  // half-saved post.
  const imagePath = saveImageDataUrl(input.imageDataUrl);

  const totalCost = ingredients.reduce((sum, i) => sum + i.costZar, 0);
  const servings = Math.min(50, Math.max(1, Math.round(Number(input.servings) || 4)));
  const id = newId('post');

  // One transaction so a post never lands without its ingredients or steps.
  db.exec('BEGIN');
  try {
    insertPost.run(
      id,
      input.authorKey,
      input.authorName,
      clean(input.title, LIMITS.title),
      clean(input.description, LIMITS.description),
      servings,
      clean(input.prepTime, 40),
      clean(input.cookTime, 40),
      totalCost,
      Date.now(),
      imagePath,
      input.autoApprove ? 'approved' : 'pending',
    );
    ingredients.forEach((ing, idx) => {
      insertIngredient.run(id, idx, ing.name, ing.amount, ing.costZar);
    });
    steps.forEach((body, idx) => insertStep.run(id, idx, body));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return id;
}

const selectPostOwner = db.prepare('SELECT author_key FROM posts WHERE id = ? AND removed_at IS NULL');
const softDeletePost = db.prepare('UPDATE posts SET removed_at = ? WHERE id = ?');

/** Returns false when the post is missing or belongs to someone else. */
export function deletePost(postId: string, userKey: string): boolean {
  const row = selectPostOwner.get(postId) as { author_key: string } | undefined;
  if (!row || row.author_key !== userKey) return false;
  softDeletePost.run(Date.now(), postId);
  return true;
}

const hasReaction = db.prepare(
  'SELECT 1 FROM reactions WHERE post_id = ? AND user_key = ? AND kind = ?',
);
const addReaction = db.prepare(
  'INSERT INTO reactions (post_id, user_key, kind, created_at) VALUES (?, ?, ?, ?)',
);
const removeReaction = db.prepare(
  'DELETE FROM reactions WHERE post_id = ? AND user_key = ? AND kind = ?',
);
const postExists = db.prepare('SELECT 1 FROM posts WHERE id = ? AND removed_at IS NULL');

/** Toggles a reaction. Returns true when it is now on, false when removed. */
export function toggleReaction(postId: string, userKey: string, kind: ReactionKind): boolean {
  if (!postExists.get(postId)) throw new Error('That post no longer exists.');

  if (hasReaction.get(postId, userKey, kind)) {
    removeReaction.run(postId, userKey, kind);
    return false;
  }
  addReaction.run(postId, userKey, kind, Date.now());
  return true;
}

const insertComment = db.prepare(`
  INSERT INTO comments (id, post_id, author_key, author_name, body, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export function addComment(
  postId: string,
  authorKey: string,
  authorName: string,
  body: string,
): string {
  if (!postExists.get(postId)) throw new Error('That post no longer exists.');
  const text = clean(body, LIMITS.comment);
  if (!text) throw new Error('A comment cannot be empty.');

  const id = newId('cmt');
  insertComment.run(id, postId, authorKey, authorName, text, Date.now());
  return id;
}

const selectCommentOwner = db.prepare(
  'SELECT author_key FROM comments WHERE id = ? AND removed_at IS NULL',
);
const softDeleteComment = db.prepare('UPDATE comments SET removed_at = ? WHERE id = ?');

export function deleteComment(commentId: string, userKey: string): boolean {
  const row = selectCommentOwner.get(commentId) as { author_key: string } | undefined;
  if (!row || row.author_key !== userKey) return false;
  softDeleteComment.run(Date.now(), commentId);
  return true;
}

const insertReport = db.prepare(`
  INSERT INTO reports (id, target_type, target_id, reporter_key, reason, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export function reportContent(
  targetType: 'post' | 'comment',
  targetId: string,
  reporterKey: string,
  reason: string,
): string {
  const id = newId('rpt');
  insertReport.run(
    id,
    targetType,
    targetId,
    reporterKey,
    clean(reason, LIMITS.reportReason) || 'No reason given',
    Date.now(),
  );
  return id;
}

export function openReportCount(): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM reports WHERE resolved_at IS NULL')
    .get() as { n: number };
  return row.n;
}

// --- Reads -----------------------------------------------------------------

const selectFeed = db.prepare(`
  SELECT
    p.id, p.author_key, p.author_name, p.title, p.description, p.servings,
    p.prep_time, p.cook_time, p.total_cost_zar, p.created_at, p.image_path, p.status,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.kind = 'like')   AS like_count,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.kind = 'cooked') AS cooked_count,
    (SELECT COUNT(*) FROM comments  c WHERE c.post_id = p.id AND c.removed_at IS NULL) AS comment_count
  FROM posts p
  -- Approved posts, plus the viewer's own pending ones so an author can always
  -- see what they submitted and that it is still waiting.
  WHERE p.removed_at IS NULL AND (p.status = 'approved' OR p.author_key = ?)
  ORDER BY p.created_at DESC
  LIMIT ? OFFSET ?
`);

const selectFeedPopular = db.prepare(`
  SELECT
    p.id, p.author_key, p.author_name, p.title, p.description, p.servings,
    p.prep_time, p.cook_time, p.total_cost_zar, p.created_at, p.image_path, p.status,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.kind = 'like')   AS like_count,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.kind = 'cooked') AS cooked_count,
    (SELECT COUNT(*) FROM comments  c WHERE c.post_id = p.id AND c.removed_at IS NULL) AS comment_count
  FROM posts p
  WHERE p.removed_at IS NULL AND (p.status = 'approved' OR p.author_key = ?)
  ORDER BY (like_count + cooked_count * 2) DESC, p.created_at DESC
  LIMIT ? OFFSET ?
`);

const selectIngredients = db.prepare(
  'SELECT name, amount, cost_zar FROM post_ingredients WHERE post_id = ? ORDER BY position',
);
const selectSteps = db.prepare(
  'SELECT body FROM post_steps WHERE post_id = ? ORDER BY position',
);
const selectViewerReactions = db.prepare(
  'SELECT kind FROM reactions WHERE post_id = ? AND user_key = ?',
);

function hydrate(row: any, viewerKey: string): CommunityPost {
  const ingredients = (selectIngredients.all(row.id) as any[]).map((i) => ({
    name: i.name,
    amount: i.amount,
    costZar: i.cost_zar,
  }));
  const steps = (selectSteps.all(row.id) as any[]).map((s) => s.body);
  const viewerReactions = (selectViewerReactions.all(row.id, viewerKey) as any[]).map(
    (r) => r.kind as ReactionKind,
  );
  const servings = row.servings || 1;

  return {
    id: row.id,
    authorKey: row.author_key,
    authorName: row.author_name,
    title: row.title,
    description: row.description,
    servings,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    totalCostZar: row.total_cost_zar,
    costPerServingZar: row.total_cost_zar / servings,
    createdAt: row.created_at,
    imageUrl: row.image_path || null,
    ingredients,
    steps,
    likeCount: row.like_count,
    cookedCount: row.cooked_count,
    commentCount: row.comment_count,
    viewerReactions,
    isOwn: row.author_key === viewerKey,
    status: (row.status as CommunityPost['status']) || 'approved',
  };
}

export function listPosts(
  viewerKey: string,
  sort: 'recent' | 'popular' = 'recent',
  limit = 20,
  offset = 0,
): CommunityPost[] {
  const stmt = sort === 'popular' ? selectFeedPopular : selectFeed;
  const rows = stmt.all(
    viewerKey,
    Math.min(50, Math.max(1, limit)),
    Math.max(0, offset),
  ) as any[];
  return rows.map((row) => hydrate(row, viewerKey));
}

const selectComments = db.prepare(`
  SELECT id, post_id, author_key, author_name, body, created_at
  FROM comments
  WHERE post_id = ? AND removed_at IS NULL
  ORDER BY created_at ASC
  LIMIT 200
`);

export function listComments(postId: string, viewerKey: string): CommunityComment[] {
  return (selectComments.all(postId) as any[]).map((c) => ({
    id: c.id,
    postId: c.post_id,
    authorName: c.author_name,
    body: c.body,
    createdAt: c.created_at,
    isOwn: c.author_key === viewerKey,
  }));
}

/**
 * How many posts this viewer can actually see. Must apply the same filter as
 * the feed queries or pagination reports more pages than exist and the infinite
 * scroll never stops asking.
 */
export function postCount(viewerKey: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM posts
        WHERE removed_at IS NULL AND (status = 'approved' OR author_key = ?)`,
    )
    .get(viewerKey) as { n: number };
  return row.n;
}

// --- Moderation ------------------------------------------------------------

export type PostStatus = 'pending' | 'approved' | 'rejected';

/**
 * Posts waiting for review, oldest first - a queue, not a feed, so the longest
 * wait is dealt with first.
 */
export function listPendingPosts(viewerKey: string, limit = 50): CommunityPost[] {
  const rows = db
    .prepare(
      `SELECT
         p.id, p.author_key, p.author_name, p.title, p.description, p.servings,
         p.prep_time, p.cook_time, p.total_cost_zar, p.created_at, p.image_path, p.status,
         (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.kind = 'like')   AS like_count,
         (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.kind = 'cooked') AS cooked_count,
         (SELECT COUNT(*) FROM comments  c WHERE c.post_id = p.id AND c.removed_at IS NULL) AS comment_count
       FROM posts p
       WHERE p.removed_at IS NULL AND p.status = 'pending'
       ORDER BY p.created_at ASC
       LIMIT ?`,
    )
    .all(Math.min(200, Math.max(1, limit))) as any[];
  return rows.map((row) => hydrate(row, viewerKey));
}

export function pendingCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM posts WHERE removed_at IS NULL AND status = 'pending'")
    .get() as { n: number };
  return row.n;
}

/**
 * Moves a post between approval states.
 *
 * The caller is responsible for checking that the reviewer is an admin - this
 * layer stores the decision, it does not authorise it. See the ADMIN note at
 * the top of this file.
 */
export function setPostStatus(
  postId: string,
  status: PostStatus,
  reviewerKey: string,
): boolean {
  const result = db
    .prepare(
      'UPDATE posts SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ? AND removed_at IS NULL',
    )
    .run(status, Date.now(), reviewerKey, postId);
  return Number(result.changes) > 0;
}

export interface ReportRow {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
  createdAt: number;
  /** The reported post's title, or the comment's text. Null if it is gone. */
  targetSummary: string | null;
  targetAuthor: string | null;
}

/** Open reports, newest first, with enough context to act without a second call. */
export function listOpenReports(limit = 50): ReportRow[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at,
              CASE r.target_type
                WHEN 'post'    THEN (SELECT p.title FROM posts p WHERE p.id = r.target_id)
                ELSE                (SELECT c.body  FROM comments c WHERE c.id = r.target_id)
              END AS target_summary,
              CASE r.target_type
                WHEN 'post'    THEN (SELECT p.author_name FROM posts p WHERE p.id = r.target_id)
                ELSE                (SELECT c.author_name FROM comments c WHERE c.id = r.target_id)
              END AS target_author
         FROM reports r
        WHERE r.resolved_at IS NULL
        ORDER BY r.created_at DESC
        LIMIT ?`,
    )
    .all(Math.min(200, Math.max(1, limit))) as any[];

  return rows.map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    createdAt: r.created_at,
    targetSummary: r.target_summary ?? null,
    targetAuthor: r.target_author ?? null,
  }));
}

export function resolveReport(reportId: string): boolean {
  const result = db
    .prepare('UPDATE reports SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL')
    .run(Date.now(), reportId);
  return Number(result.changes) > 0;
}

/** Removes a post as a moderator, regardless of who wrote it. */
export function removePostAsAdmin(postId: string): boolean {
  const result = db
    .prepare('UPDATE posts SET removed_at = ? WHERE id = ? AND removed_at IS NULL')
    .run(Date.now(), postId);
  return Number(result.changes) > 0;
}

/** Removes a comment as a moderator, regardless of who wrote it. */
export function removeCommentAsAdmin(commentId: string): boolean {
  const result = db
    .prepare('UPDATE comments SET removed_at = ? WHERE id = ? AND removed_at IS NULL')
    .run(Date.now(), commentId);
  return Number(result.changes) > 0;
}


// --- Personal data (POPIA) ---------------------------------------------------

/** Everything this file holds about one person, for "download my data". */
export function exportUserData(userKey: string) {
  const posts = db
    .prepare(
      `SELECT id, title, description, servings, prep_time AS prepTime, cook_time AS cookTime,
              total_cost_zar AS totalCostZar, image_path AS imagePath, status,
              created_at AS createdAt, removed_at AS removedAt
         FROM posts WHERE author_key = ? ORDER BY created_at`,
    )
    .all(userKey) as any[];
  const ingredients = db.prepare(
    'SELECT name, amount, cost_zar AS costZar FROM post_ingredients WHERE post_id = ? ORDER BY position',
  );
  const steps = db.prepare('SELECT body FROM post_steps WHERE post_id = ? ORDER BY position');
  for (const post of posts) {
    post.ingredients = ingredients.all(post.id);
    post.steps = (steps.all(post.id) as any[]).map((s) => s.body);
  }
  return {
    recipes: posts,
    comments: db
      .prepare(
        `SELECT id, post_id AS postId, body, created_at AS createdAt, removed_at AS removedAt
           FROM comments WHERE author_key = ? ORDER BY created_at`,
      )
      .all(userKey),
    reactions: db
      .prepare('SELECT post_id AS postId, kind, created_at AS createdAt FROM reactions WHERE user_key = ?')
      .all(userKey),
    reports: db
      .prepare(
        `SELECT target_type AS targetType, target_id AS targetId, reason, created_at AS createdAt
           FROM reports WHERE reporter_key = ?`,
      )
      .all(userKey),
  };
}

/**
 * Permanently erases one person's community data, including posts that were
 * only hidden (soft-deleted) and the photo files on disk. Other people's
 * comments and reactions on those posts go with them (ON DELETE CASCADE), as do
 * open reports about them.
 */
export function purgeUserData(userKey: string): { posts: number; photos: number } {
  const posts = db
    .prepare('SELECT id, image_path FROM posts WHERE author_key = ?')
    .all(userKey) as { id: string; image_path: string | null }[];
  const commentIds = (
    db.prepare('SELECT id FROM comments WHERE author_key = ?').all(userKey) as { id: string }[]
  ).map((c) => c.id);

  db.exec('BEGIN');
  try {
    const dropReport = db.prepare('DELETE FROM reports WHERE target_type = ? AND target_id = ?');
    for (const p of posts) dropReport.run('post', p.id);
    for (const id of commentIds) dropReport.run('comment', id);
    db.prepare('DELETE FROM reports WHERE reporter_key = ?').run(userKey);
    db.prepare('DELETE FROM reactions WHERE user_key = ?').run(userKey);
    db.prepare('DELETE FROM comments WHERE author_key = ?').run(userKey);
    db.prepare('DELETE FROM posts WHERE author_key = ?').run(userKey);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // Files last: if the database step failed, nothing on disk was touched.
  let photos = 0;
  for (const p of posts) {
    const file = p.image_path?.startsWith('/uploads/') ? path.basename(p.image_path) : '';
    if (!file) continue;
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, file));
      photos++;
    } catch {
      // Already gone.
    }
  }
  return { posts: posts.length, photos };
}
