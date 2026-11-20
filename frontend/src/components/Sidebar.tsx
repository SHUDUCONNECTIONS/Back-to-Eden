import React from 'react';
import { Logo } from './Logo';
import { useT } from '../i18n/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { FastingSession } from '../types';
import { formatDurationShort, useElapsedMs } from '../utils/fasting';
import {
  Wallet,
  CookingPot,
  ChefHat,
  Leaf,
  ShoppingCart,
  Smartphone,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Timer,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  shoppingCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
  onOpenSyncModal: () => void;
  onSignOut: () => void;
  /** The fast currently running, if any, so the rail can tick along with it. */
  activeFast?: FastingSession | null;
  /** Server's answer on whether this user may moderate. Never assumed locally. */
  isAdmin?: boolean;
  /** Items waiting for a moderator: pending posts plus open reports. */
  pendingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  shoppingCount,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
  onOpenSyncModal,
  onSignOut,
  activeFast = null,
  isAdmin = false,
  pendingCount = 0,
}) => {
  const t = useT();

  // Ticks only while a fast is running; the hook no-ops on a null start time.
  const fastElapsedMs = useElapsedMs(activeFast?.startedAt ?? null);

  const navItems = [
    // The feed is the landing view, so it leads the list.
    {
      id: 'community',
      label: 'Community Kitchen',
      shortLabel: 'Community',
      icon: Users,
    },
    {
      id: 'fasting',
      label: 'Fasting Journey',
      shortLabel: 'Fasting',
      icon: Timer,
      // Replaces the count badge with the live elapsed time while fasting.
      badgeText: activeFast ? formatDurationShort(fastElapsedMs) : undefined,
    },
    {
      id: 'budget',
      label: 'Budget Planner',
      shortLabel: 'Budget',
      icon: Wallet,
    },
    {
      id: 'shelf',
      label: 'Ingredient Shelf',
      shortLabel: 'Shelf',
      icon: Leaf,
    },
    {
      id: 'recipes',
      label: 'Nutritious Recipes',
      shortLabel: 'Recipes',
      icon: ChefHat,
    },
    {
      id: 'ai-creator',
      label: 'Leftover Assistant',
      shortLabel: 'Leftovers',
      icon: CookingPot,
      isAccent: true,
    },
    {
      id: 'shopping',
      label: 'Grocery List',
      shortLabel: 'Grocery List',
      icon: ShoppingCart,
      badge: shoppingCount,
    },
    {
      id: 'account',
      label: 'Account & Privacy',
      shortLabel: 'Account',
      icon: UserRound,
    },
    // Only moderators see this entry. The server decides who they are, and
    // checks again on every moderation request - hiding it is not the control.
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: 'Admin',
            shortLabel: 'Admin',
            icon: ShieldCheck,
            badge: pendingCount,
          },
        ]
      : []),
  ];

  const handleSelectNav = (id: string) => {
    onNavigate(id);
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:z-30 bg-[#fdfaf3] border-r border-[#e9dfc8] flex flex-col justify-between transition-all duration-300 ease-in-out ${
          /* Mobile classes */
          isOpenMobile
            ? 'translate-x-0 w-72 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        } ${
          /* Desktop classes */
          isCollapsedDesktop ? 'md:w-20' : 'md:w-64 lg:w-72'
        }`}
      >
        {/* Top Header / Brand emblem */}
        <div className="relative px-4 pt-5 pb-4 border-b border-[#ece2cc]">
          {/* Centred in the panel; the controls float over it rather than
              sharing a row, so the emblem stays optically centred. */}
          <div
            onClick={() => handleSelectNav('community')}
            className="flex justify-center cursor-pointer select-none"
          >
            {!isCollapsedDesktop || isOpenMobile ? (
              <Logo className="w-40 lg:w-44 h-auto" />
            ) : (
              <Logo variant="mark" className="h-10 w-auto" />
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden absolute top-3 right-3 p-1.5 text-[#4e6b3e] hover:text-[#2f4026] rounded-lg"
            aria-label={t('Close menu')}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse / expand button. Sits below the mark when the
              rail is too narrow to hold both side by side. */}
          <button
            onClick={onToggleCollapseDesktop}
            className={`hidden md:flex p-1.5 text-[#627f50] hover:text-[#2f4026] hover:bg-[#e9dfc8] rounded-lg transition-colors cursor-pointer ${
              isCollapsedDesktop ? 'mx-auto mt-3' : 'absolute top-3 right-3'
            }`}
            title={isCollapsedDesktop ? t('Expand sidebar') : t('Collapse sidebar')}
          >
            {isCollapsedDesktop ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Language picker — full width so the native name is readable */}
        {(!isCollapsedDesktop || isOpenMobile) && (
          <div className="px-3 pt-3">
            <LanguageSwitcher />
          </div>
        )}

        {/* Navigation Items List (Matching image_9b1397e3.png) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          <div
            className={`text-[10px] font-bold uppercase tracking-wider text-[#627f50] px-3 pb-1 ${
              isCollapsedDesktop ? 'md:hidden' : ''
            }`}
          >
            {t('Navigation')}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)}
                  title={t(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-[#4e6b3e] text-white shadow-xs'
                      : 'text-[#3e5531] hover:bg-[#e9dfc8] hover:text-[#2f4026]'
                  } ${isCollapsedDesktop ? 'md:justify-center md:px-2' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative shrink-0 flex">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'text-white'
                            : item.isAccent
                            ? 'text-[#4e6b3e]'
                            : 'text-[#4e6b3e]'
                        }`}
                      />
                      {item.id === 'fasting' && activeFast && (
                        <span
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${
                            isActive ? 'bg-white' : 'bg-[#b4642e]'
                          }`}
                        />
                      )}
                    </span>
                    {(!isCollapsedDesktop || isOpenMobile) && (
                      <span className="truncate whitespace-nowrap text-left text-sm font-medium">
                        {t(item.label)}
                      </span>
                    )}
                  </div>

                  {/* Live fasting clock, in the slot the count badge uses */}
                  {item.badgeText && (
                    <span
                      className={`font-numeric text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                        isActive ? 'bg-white text-[#4e6b3e]' : 'bg-[#b4642e] text-white'
                      } ${isCollapsedDesktop ? 'md:hidden' : ''}`}
                    >
                      {item.badgeText}
                    </span>
                  )}

                  {/* Badge matching screenshot (e.g. dark green pill with count "7") */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`font-numeric text-xs font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                        isActive
                          ? 'bg-white text-[#4e6b3e]'
                          : 'bg-[#3e5531] text-white'
                      } ${isCollapsedDesktop ? 'md:hidden' : ''}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Collapsed-rail quick shortcuts */}
        {isCollapsedDesktop && !isOpenMobile && (
          <div className="p-3 border-t border-[#ece2cc] flex flex-col items-center gap-2">
            <button
              onClick={() => handleSelectNav('shopping')}
              className="w-10 h-10 rounded-xl bg-white border border-[#e9dfc8] flex items-center justify-center text-[#4e6b3e] hover:bg-[#eef3e3] transition-colors relative"
              title={t('Open Grocery List')}
            >
              <ShoppingCart className="w-4 h-4" />
              {shoppingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#4e6b3e] text-white text-[9px] flex items-center justify-center font-numeric font-bold">
                  {shoppingCount}
                </span>
              )}
            </button>
            <button
              onClick={onOpenSyncModal}
              className="w-10 h-10 rounded-xl bg-white border border-[#e9dfc8] flex items-center justify-center text-[#4e6b3e] hover:bg-[#eef3e3] transition-colors"
              title={t('Store Sync Code')}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sign Out — pinned to the bottom corner of the sidebar */}
        <div className="p-3 border-t border-[#ece2cc] bg-[#f2e9d6]/70">
          {!isCollapsedDesktop || isOpenMobile ? (
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-semibold text-[#7a4e32] bg-white border border-[#ece2cc] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('Sign Out')}</span>
            </button>
          ) : (
            <button
              onClick={onSignOut}
              className="w-10 h-10 mx-auto rounded-xl bg-white border border-[#e9dfc8] flex items-center justify-center text-[#7a4e32] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
              title={t('Sign out')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
