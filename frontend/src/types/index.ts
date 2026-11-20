export type CurrencyCode = 'ZAR' | 'USD' | 'EUR' | 'GBP' | 'KES' | 'NGN';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateFromZar: number; // 1 ZAR = rateFromZar
  symbolPlacement: 'before' | 'after';
}

export type FoodCategory = 'protein' | 'staple' | 'vegetable' | 'healthy-fat' | 'pantry';

/** Dietary concerns a food is commonly recommended for. General guidance, not medical advice. */
export type HealthFocus = 'blood-pressure' | 'diabetes' | 'inflammation' | 'gut-health';

/** Whether a food suits adding weight (energy dense) or losing it (filling per calorie). */
export type WeightGoal = 'weight-gain' | 'weight-loss';

/** ABO blood group, for the blood type eating framework. */
export type BloodType = 'O' | 'A' | 'B' | 'AB';

/** A minimal one-pot preparation for a single shelf food: what to buy alongside it, and how to cook it. */
export interface SimplePrep {
  title: string;
  servings: number;
  /** Total hands-on plus cooking time, e.g. "35 mins". */
  time: string;
  /** Everything needed, the shelf food included, listed in the order it is used. */
  ingredients: string[];
  directions: string[];
}

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  categoryLabel: string;
  subDescription: string;
  unitCostZar: number; // Cost of standard pack in ZAR
  packSize: string; // e.g. "1kg dried", "2.5kg bag", "bunch"
  servingsPerPack: number;
  nutritionScore: 'Exceptional' | 'High' | 'Good';
  badge: string; // e.g., "Often budget-friendly", "Compare pack sizes", "High satiety"
  practicalTip: string;
  nutritionHighlights: string[];
  /** Conditions this food is a sensible choice for. Empty when no strong link applies. */
  healthFocus: HealthFocus[];
  /** Weight goals this food supports. Can be both. */
  weightGoal: WeightGoal[];
  /** Blood types this food is favoured or neutral for under the blood type diet. */
  bloodTypes: BloodType[];
  keyNutrients: {
    protein: string;
    fiber: string;
    caloriesPerServing: number;
    micronutrient: string;
  };
  storageAdvice: string;
  /** A simple way to actually cook this food, shown on the shelf card. */
  simplePrep: SimplePrep;
  imageUrl?: string;
  inStock?: boolean;
}

export interface RecipeIngredient {
  foodId?: string;
  name: string;
  amount: string;
  portionCostZar: number; // cost of portion used in recipe
  packCostZar: number; // cost to buy whole pack at store
  packSize: string;
  category: FoodCategory;
  nutrition: string;
}

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  difficulty: 'Very Easy' | 'Easy' | 'Moderate';
  dietaryTags: string[];
  totalCostZar: number; // Total cost of portions
  costPerServingZar: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  imageUrl?: string;
  nutritionFacts: {
    calories: number;
    proteinG: number;
    fiberG: number;
    carbsG: number;
    fatG: number;
    ironMg: number;
  };
  budgetTip: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  priceZar: number;
  quantity: number;
  checked: boolean;
  recipeSource?: string;
  note?: string;
}

export interface SyncRoomState {
  code: string;
  items: ShoppingItem[];
  budgetZar: number;
  currency: CurrencyCode;
  householdSize: number;
  lastUpdated: number;
  deviceAgent?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  isGuest: boolean;
  /** Session token from /api/auth. Absent for guests. */
  token?: string;
  /** The server wants this account to accept the current privacy policy. */
  needsConsent?: boolean;
}

// --- Community feed --------------------------------------------------------

export type ReactionKind = 'like' | 'cooked';

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
  /** Moderation state. The feed only carries approved posts and your own pending ones. */
  status: PostStatus;
}

export type PostStatus = 'pending' | 'approved' | 'rejected';

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

export interface CommunityComment {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: number;
  isOwn: boolean;
}

// --- Fasting Journey -------------------------------------------------------

export interface FastingSchedule {
  /** Stable slug stored on every session row. */
  id: string;
  /** Short name shown on the card, e.g. "16:8". */
  label: string;
  /** Human name, e.g. "The classic window". */
  name: string;
  fastHours: number;
  eatHours: number;
  level: 'gentle' | 'common' | 'advanced';
  blurb: string;
}

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
