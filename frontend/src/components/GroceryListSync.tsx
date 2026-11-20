import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ShoppingItem, CurrencyCode } from '../types';
import { formatPrice } from '../utils/currency';
import { useT } from '../i18n/useTranslation';
import {
  ShoppingCart,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Copy,
  QrCode,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  Check,
  Share2,
  Store,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { PriceNote } from './PriceNote';

interface GroceryListSyncProps {
  items: ShoppingItem[];
  currency: CurrencyCode;
  budgetZar: number;
  syncCode: string;
  isSyncing: boolean;
  onToggleItem: (id: string) => void;
  onAddItem: (item: Omit<ShoppingItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearChecked: () => void;
  onSyncNow: () => void;
  onChangeSyncCode: (newCode: string) => void;
  lastSyncTime: number | null;
}

export const GroceryListSync: React.FC<GroceryListSyncProps> = ({
  items,
  currency,
  budgetZar,
  syncCode,
  isSyncing,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onUpdateQuantity,
  onClearChecked,
  onSyncNow,
  onChangeSyncCode,
  lastSyncTime,
}) => {
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // The link a second device opens to join this list: the current address
  // with ?sync=<code>. Used by both the QR code and "Copy Link".
  const shareUrl = (() => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('sync', syncCode);
    return url.toString();
  })();

  // "localhost" on a phone means the phone itself, so a QR code made while
  // the app is open at localhost cannot work on another device.
  const isLocalOnly = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);

  useEffect(() => {
    if (!showQrModal) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 288,
      color: { dark: '#2f4026', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [showQrModal, shareUrl]);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>(syncCode);
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);

  // Quick add form state
  const [newItemName, setNewItemName] = useState<string>('');
  const t = useT();
  const [newItemCategory, setNewItemCategory] = useState<string>('Produce');
  const [newItemPrice, setNewItemPrice] = useState<string>('15');

  // Grocery aisle organization
  const [groupByAisle, setGroupByAisle] = useState<boolean>(true);

  // Financial calculations
  const totalCostZar = items.reduce((acc, it) => acc + it.priceZar * it.quantity, 0);
  const spentSoFarZar = items
    .filter((it) => it.checked)
    .reduce((acc, it) => acc + it.priceZar * it.quantity, 0);
  const remainingCostZar = totalCostZar - spentSoFarZar;
  const remainingBudgetZar = budgetZar - totalCostZar;
  const isOverBudget = remainingBudgetZar < 0;

  const checkedCount = items.filter((it) => it.checked).length;
  const totalCount = items.length;

  const handleCopySyncLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleSaveCustomCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      onChangeSyncCode(inputCode.trim().toUpperCase());
      setIsEditingCode(false);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddItem({
      name: newItemName.trim(),
      category: newItemCategory,
      priceZar: parseFloat(newItemPrice) || 10,
      quantity: 1,
      checked: false,
      note: 'Custom grocery item',
    });
    setNewItemName('');
  };

  // Group items by aisle category
  const categories = Array.from(new Set(items.map((i) => i.category || 'General')));

  return (
    <section id="shopping" className="py-12 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#5f7250] uppercase">
              <span className="w-5 h-px bg-[#5f7250]"></span>
              <span>{t('Step 4 · In-Store Grocery Navigator')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2f4026]">
              {t('Live cross-device shopping list.')}
            </h2>
            <p className="text-sm text-[#4e6b3e] max-w-xl">
              {t('Take this list with you on your phone down grocery store aisles. Checked items sync in real time across all your devices.')}
            </p>
            <PriceNote currency={currency} />
          </div>

          {/* Sync Connection Card */}
          <div className="bg-white border border-[#e9dfc8] rounded-xl p-3.5 flex flex-wrap items-center gap-3 shadow-2xs">
            <div className="flex items-center gap-2 pr-2 border-r border-[#e9dfc8]">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></div>
              <div className="text-xs">
                <div className="font-bold text-[#2f4026] flex items-center gap-1.5">
                  <span>{t('Room')}:</span>
                  <span className="font-numeric bg-[#eef3e3] px-1.5 py-0.5 rounded text-[#4e6b3e]">
                    {syncCode}
                  </span>
                </div>
                <div className="text-[10px] text-[#7b8370]">
                  {lastSyncTime
                    ? `${t('Synced')} ${Math.round((Date.now() - lastSyncTime) / 1000)}s ${t('ago')}`
                    : t('Sync active')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySyncLink}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4e6b3e] bg-[#eef3e3] hover:bg-[#d4dfc6] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title={t('Copy mobile shopping link')}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? t('Copied!') : t('Copy Link')}</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4e6b3e] bg-[#eef3e3] hover:bg-[#d4dfc6] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title={t('Open QR Code to scan on mobile')}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t('QR Code')}</span>
              </button>

              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#3e5531] hover:text-[#2f4026] px-2 py-1.5 cursor-pointer"
                title={t('Force refresh sync')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Live Shopping Basket Financial HUD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-[#e9dfc8] rounded-xl p-4 space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold text-[#67795a] uppercase">
              {t('Basket Total')}
            </span>
            <div className="text-xl font-bold text-[#2f4026] font-numeric tabular-nums">
              {formatPrice(totalCostZar, currency)}
            </div>
            <span className="text-[11px] text-[#7b8370]">
              {totalCount} {t('items planned')}
            </span>
          </div>

          <div className="bg-white border border-[#e9dfc8] rounded-xl p-4 space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold text-[#67795a] uppercase">
              {t('In Cart (Scanned)')}
            </span>
            <div className="text-xl font-bold text-[#4e6b3e] font-numeric tabular-nums">
              {formatPrice(spentSoFarZar, currency)}
            </div>
            <span className="text-[11px] text-[#7b8370]">
              {checkedCount} {t('of')} {totalCount} {t('items bought')}
            </span>
          </div>

          <div className="bg-white border border-[#e9dfc8] rounded-xl p-4 space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold text-[#67795a] uppercase">
              {t('Remaining to Buy')}
            </span>
            <div className="text-xl font-bold text-[#2f4026] font-numeric tabular-nums">
              {formatPrice(remainingCostZar, currency)}
            </div>
            <span className="text-[11px] text-[#7b8370]">
              {totalCount - checkedCount} {t('items left')}
            </span>
          </div>

          <div className="bg-white border border-[#e9dfc8] rounded-xl p-4 space-y-1 shadow-2xs">
            <span className="text-[11px] font-semibold text-[#67795a] uppercase">
              {t('Budget Status')}
            </span>
            <div
              className={`text-xl font-bold font-numeric tabular-nums ${
                isOverBudget ? 'text-rose-700' : 'text-[#4e6b3e]'
              }`}
            >
              {formatPrice(remainingBudgetZar, currency)}
            </div>
            <span className="text-[11px] text-[#7b8370]">
              {isOverBudget ? `⚠️ ${t('Exceeds budget')}` : `✓ ${t('Safe cushion')}`}
            </span>
          </div>
        </div>

        {/* Grocery Store Aisle View Toolbar */}
        <div className="bg-white border border-[#e9dfc8] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f2e9d6]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#eef3e3] flex items-center justify-center text-[#4e6b3e]">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2f4026]">
                  {t('Supermarket Aisle Navigation')}
                </h3>
                <span className="text-xs text-[#5a6b4f]">
                  {t('Tap items as you put them in your trolley or basket')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGroupByAisle(!groupByAisle)}
                className="px-3 py-1.5 text-xs font-semibold text-[#4e6b3e] bg-[#eef3e3] hover:bg-[#d4dfc6] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{groupByAisle ? t('Grouped by Aisle') : t('Flat List')}</span>
              </button>

              {checkedCount > 0 && (
                <button
                  onClick={onClearChecked}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('Clear Checked')} ({checkedCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick-Add Grocery Item Form */}
          <form
            onSubmit={handleQuickAdd}
            className="flex flex-wrap items-center gap-2.5 p-3.5 bg-[#fdfaf3] border border-[#e9dfc8] rounded-xl"
          >
            <span className="text-xs font-bold text-[#4e6b3e] uppercase tracking-wide shrink-0">
              + {t('Add Item')}:
            </span>
            <input
              type="text"
              placeholder={t('e.g. Rolled oats, Bananas, Spinach...')}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 min-w-[180px] text-xs font-medium bg-white border border-[#ddd3ba] rounded-lg px-3 py-2 text-[#2f4026] focus:outline-none focus:ring-1 focus:ring-[#3e5531]"
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="text-xs font-medium bg-white border border-[#ddd3ba] rounded-lg px-3 py-2 text-[#2f4026] cursor-pointer focus:outline-none"
            >
              <option value="Produce">🥦 {t('Fresh Produce')}</option>
              <option value="Proteins">🥩 / 🫘 {t('Proteins & Pulses')}</option>
              <option value="Staples">🌾 {t('Grains & Staples')}</option>
              <option value="Dairy">🥚 {t('Dairy & Eggs')}</option>
              <option value="Pantry">🧂 {t('Seasoning & Oil')}</option>
            </select>
            <div className="flex items-center bg-white border border-[#ddd3ba] rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-[#6e8060] mr-1">R</span>
              <input
                type="number"
                min="1"
                step="0.5"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-16 text-xs font-bold text-[#2f4026] font-numeric focus:outline-none"
                placeholder={t('Price')}
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#4e6b3e] hover:bg-[#3e5531] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {t('Add to List')}
            </button>
          </form>

          {/* Empty state */}
          {items.length === 0 && (
            <div className="text-center py-12 space-y-3 bg-[#fdfaf3] rounded-xl border border-dashed border-[#e9dfc8]">
              <div className="w-12 h-12 rounded-full bg-[#eef3e3] flex items-center justify-center mx-auto text-[#4e6b3e]">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#2f4026]">
                {t('Your shopping basket is empty')}
              </h4>
              <p className="text-xs text-[#5a6b4f] max-w-sm mx-auto">
                {t('Add budget-friendly staples from the Ingredient Shelf above or select a nutritious recipe to add all ingredients in one click.')}
              </p>
            </div>
          )}

          {/* Items List (Grouped or Flat) */}
          {groupByAisle ? (
            <div className="space-y-6">
              {categories.map((cat) => {
                const categoryItems = items.filter((i) => (i.category || 'General') === cat);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#3e5531] border-b border-[#f2e9d6] pb-1.5 uppercase tracking-wide">
                      <span>{cat}</span>
                      <span className="text-[11px] font-numeric tabular-nums text-[#4e6b3e]">
                        {categoryItems.filter((i) => i.checked).length} / {categoryItems.length} in cart
                      </span>
                    </div>

                    <div className="space-y-2">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                            item.checked
                              ? 'bg-[#fdfaf3] border-[#d4dfc6] opacity-75'
                              : 'bg-white hover:bg-[#fdfaf3] border-[#ddd3ba]'
                          }`}
                        >
                          <div
                            onClick={() => onToggleItem(item.id)}
                            className="flex items-center gap-3.5 flex-1 cursor-pointer select-none"
                          >
                            <button
                              type="button"
                              className="text-[#4e6b3e] shrink-0"
                              aria-label={item.checked ? t('Mark unbought') : t('Mark bought')}
                            >
                              {item.checked ? (
                                <CheckCircle2 className="w-5 h-5 text-[#4e6b3e] fill-[#eef3e3]" />
                              ) : (
                                <Circle className="w-5 h-5 text-[#627f50]" />
                              )}
                            </button>

                            <div className="space-y-0.5">
                              <span
                                className={`text-sm font-medium ${
                                  item.checked
                                    ? 'line-through text-[#627f50]'
                                    : 'text-[#2f4026] font-semibold'
                                }`}
                              >
                                {t(item.name)}
                              </span>
                              {item.note && (
                                <div className="text-[11px] text-[#4e6b3e]">
                                  {t(item.note)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Controls & Price */}
                          <div className="flex items-center gap-3">
                            {/* Quantity Adjuster */}
                            <div className="flex items-center bg-[#f7eedd] rounded-lg p-0.5">
                              <button
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[#3e5531] hover:bg-white rounded transition-colors"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-bold font-numeric tabular-nums text-[#2f4026]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[#3e5531] hover:bg-white rounded transition-colors"
                              >
                                +
                              </button>
                            </div>

                            {/* Total Line Price */}
                            <div className="w-20 text-right font-numeric font-bold text-xs sm:text-sm text-[#2f4026] tabular-nums">
                              {formatPrice(item.priceZar * item.quantity, currency)}
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1.5 text-[#627f50] hover:text-rose-600 transition-colors cursor-pointer"
                              title={t('Remove item')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    item.checked
                      ? 'bg-[#fdfaf3] border-[#d4dfc6] opacity-75'
                      : 'bg-white hover:bg-[#fdfaf3] border-[#ddd3ba]'
                  }`}
                >
                  <div
                    onClick={() => onToggleItem(item.id)}
                    className="flex items-center gap-3.5 flex-1 cursor-pointer select-none"
                  >
                    <button
                      type="button"
                      className="text-[#4e6b3e] shrink-0"
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-5 h-5 text-[#4e6b3e] fill-[#eef3e3]" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#627f50]" />
                      )}
                    </button>

                    <div>
                      <span
                        className={`text-sm font-medium ${
                          item.checked
                            ? 'line-through text-[#627f50]'
                            : 'text-[#2f4026] font-semibold'
                        }`}
                      >
                        {t(item.name)}
                      </span>
                      <span className="ml-2 text-[11px] text-[#627f50]">
                        ({t(item.category)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-numeric font-bold text-xs sm:text-sm text-[#2f4026] tabular-nums">
                      {formatPrice(item.priceZar * item.quantity, currency)}
                    </span>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 text-[#627f50] hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code and Sync Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-xl border border-[#e9dfc8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2e9d6]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#4e6b3e]" />
                <h3 className="font-bold text-[#2f4026] text-sm">
                  {t('Sync List to Mobile')}
                </h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-[#627f50] hover:text-[#2f4026] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-xs text-[#4e6b3e]">
                {t('Scan with your phone’s camera to access and check off this shopping list live in the supermarket:')}
              </p>

              {/* A real QR code of the join link (generated locally, nothing is sent anywhere). */}
              <div className="p-3 bg-white border-2 border-[#2f4026] rounded-xl mx-auto w-52 h-52 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`${t('QR code to join list')} ${syncCode}`}
                    className="w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-xs text-[#7b8370]">{t('Creating QR code…')}</span>
                )}
              </div>

              {isLocalOnly && (
                <p className="text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-left">
                  {t('This page is open at "localhost", which only works on this computer, so a phone cannot open this QR code. Open Back To Eden through its public address to share the list. On your phone you can also type the code below into Join different room.')}
                </p>
              )}

              <div className="space-y-1.5">
                <span className="text-xs text-[#5a6b4f]">{t('Sync Room Code')}:</span>
                <div className="text-lg font-numeric font-bold tracking-widest text-[#4e6b3e] bg-[#eef3e3] p-2 rounded-lg">
                  {syncCode}
                </div>
              </div>

              {/* Switch / Custom Code Option */}
              {isEditingCode ? (
                <form onSubmit={handleSaveCustomCode} className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder={t('ENTER CODE')}
                    className="flex-1 text-xs font-numeric font-bold bg-[#f7eedd] border border-[#ddd3ba] rounded-lg px-2.5 py-1.5 text-center"
                    maxLength={24}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#4e6b3e] rounded-lg"
                  >
                    {t('Switch')}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsEditingCode(true)}
                  className="text-xs text-[#4e6b3e] hover:underline"
                >
                  {t('Join different room or set custom code')}
                </button>
              )}

              <button
                onClick={handleCopySyncLink}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#4e6b3e] hover:bg-[#3e5531] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? t('Link Copied to Clipboard!') : t('Copy Direct Mobile Link')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
