import React from 'react';
import { CurrencyCode } from '../types';
import { CURRENCIES } from '../utils/currency';
import { RefreshCw, ShoppingCart, Smartphone, Menu } from 'lucide-react';
import { useT } from '../i18n/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
  shoppingCount: number;
  syncCode: string;
  isSyncing: boolean;
  onOpenSyncModal: () => void;
  onNavigate: (sectionId: string) => void;
  onToggleMobileSidebar: () => void;
  isCollapsedDesktop: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currency,
  onCurrencyChange,
  shoppingCount,
  syncCode,
  isSyncing,
  onOpenSyncModal,
  onNavigate,
  onToggleMobileSidebar,
}) => {
  const t = useT();

  return (
    <header className="sticky top-0 z-40 bg-[#f7eedd]/95 backdrop-blur-md border-b border-[#ece2cc] px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Mobile Sidebar Toggle + Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-[#4e6b3e] hover:bg-[#e9dfc8] rounded-lg transition-colors cursor-pointer"
            aria-label={t('Open navigation sidebar')}
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigate('community')}
            className="text-left group cursor-pointer focus-visible:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3e5531]"></span>
              <span className="text-xl font-bold tracking-tight text-[#2f4026] whitespace-nowrap">
                Back To <span className="font-editorial italic font-normal text-[#4e6b3e]">Eden</span>
              </span>
            </div>
          </button>
        </div>

        {/* Quick Horizontal Jump Links for desktop */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#3e5531]">
          <button
            onClick={() => onNavigate('budget')}
            className="hover:text-[#2f4026] transition-colors whitespace-nowrap cursor-pointer"
          >
            {t('Budget Planner')}
          </button>
          <button
            onClick={() => onNavigate('shelf')}
            className="hover:text-[#2f4026] transition-colors whitespace-nowrap cursor-pointer"
          >
            {t('Ingredient Shelf')}
          </button>
          <button
            onClick={() => onNavigate('recipes')}
            className="hover:text-[#2f4026] transition-colors whitespace-nowrap cursor-pointer"
          >
            {t('Nutritious Recipes')}
          </button>
          <button
            onClick={() => onNavigate('ai-creator')}
            className="hover:text-[#2f4026] transition-colors whitespace-nowrap cursor-pointer text-[#4e6b3e]"
          >
            {t('Leftover Assistant')}
          </button>
          <button
            onClick={() => onNavigate('shopping')}
            className="hover:text-[#2f4026] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            {t('Grocery List')}
            {shoppingCount > 0 && (
              <span className="text-[11px] font-numeric font-bold px-1.5 py-0.2 bg-[#3e5531] text-white rounded-full">
                {shoppingCount}
              </span>
            )}
          </button>
        </nav>

        {/* Utility Controls & Primary Basket Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Currency Switcher */}
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="text-xs font-medium text-[#2f4026] bg-[#e9dfc8] hover:bg-[#ddd3ba] border border-[#ddd3ba] rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3e5531] transition-colors"
              aria-label={t('Select currency')}
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].symbol} ({c})
                </option>
              ))}
            </select>
          </div>

          {/* Sync Button / Device Connect */}
          <button
            onClick={onOpenSyncModal}
            className="flex items-center gap-1.5 text-xs font-medium text-[#3e5531] bg-[#e9efe0] hover:bg-[#d4dfc6] border border-[#d4dfc6] rounded-lg px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title={t('Cross-device grocery store sync')}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#3e5531]" />
            <span className="hidden sm:inline">{t('Store Sync')}</span>
            <span className="font-numeric text-[11px] text-[#4e6b3e] bg-white/70 px-1 rounded">
              {syncCode}
            </span>
            {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-[#4e6b3e]" />}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => onNavigate('shopping')}
            className="flex items-center gap-2 text-xs font-semibold text-white bg-[#3e5531] hover:bg-[#2f4026] rounded-lg px-3.5 py-2 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('My Basket')}</span>
            <span className="font-numeric text-xs tabular-nums bg-white/20 px-1.5 py-0.5 rounded">
              {shoppingCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
