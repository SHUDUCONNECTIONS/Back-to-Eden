/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AdminOverview,
  CurrencyCode,
  FastingSession,
  FoodItem,
  RecipeIngredient,
  ShoppingItem,
  UserProfile,
} from './types';
import { Sidebar } from './components/Sidebar';
import { BudgetControlBar } from './components/BudgetControlBar';
import { IngredientShelf } from './components/IngredientShelf';
import { RecipeSection } from './components/RecipeSection';
import { GroceryListSync } from './components/GroceryListSync';
import { AiRecipeCreator } from './components/AiRecipeCreator';
import { CommunityFeed } from './components/CommunityFeed';
import { FastingJourney } from './components/FastingJourney';
import { AdminPage } from './components/AdminPage';
import { Footer } from './components/Footer';
import { AuthPage } from './components/AuthPage';
import { Logo } from './components/Logo';
import { Menu, ShoppingCart } from 'lucide-react';
import { useT } from './i18n/useTranslation';
import { fetchFastingState } from './utils/fastingApi';
import { fetchOverview } from './utils/adminApi';
import { AUTH_EXPIRED_EVENT, STORAGE_KEY, fetchMe, signOut, storedUser } from './utils/auth';
import { ConsentScreen } from './components/ConsentScreen';
import { AccountPage } from './components/AccountPage';

const INITIAL_SHOPPING_ITEMS: ShoppingItem[] = [
  { id: 'item-1', name: 'Dried Sugar Beans (1kg)', category: 'Proteins', priceZar: 28, quantity: 1, checked: false, note: 'High plant protein & iron' },
  { id: 'item-2', name: 'Maize Meal / Pap (2.5kg)', category: 'Staples', priceZar: 34, quantity: 1, checked: false, note: 'Household staple' },
  { id: 'item-3', name: 'Fresh Seasonal Spinach / Morogo', category: 'Produce', priceZar: 16, quantity: 2, checked: false, note: 'Rich in Vitamin A & Iron' },
  { id: 'item-4', name: 'Brown Lentils (500g)', category: 'Proteins', priceZar: 19.5, quantity: 1, checked: false, note: 'Quick cooking no-soak pulse' },
  { id: 'item-5', name: 'Crisp Green Cabbage (Whole head)', category: 'Produce', priceZar: 15, quantity: 1, checked: false, note: 'High volume vitamin C' },
  { id: 'item-6', name: 'Yellow Onions (1kg bag)', category: 'Produce', priceZar: 18, quantity: 1, checked: false, note: 'Prebiotic flavor base' },
  { id: 'item-7', name: 'Pilchards in Tomato Sauce (400g tin)', category: 'Proteins', priceZar: 23.5, quantity: 1, checked: false, note: 'Marine Omega-3 powerhouse' },
];

export default function App() {
  const t = useT();

  // Currency is fixed to ZAR app-wide; prices in the food database are stored in rand.
  const currency: CurrencyCode = 'ZAR';

  // Household & Budget configuration (Default 500 ZAR ~ R400-R600)
  const [budgetZar, setBudgetZar] = useState<number>(500);
  const [householdSize, setHouseholdSize] = useState<number>(2);

  // User Authentication state (mock bypass with client-side profile persistence)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = storedUser();
    // Profiles saved by the old pretend sign-in have no session token. Treat
    // them as signed out so the person signs in (or registers) for real.
    if (saved && !saved.isGuest && !saved.token) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      return null;
    }
    return saved;
  });
  const handleAuthSuccess = (user: UserProfile, options?: { landing?: string }) => {
    setCurrentUser(user);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch {}
    // A moderator signing in through the admin form opens on the admin desk
    // rather than the feed. The section still only renders if the server
    // confirms they are an admin.
    if (options?.landing) {
      setActiveSection(options.landing);
    }
  };

  const handleSignOut = () => {
    void signOut(currentUser);
    setCurrentUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // Saves a change to the signed-in profile (e.g. consent given).
  const updateUser = (next: UserProfile) => {
    setCurrentUser(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  // On opening the app, ask the server whether the saved session is still good
  // and whether the privacy policy has changed since this person accepted it.
  const sessionToken = currentUser?.token;
  useEffect(() => {
    const user = storedUser();
    if (!sessionToken || !user) return;
    fetchMe(user).then((me) => {
      if (me && me.needsConsent !== Boolean(user.needsConsent)) {
        updateUser({ ...user, needsConsent: me.needsConsent });
      }
    });
  }, [sessionToken]);

  // The server rejected the saved session (expired, or the password was
  // changed): drop it and show the sign-in page.
  useEffect(() => {
    const expire = () => {
      setCurrentUser(null);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
  }, []);

  // Sidebar visibility & active section
  // The community feed is the landing view: signing in should drop you
  // straight into the posts, the way a social app opens.
  const [activeSection, setActiveSection] = useState<string>('community');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState<boolean>(false);

  // The running fast lives here rather than inside the Fasting Journey view, so
  // the sidebar can show a live timer no matter which section is open. The view
  // itself owns the history and the totals.
  const [activeFast, setActiveFast] = useState<FastingSession | null>(null);

  // Whether this user may moderate is the server's answer, not a local guess.
  // It starts closed so a slow or failed check never briefly exposes the page.
  const [adminOverview, setAdminOverview] = useState<AdminOverview>({
    isAdmin: false,
    pendingCount: 0,
    reportCount: 0,
  });

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    fetchOverview(currentUser).then((overview) => {
      if (!cancelled) setAdminOverview(overview);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    fetchFastingState(currentUser)
      .then((state) => {
        if (!cancelled) setActiveFast(state.active);
      })
      .catch(() => {
        // Silent: the sidebar timer is a nicety. The Fasting Journey view
        // fetches the same state and surfaces any error there.
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Cross-device sync code
  const [syncCode, setSyncCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('sync');
    if (fromUrl) return fromUrl.toUpperCase().trim();

    const savedCode = localStorage.getItem('nourish_sync_code');
    if (savedCode) return savedCode;

    // Lists are stored on the server and the code is the only key, so it must
    // not be guessable: 8 characters from 32 (no I/O/0/1) is ~1 trillion codes.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return `CART-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
  });

  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem(`nourish_items_${syncCode}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_SHOPPING_ITEMS;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const isUpdatingRef = useRef<boolean>(false);

  // The app shows one section at a time rather than stacking them into a single
  // long page. A continuous page meant the community feed could never own its
  // own scroll — reading past the last post dropped you into the next section.

  // Sync items to backend
  const pushSyncToServer = useCallback(
    async (itemsToPush: ShoppingItem[], currentBudget: number, currentCurr: CurrencyCode) => {
      try {
        setIsSyncing(true);
        isUpdatingRef.current = true;
        const res = await fetch(`/api/sync/${syncCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: itemsToPush,
            budget: currentBudget,
            currency: currentCurr,
            householdSize,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLastSyncTime(data.lastUpdated);
          localStorage.setItem(`nourish_items_${syncCode}`, JSON.stringify(itemsToPush));
          localStorage.setItem('nourish_sync_code', syncCode);
        }
      } catch (err) {
        console.warn('Network sync offline - cached locally:', err);
        localStorage.setItem(`nourish_items_${syncCode}`, JSON.stringify(itemsToPush));
      } finally {
        setIsSyncing(false);
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 300);
      }
    },
    [syncCode, householdSize]
  );

  // Fetch sync state from backend
  const fetchSyncFromServer = useCallback(async () => {
    if (isUpdatingRef.current) return;
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/sync/${syncCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          setShoppingItems(data.items);
          localStorage.setItem(`nourish_items_${syncCode}`, JSON.stringify(data.items));
        }
        if (typeof data.budget === 'number') {
          setBudgetZar(data.budget);
        }
        setLastSyncTime(data.lastUpdated || Date.now());
      } else if (res.status === 404) {
        pushSyncToServer(shoppingItems, budgetZar, currency);
      }
    } catch (err) {
      // offline silent fallback
    } finally {
      setIsSyncing(false);
    }
  }, [syncCode, pushSyncToServer, shoppingItems, budgetZar, currency]);

  // Initial load sync & polling loop every 3.5 seconds for live multi-device updates.
  // Held back until the user is through the sign-in gate so the auth page stays idle.
  useEffect(() => {
    if (!currentUser) return;
    fetchSyncFromServer();
    const interval = setInterval(() => {
      fetchSyncFromServer();
    }, 3500);
    return () => clearInterval(interval);
  }, [currentUser, fetchSyncFromServer]);

  // Handlers for shopping list
  const handleToggleItem = (id: string) => {
    const updated = shoppingItems.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setShoppingItems(updated);
    pushSyncToServer(updated, budgetZar, currency);
  };

  const handleAddItem = (item: Omit<ShoppingItem, 'id'>) => {
    const newItem: ShoppingItem = {
      ...item,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [newItem, ...shoppingItems];
    setShoppingItems(updated);
    pushSyncToServer(updated, budgetZar, currency);
  };

  const handleDeleteItem = (id: string) => {
    const updated = shoppingItems.filter((i) => i.id !== id);
    setShoppingItems(updated);
    pushSyncToServer(updated, budgetZar, currency);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = shoppingItems
      .map((item) => {
        if (item.id === id) {
          const nextQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: nextQty };
        }
        return item;
      })
      .filter(Boolean);
    setShoppingItems(updated);
    pushSyncToServer(updated, budgetZar, currency);
  };

  const handleClearChecked = () => {
    const updated = shoppingItems.filter((item) => !item.checked);
    setShoppingItems(updated);
    pushSyncToServer(updated, budgetZar, currency);
  };

  const handleAddFoodFromShelf = (food: FoodItem) => {
    const existing = shoppingItems.find(
      (it) => it.id === food.id || it.name.toLowerCase().includes(food.name.toLowerCase())
    );
    let updated: ShoppingItem[];
    if (existing) {
      updated = shoppingItems.map((it) =>
        it.id === existing.id ? { ...it, quantity: it.quantity + 1 } : it
      );
    } else {
      const newItem: ShoppingItem = {
        id: food.id,
        name: `${food.name} (${food.packSize.split('(')[0].trim()})`,
        category: food.categoryLabel,
        priceZar: food.unitCostZar,
        quantity: 1,
        checked: false,
        note: food.badge,
      };
      updated = [newItem, ...shoppingItems];
    }
    setShoppingItems(updated);
    pushSyncToServer(updated, budgetZar, currency);
  };

  const handleAddRecipeIngredientsToCart = (
    ingredients: RecipeIngredient[],
    recipeTitle: string
  ) => {
    const newItems: ShoppingItem[] = ingredients.map((ing, idx) => ({
      id: `recipe-item-${Date.now()}-${idx}`,
      name: `${ing.name} (${ing.packSize})`,
      category: ing.category === 'vegetable' ? 'Produce' : ing.category === 'protein' ? 'Proteins' : 'Staples',
      priceZar: ing.packCostZar,
      quantity: 1,
      checked: false,
      note: `For ${recipeTitle}`,
    }));

    const updated = [...shoppingItems];
    for (const newItem of newItems) {
      const existing = updated.find(
        (it) => it.name.toLowerCase() === newItem.name.toLowerCase()
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        updated.push(newItem);
      }
    }

    setShoppingItems(updated);
    pushSyncToServer(updated, budgetZar, currency);
  };

  const handleBudgetChange = (newBudgetZar: number) => {
    setBudgetZar(newBudgetZar);
    pushSyncToServer(shoppingItems, newBudgetZar, currency);
  };

  const handleChangeSyncCode = (newCode: string) => {
    setSyncCode(newCode);
    localStorage.setItem('nourish_sync_code', newCode);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('sync', newCode);
    window.history.replaceState({}, '', newUrl.toString());
  };

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    // A new view always starts at the top; carrying the old scroll position over
    // lands you halfway down unrelated content.
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const savedItemIds = new Set(
    shoppingItems.map((item) => item.id).concat(
      shoppingItems.map((item) => item.name.toLowerCase())
    )
  );

  const cartTotalZar = shoppingItems.reduce(
    (acc, it) => acc + it.priceZar * it.quantity,
    0
  );

  // Sign-in gate: the auth screen is the landing page. Everything below renders
  // only once a profile exists (a real account or the guest bypass).
  // Declared after every hook above so hook order stays stable across renders.
  if (!currentUser) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  // POPIA consent gate. The server enforces it too; this is just the screen.
  if (currentUser.needsConsent) {
    return (
      <ConsentScreen
        user={currentUser}
        onAccepted={() => updateUser({ ...currentUser, needsConsent: false })}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7eedd] text-[#2f4026] flex font-sans selection:bg-[#4e6b3e] selection:text-white">
      {/* Floating Mobile Menu Trigger Button (Top Bar is removed) */}
      <div className="fixed top-3 left-3 z-40 md:hidden flex items-center gap-2">
        <button
          onClick={() => setIsOpenMobile(true)}
          className="p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-[#e9dfc8] text-[#4e6b3e] shadow-sm hover:bg-[#eef3e3] transition-colors cursor-pointer flex items-center gap-2"
          aria-label={t('Open navigation menu')}
        >
          <Menu className="w-5 h-5" />
          <Logo variant="mark" className="h-5 w-auto" />
        </button>

        {shoppingItems.length > 0 && (
          <button
            onClick={() => handleNavigate('shopping')}
            className="p-2.5 rounded-xl bg-[#4e6b3e] text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
            aria-label={t('View shopping list')}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs font-numeric font-bold">{shoppingItems.length}</span>
          </button>
        )}
      </div>

      {/* Side Navigation Bar (The primary navigation system) */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        shoppingCount={shoppingItems.length}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleCollapseDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
        onOpenSyncModal={() => handleNavigate('shopping')}
        onSignOut={handleSignOut}
        activeFast={activeFast}
        isAdmin={adminOverview.isAdmin}
        pendingCount={adminOverview.pendingCount + adminOverview.reportCount}
      />

      {/* Main Content Area offset by Sidebar */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsedDesktop ? 'md:pl-20' : 'md:pl-64 lg:pl-72'
        }`}
      >
        <main className="flex-1">
          {/* Moderator desk: review queue, reports, and posting as an admin */}
          {activeSection === 'admin' && adminOverview.isAdmin && (
          <AdminPage
            user={currentUser}
            currency={currency}
            onOverviewChange={setAdminOverview}
          />
          )}

          {/* Intermittent fasting timer, streaks and education */}
          {activeSection === 'fasting' && (
          <FastingJourney
            user={currentUser}
            activeFast={activeFast}
            onActiveFastChange={setActiveFast}
            onNavigate={handleNavigate}
          />
          )}

          {/* Step 1: Budget Control & Planning Tool */}
          {activeSection === 'budget' && (
          <BudgetControlBar
            budgetZar={budgetZar}
            onBudgetChange={handleBudgetChange}
            householdSize={householdSize}
            onHouseholdSizeChange={setHouseholdSize}
            currency={currency}
            cartTotalZar={cartTotalZar}
            recipeAllocatedZar={cartTotalZar}
          />
          )}

          {/* Step 2: The Ingredient Shelf */}
          {activeSection === 'shelf' && (
          <IngredientShelf
            currency={currency}
            onAddToShoppingList={handleAddFoodFromShelf}
            savedItemIds={savedItemIds}
            currentBudgetZar={budgetZar}
          />
          )}

          {/* Step 3: Discover Nutritious Recipes with Cost Tracking */}
          {activeSection === 'recipes' && (
          <RecipeSection
            currency={currency}
            onAddRecipeIngredientsToCart={handleAddRecipeIngredientsToCart}
            currentBudgetZar={budgetZar}
          />
          )}

          {/* Intelligent Leftover Recipe Generator */}
          {activeSection === 'ai-creator' && (
          <AiRecipeCreator
            currency={currency}
            onAddRecipeIngredientsToCart={handleAddRecipeIngredientsToCart}
            currentBudgetZar={budgetZar}
          />
          )}

          {/* Community recipe feed — posts, likes, "cooked this" and comments */}
          {activeSection === 'community' && (
          <CommunityFeed
            user={currentUser}
            currency={currency}
            onAddRecipeIngredientsToCart={handleAddRecipeIngredientsToCart}
          />
          )}

          {/* Step 4: In-Store Shopping List with Real-Time Multi-Device Sync */}
          {activeSection === 'account' && (
          <AccountPage
            user={currentUser}
            onSignOut={handleSignOut}
            onDeleted={() => {
              // The server has already ended every session for this account.
              setCurrentUser(null);
              try { localStorage.removeItem(STORAGE_KEY); } catch {}
              setActiveSection('community');
            }}
          />
          )}

          {activeSection === 'shopping' && (
          <GroceryListSync
            items={shoppingItems}
            currency={currency}
            budgetZar={budgetZar}
            syncCode={syncCode}
            isSyncing={isSyncing}
            onToggleItem={handleToggleItem}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onUpdateQuantity={handleUpdateQuantity}
            onClearChecked={handleClearChecked}
            onSyncNow={fetchSyncFromServer}
            onChangeSyncCode={handleChangeSyncCode}
            lastSyncTime={lastSyncTime}
          />
          )}
        </main>

        {/* Footer */}
        <Footer onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      </div>
    </div>
  );
}
