/**
 * The API contract, shared by the web app and the Expo app.
 *
 * This is the wire format: what the NestJS backend returns and accepts. It is
 * deliberately free of anything React, so both clients can import it without
 * dragging a UI library along.
 *
 * The backend keeps its own copies of these shapes in src/database rather than
 * importing from here, because a server should not break when a client package
 * is reorganised. When you change a shape, change both - the parity tests in
 * the repo will tell you if they drift.
 */

export type ReactionKind = 'like' | 'cooked';

export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface CommunityPostIngredient {
  name: string;
  amount: string;
  costZar: number;
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
  ingredients: CommunityPostIngredient[];
  steps: string[];
  likeCount: number;
  cookedCount: number;
  commentCount: number;
  /** Reactions the signed-in viewer has already left on this post. */
  viewerReactions: ReactionKind[];
  isOwn: boolean;
  /** The feed only carries approved posts and the viewer's own pending ones. */
  status: PostStatus;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: number;
  isOwn: boolean;
}

export interface FeedPage {
  posts: CommunityPost[];
  total: number;
  hasMore: boolean;
}

export interface ModerationReport {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
  createdAt: number;
  targetSummary: string | null;
  targetAuthor: string | null;
}

export interface AdminOverview {
  isAdmin: boolean;
  pendingCount: number;
  reportCount: number;
}

// --- Fasting ---------------------------------------------------------------

export interface FastingSession {
  id: string;
  scheduleId: string;
  targetHours: number;
  startedAt: number;
  /** null while the fast is still running. */
  endedAt: number | null;
  note: string;
  /** Milliseconds fasted, as computed by the server when it read the row. */
  durationMs: number;
  reachedGoal: boolean;
}

export interface FastingTotals {
  sessionCount: number;
  goalCount: number;
  totalHours: number;
  longestHours: number;
}

export interface FastingState {
  active: FastingSession | null;
  sessions: FastingSession[];
  totals: FastingTotals;
  lastSchedule: { scheduleId: string; targetHours: number } | null;
}

// --- Identity --------------------------------------------------------------

/**
 * Who the client claims to be, sent as x-user-key / x-user-name headers.
 *
 * Not verified by anything. See the IDENTITY WARNING in the backend's database
 * modules before treating any of it as authentication.
 */
export interface UserProfile {
  name: string;
  email: string;
  isGuest: boolean;
  /** Session token from /api/auth. Absent for guests. */
  token?: string;
  /** The server wants this account to accept the current privacy policy. */
  needsConsent?: boolean;
}
