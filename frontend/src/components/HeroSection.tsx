import React from 'react';
import { ArrowDown, Wallet, SlidersHorizontal, ChefHat, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { useT } from '../i18n/useTranslation';

interface HeroSectionProps {
  onStartPlanning: () => void;
  onExploreShelf: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartPlanning,
  onExploreShelf,
}) => {
  const t = useT();

  return (
    <section id="hero" className="py-12 md:py-16 px-4 sm:px-8 border-b border-[#ece2cc] bg-[#f7eedd]">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Main Hero Header directly inspired by image_3f78044f.png with real food showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#4e6b3e] uppercase">
              <span className="w-6 h-px bg-[#4e6b3e]"></span>
              <span>{t('Everyday Wellness')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#2f4026] leading-[1.12]">
              {t('Healthy living,')}{' '}
              <span className="font-editorial italic font-normal text-[#4e6b3e]">
                {t('grounded in real life.')}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#3e5531] leading-relaxed max-w-2xl">
              {t('Build your understanding of nutrition, explore familiar local foods, and find small steps that work for you and your household without overspending.')}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onStartPlanning}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#4e6b3e] hover:bg-[#3e5531] rounded-xl transition-all shadow-xs cursor-pointer group"
              >
                <span>{t('Set Weekly Budget')}</span>
                <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              </button>

              <button
                onClick={onExploreShelf}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#4e6b3e] bg-[#e9efe0] hover:bg-[#e9efe0] border border-[#d4dfc6] rounded-xl transition-all cursor-pointer group"
              >
                <span>{t('Explore Ingredients')}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Real Food Hero Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#e9dfc8] rounded-2xl p-3 shadow-xs relative overflow-hidden group">
              <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden relative">
                <img
                  src="/images/food_maize_pap_1793344254610.jpg"
                  alt={t('Freshly prepared warm pap with butter and seasonings')}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      {t('Nutrient-Dense Staples')}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {t('Steamed Pap & Whole Legumes')}
                    </h3>
                  </div>
                  <span className="text-xs font-numeric font-bold bg-white/20 backdrop-blur-xs px-2 py-1 rounded">
                    ~R7.50 / {t('meal')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Step App Workflow Banner directly inspired by image_754dddad.png */}
        <div className="bg-white/80 border border-[#ddd3ba] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f2e9d6] pb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#4e6b3e]">
              {t('How the app works')}
            </h2>
            <p className="text-xs text-[#627f50]">
              {t('4 interconnected steps to healthy eating on a budget')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="bg-[#eef3e3] border border-[#d4dfc6] rounded-xl p-5 flex flex-col justify-between space-y-3">
              <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center text-[#4e6b3e] shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#4e6b3e]">1. {t('Enter food budget')}</span>
                <p className="text-xs text-[#4e6b3e] leading-relaxed">
                  {t('Enter how much money you have available for food this week or month.')}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#eef3e3] border border-[#d4dfc6] rounded-xl p-5 flex flex-col justify-between space-y-3">
              <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center text-[#4e6b3e] shadow-2xs">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#4e6b3e]">2. {t('Filter affordable foods')}</span>
                <p className="text-xs text-[#4e6b3e] leading-relaxed">
                  {t('The app identifies nutritious options and combinations that fit within the budget.')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#eef3e3] border border-[#d4dfc6] rounded-xl p-5 flex flex-col justify-between space-y-3">
              <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center text-[#4e6b3e] shadow-2xs">
                <ChefHat className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#4e6b3e]">3. {t('Discover recipes')}</span>
                <p className="text-xs text-[#4e6b3e] leading-relaxed">
                  {t('Each recommendation shows ingredients, quantities, preparation steps, and costs.')}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#eef3e3] border border-[#d4dfc6] rounded-xl p-5 flex flex-col justify-between space-y-3">
              <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center text-[#4e6b3e] shadow-2xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#4e6b3e]">4. {t('Plan meals & shopping')}</span>
                <p className="text-xs text-[#4e6b3e] leading-relaxed">
                  {t('See what to buy, track live cart totals, and sync list with your mobile phone.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
