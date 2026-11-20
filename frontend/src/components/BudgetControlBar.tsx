import React from 'react';
import { CurrencyCode } from '../types';
import { formatPrice } from '../utils/currency';
import { Users, TrendingUp, AlertCircle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n/useTranslation';
import { PriceNote } from './PriceNote';

interface BudgetControlBarProps {
  budgetZar: number;
  onBudgetChange: (val: number) => void;
  householdSize: number;
  onHouseholdSizeChange: (val: number) => void;
  currency: CurrencyCode;
  cartTotalZar: number;
  recipeAllocatedZar: number;
}

export const BudgetControlBar: React.FC<BudgetControlBarProps> = ({
  budgetZar,
  onBudgetChange,
  householdSize,
  onHouseholdSizeChange,
  currency,
  cartTotalZar,
  recipeAllocatedZar,
}) => {
  const t = useT();

  // Preset budget options inspired by screenshot "R400-R600"
  const presetsZar = [
    { label: t('Minimal'), val: 300 },
    { label: t('Balanced'), val: 500 },
    { label: t('Generous'), val: 750 },
    { label: t('Family Plan'), val: 1200 },
  ];

  const remainingCushionZar = budgetZar - cartTotalZar;
  const isOverBudget = remainingCushionZar < 0;
  const percentUsed = Math.min(100, Math.round((cartTotalZar / (budgetZar || 1)) * 100));

  // Calculated per-person metrics
  const budgetPerPersonZar = budgetZar / householdSize;
  const dailyPerPersonZar = budgetPerPersonZar / 7;

  return (
    <section id="budget" className="py-8 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Editorial Section Heading inspired by image_30263df0.png */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#4e6b3e] uppercase">
            <span className="w-5 h-px bg-[#4e6b3e]"></span>
            <span>{t('Affordable, Local Food Guidance')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2f4026]">
            {t('Start with what is available.')}
          </h2>
          <p className="text-sm text-[#4e6b3e] max-w-2xl leading-relaxed">
            {t('Explore familiar ingredients and simple planning ideas. Prices and availability change by location and season, so you can adjust your budget at any time.')}
          </p>
          <PriceNote currency={currency} />
        </div>

        {/* Planning Tool Card from screenshot */}
        <div className="bg-white border border-[#e9dfc8] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-[#f2e9d6]">
            {/* Title & Tag */}
            <div className="space-y-1.5 max-w-lg">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#4e6b3e]">
                {t('A Simple Planning Tool')}
              </span>
              <h3 className="text-xl font-bold text-[#2f4026]">
                {t('Make a plan that fits your week.')}
              </h3>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-block text-[11px] font-semibold text-[#4e6b3e] bg-[#eef3e3] border border-[#d4dfc6] px-2 py-0.5 rounded">
                  {t('Active Filter')}
                </span>
                <span className="text-xs text-[#627f50]">
                  {t('Ingredients & recipes adjust dynamically to this target.')}
                </span>
              </div>
            </div>

            {/* Budget Input & Presets */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#fdfaf3] p-4 rounded-xl border border-[#ddd3ba]">
              {/* Presets Dropdown */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#5a6b4f] uppercase tracking-wider">
                  {t('Preset Budget')}
                </label>
                <select
                  value={
                    presetsZar.some((p) => p.val === budgetZar)
                      ? budgetZar
                      : 'custom'
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== 'custom') {
                      onBudgetChange(Number(v));
                    }
                  }}
                  className="w-full sm:w-auto text-sm font-semibold text-[#2f4026] bg-white border border-[#ddd3ba] rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3e5531]"
                >
                  {presetsZar.map((p) => (
                    <option key={p.val} value={p.val}>
                      {formatPrice(p.val, currency)} ({p.label})
                    </option>
                  ))}
                  <option value="custom">{t('Custom Amount')}</option>
                </select>
              </div>

              {/* Custom Number Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#5a6b4f] uppercase tracking-wider">
                  {t('Weekly Target')}
                </label>
                <div className="flex items-center bg-white border border-[#ddd3ba] rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-[#3e5531]">
                  <span className="text-xs font-semibold text-[#4e6b3e] mr-1">
                    {formatPrice(0, currency).replace(/[0-9.]/g, '')}
                  </span>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    value={Math.round(budgetZar)}
                    onChange={(e) => onBudgetChange(Math.max(10, Number(e.target.value)))}
                    className="w-24 text-sm font-bold text-[#2f4026] focus:outline-none font-numeric"
                  />
                </div>
              </div>

              {/* Household Size */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#5a6b4f] uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t('Household')}
                </label>
                <select
                  value={householdSize}
                  onChange={(e) => onHouseholdSizeChange(Number(e.target.value))}
                  className="text-sm font-semibold text-[#2f4026] bg-white border border-[#ddd3ba] rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3e5531]"
                >
                  <option value={1}>1 {t('person')}</option>
                  <option value={2}>2 {t('people')}</option>
                  <option value={3}>3 {t('people')}</option>
                  <option value={4}>{t('Family of 4')}</option>
                  <option value={6}>{t('Family of 6')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Banner guidance note directly from image_30263df0.png */}
          <div className="bg-[#f2f6ec] border border-[#d4dfc6] rounded-xl p-4 flex items-start gap-3">
            <div className="text-[#4e6b3e] mt-0.5 shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="text-xs text-[#2f4026] space-y-0.5">
              <span className="font-bold">{t('Plan variety around seasonal availability.')}</span>
              <p className="text-[#3e5531]">
                {t('Compare local pack sizes, plan around staples your household enjoys, and avoid buying perishable ingredients in excess.')}
              </p>
            </div>
          </div>

          {/* Live Financial Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="bg-[#fdfaf3] border border-[#e9dfc8] rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-[#4e6b3e] uppercase">
                {t('Total Budget')}
              </span>
              <div className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums">
                {formatPrice(budgetZar, currency)}
              </div>
              <span className="text-[11px] text-[#7b8370]">
                {t('7-day food limit')}
              </span>
            </div>

            <div className="bg-[#fdfaf3] border border-[#e9dfc8] rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-[#4e6b3e] uppercase">
                {t('Cart Total')}
              </span>
              <div className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums">
                {formatPrice(cartTotalZar, currency)}
              </div>
              <span className="text-[11px] text-[#7b8370]">
                {percentUsed}% {t('of budget used')}
              </span>
            </div>

            <div className="bg-[#fdfaf3] border border-[#e9dfc8] rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-[#4e6b3e] uppercase">
                {t('Remaining Cushion')}
              </span>
              <div
                className={`text-lg font-bold font-numeric tabular-nums ${
                  isOverBudget ? 'text-rose-700' : 'text-[#3e5531]'
                }`}
              >
                {formatPrice(remainingCushionZar, currency)}
              </div>
              <span className="text-[11px] text-[#7b8370] flex items-center gap-1">
                {isOverBudget ? (
                  <span className="text-rose-600 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> {t('Over budget')}
                  </span>
                ) : (
                  <span className="text-[#3e5531] flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> {t('Within limit')}
                  </span>
                )}
              </span>
            </div>

            <div className="bg-[#fdfaf3] border border-[#e9dfc8] rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-[#4e6b3e] uppercase">
                {t('Per Person / Day')}
              </span>
              <div className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums">
                {formatPrice(dailyPerPersonZar, currency)}
              </div>
              <span className="text-[11px] text-[#7b8370]">
                {t('for')} {householdSize} {householdSize === 1 ? t('person') : t('people')}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-[#5a6b4f]">
              <span>{t('Budget Allocation Progress')}</span>
              <span className="font-numeric tabular-nums">{percentUsed}% {t('spent')}</span>
            </div>
            <div className="h-2 w-full bg-[#e9dfc8] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isOverBudget
                    ? 'bg-rose-600'
                    : percentUsed > 85
                    ? 'bg-amber-600'
                    : 'bg-[#4e6b3e]'
                }`}
                style={{ width: `${Math.min(100, percentUsed)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
