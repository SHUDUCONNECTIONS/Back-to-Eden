import React, { useState } from 'react';
import {
  FoodCategory,
  FoodItem,
  CurrencyCode,
  HealthFocus,
  WeightGoal,
  BloodType,
} from '../types';
import { FOOD_DATABASE } from '../data/foodDatabase';
import { formatPrice } from '../utils/currency';
import { useT } from '../i18n/useTranslation';
import { Plus, Check, ChevronDown, ChevronUp, Filter, Leaf, HeartPulse, CookingPot } from 'lucide-react';
import { PriceNote } from './PriceNote';

/** Condition filters, with the reason the tagged foods help. */
const HEALTH_FOCUS_OPTIONS: {
  id: HealthFocus;
  label: string;
  rationale: string;
}[] = [
  {
    id: 'blood-pressure',
    label: 'High blood pressure',
    rationale:
      'Potassium, magnesium and nitrate-rich foods that support healthy blood pressure, and seasoning that lets you cook with less salt.',
  },
  {
    id: 'diabetes',
    label: 'Diabetes',
    rationale:
      'Low-glycaemic staples and proteins that release energy slowly instead of spiking blood sugar.',
  },
  {
    id: 'inflammation',
    label: 'Inflammation',
    rationale:
      'Omega-3 fats, polyphenols and carotenoids — the compounds most consistently linked to lower inflammation.',
  },
  {
    id: 'gut-health',
    label: 'Gut issues',
    rationale:
      'Prebiotic and soluble fibre that feeds good gut bacteria and keeps digestion regular.',
  },
];

/** Weight goal filters. */
const WEIGHT_GOAL_OPTIONS: {
  id: WeightGoal;
  label: string;
  rationale: string;
}[] = [
  {
    id: 'weight-gain',
    label: 'Weight gain',
    rationale:
      'Energy-dense staples, fats and protein that make it easy to add calories without eating huge volumes.',
  },
  {
    id: 'weight-loss',
    label: 'Weight loss',
    rationale:
      'High fibre and protein for the fewest calories — foods that fill you up rather than fill you out.',
  },
];

/** Blood type filters. See the note rendered beneath them on the evidence for this. */
const BLOOD_TYPE_OPTIONS: { id: BloodType; label: string }[] = [
  { id: 'O', label: 'Type O' },
  { id: 'A', label: 'Type A' },
  { id: 'B', label: 'Type B' },
  { id: 'AB', label: 'Type AB' },
];

/** A labelled row of single-select chips. Clicking the active chip clears it. */
const FilterGroup: React.FC<{
  legend: string;
  columns: string;
  options: { id: string; label: string; count: number }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  t: (source: string) => string;
}> = ({ legend, columns, options, selected, onSelect, t }) => (
  <fieldset>
    <legend className="text-[11px] font-bold uppercase tracking-wider text-[#7b8370] pb-2">
      {legend}
    </legend>
    <div className={`grid ${columns} gap-2.5`}>
      {options.map((option) => {
        const isActive = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(isActive ? null : option.id)}
            aria-pressed={isActive}
            className={`px-3 py-3 rounded-xl text-xs font-semibold text-center transition-colors cursor-pointer border ${
              isActive
                ? 'bg-[#4e6b3e] border-[#4e6b3e] text-white'
                : 'bg-[#fdfaf3] border-[#ece2cc] text-[#2f4026] hover:bg-[#eef3e3] hover:border-[#d4dfc6]'
            }`}
          >
            <span className="block leading-snug">{t(option.label)}</span>
            <span
              className={`block text-[10px] font-medium mt-0.5 ${
                isActive ? 'text-white/70' : 'text-[#7b8370]'
              }`}
            >
              {option.count} {t('foods')}
            </span>
          </button>
        );
      })}
    </div>
  </fieldset>
);

interface IngredientShelfProps {
  currency: CurrencyCode;
  onAddToShoppingList: (food: FoodItem) => void;
  savedItemIds: Set<string>;
  currentBudgetZar: number;
}

export const IngredientShelf: React.FC<IngredientShelfProps> = ({
  currency,
  onAddToShoppingList,
  savedItemIds,
  currentBudgetZar,
}) => {
  const t = useT();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTipId, setExpandedTipId] = useState<string | null>('dried-beans');
  const [expandedPrepId, setExpandedPrepId] = useState<string | null>(null);
  const [nutrientFocus, setNutrientFocus] = useState<string>('all');
  const [healthFocus, setHealthFocus] = useState<HealthFocus | null>(null);
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);
  const [bloodType, setBloodType] = useState<BloodType | null>(null);

  const activeHealthOption = HEALTH_FOCUS_OPTIONS.find((o) => o.id === healthFocus) || null;
  const activeWeightOption = WEIGHT_GOAL_OPTIONS.find((o) => o.id === weightGoal) || null;
  const hasPersonalFilter = Boolean(healthFocus || weightGoal || bloodType);

  const clearPersonalFilters = () => {
    setHealthFocus(null);
    setWeightGoal(null);
    setBloodType(null);
  };

  // Filter foods
  const filteredFoods = FOOD_DATABASE.filter((food) => {
    if (selectedCategory !== 'all' && food.category !== selectedCategory) {
      return false;
    }
    if (healthFocus && !food.healthFocus.includes(healthFocus)) {
      return false;
    }
    if (weightGoal && !food.weightGoal.includes(weightGoal)) {
      return false;
    }
    if (bloodType && !food.bloodTypes.includes(bloodType)) {
      return false;
    }
    if (nutrientFocus === 'high-protein' && !food.nutritionHighlights.some((h) => h.toLowerCase().includes('protein'))) {
      return false;
    }
    if (nutrientFocus === 'high-fiber' && !food.nutritionHighlights.some((h) => h.toLowerCase().includes('fiber'))) {
      return false;
    }
    if (nutrientFocus === 'iron' && !food.nutritionHighlights.some((h) => h.toLowerCase().includes('iron'))) {
      return false;
    }
    return true;
  });

  // Render real food photography or stylized visual representation
  const renderFoodGraphic = (food: FoodItem) => {
    if (food.imageUrl) {
      return (
        <div className="w-full h-44 bg-[#e9efe0] relative overflow-hidden rounded-t-xl group">
          <img
            src={food.imageUrl}
            alt={t(food.name)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Hide broken image and fallback to neutral container
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white drop-shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded text-white/90">
              {t(food.categoryLabel)}
            </span>
          </div>
        </div>
      );
    }

    switch (food.id) {
      case 'dried-beans':
        return (
          <div className="w-full h-44 bg-[#e9efe0] flex items-center justify-center relative overflow-hidden rounded-t-xl">
            <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
              <ellipse cx="50" cy="55" rx="36" ry="24" fill="#ddd3ba" />
              <ellipse cx="38" cy="48" rx="8" ry="5" fill="#8f6345" transform="rotate(-15 38 48)" />
              <ellipse cx="60" cy="46" rx="9" ry="6" fill="#7a4e32" transform="rotate(20 60 46)" />
              <ellipse cx="48" cy="62" rx="8" ry="5.5" fill="#9e7052" transform="rotate(-5 48 62)" />
              <ellipse cx="30" cy="58" rx="7" ry="5" fill="#805439" transform="rotate(25 30 58)" />
              <ellipse cx="68" cy="58" rx="7.5" ry="5" fill="#8a5b3f" transform="rotate(-30 68 58)" />
            </svg>
          </div>
        );
      case 'maize-meal':
        return (
          <div className="w-full h-44 bg-[#e9efe0] flex items-center justify-center relative overflow-hidden rounded-t-xl">
            <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
              <polygon points="50,28 78,42 66,72 26,62 34,35" fill="#d9b87a" />
              <polygon points="50,28 78,42 66,72 50,55" fill="#c4a362" opacity="0.6" />
              <polygon points="26,62 66,72 56,80 18,70" fill="#a88849" />
              <circle cx="52" cy="48" r="1.5" fill="#8a6d32" />
              <circle cx="44" cy="54" r="1.2" fill="#8a6d32" />
            </svg>
          </div>
        );
      case 'seasonal-greens':
        return (
          <div className="w-full h-44 bg-[#e9efe0] flex items-center justify-center relative overflow-hidden rounded-t-xl">
            <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
              <ellipse cx="36" cy="58" rx="14" ry="24" fill="#4e6b3e" transform="rotate(-15 36 58)" />
              <ellipse cx="50" cy="52" rx="16" ry="26" fill="#4e6b3e" />
              <ellipse cx="65" cy="56" rx="14" ry="24" fill="#3e5531" transform="rotate(15 65 56)" />
              <path d="M50 78 V38" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <path d="M36 78 V44" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <path d="M65 78 V44" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-full h-44 bg-[#e9efe0] flex flex-col items-center justify-center text-[#3e5531] space-y-2 rounded-t-xl">
            <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-[#4e6b3e]" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#4e6b3e]">
              {t(food.category)}
            </span>
          </div>
        );
    }
  };

  return (
    <section id="shelf" className="py-10 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header from image_30263df0.png */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-bold tracking-wider uppercase text-[#5f7250]">
              {t('The Ingredient Shelf')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2f4026]">
              {t('Familiar foods, practical ideas.')}
            </h2>
            <p className="text-sm text-[#4e6b3e] max-w-xl">
              {t('Wholesome ingredients that offer the highest nutritional return per currency unit.')}
            </p>
            <PriceNote currency={currency} />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#e9dfc8] px-3 py-1.5 rounded-lg text-xs font-medium text-[#2f4026]">
              <Filter className="w-3.5 h-3.5 text-[#4e6b3e]" />
              <label htmlFor="category-select" className="sr-only">{t('Filter by category')}</label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-semibold"
              >
                <option value="all">{t('All Foods')}</option>
                <option value="protein">{t('Proteins')}</option>
                <option value="staple">{t('Staples')}</option>
                <option value="vegetable">{t('Vegetables')}</option>
                <option value="healthy-fat">{t('Healthy Fats')}</option>
                <option value="pantry">{t('Seasonings')}</option>
              </select>
            </div>

            {/* Nutrient Highlight Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#e9dfc8] px-3 py-1.5 rounded-lg text-xs font-medium text-[#2f4026]">
              <Leaf className="w-3.5 h-3.5 text-[#4e6b3e]" />
              <label htmlFor="nutrient-select" className="sr-only">{t('Nutrient focus')}</label>
              <select
                id="nutrient-select"
                value={nutrientFocus}
                onChange={(e) => setNutrientFocus(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-semibold"
              >
                <option value="all">{t('Nutrient Focus: Any')}</option>
                <option value="high-protein">{t('High Protein')}</option>
                <option value="high-fiber">{t('High Fiber')}</option>
                <option value="iron">{t('Iron & Blood Health')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Personalised shelf filters */}
        <div className="bg-white border border-[#e9dfc8] rounded-xl p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-[#4e6b3e]" />
              <h3 className="text-sm font-bold text-[#2f4026]">{t('Personalise your shelf')}</h3>
            </div>
            {hasPersonalFilter && (
              <button
                onClick={clearPersonalFilters}
                className="text-[11px] font-semibold text-[#5a6b4f] hover:text-[#2f4026] underline cursor-pointer"
              >
                {t('Clear all')}
              </button>
            )}
          </div>

          <FilterGroup
            legend={t('Health concern')}
            t={t}
            columns="grid-cols-2 lg:grid-cols-4"
            options={HEALTH_FOCUS_OPTIONS.map((o) => ({
              id: o.id,
              label: o.label,
              count: FOOD_DATABASE.filter((f) => f.healthFocus.includes(o.id)).length,
            }))}
            selected={healthFocus}
            onSelect={(id) => setHealthFocus(id as HealthFocus | null)}
          />

          <FilterGroup
            legend={t('Weight goal')}
            t={t}
            columns="grid-cols-2"
            options={WEIGHT_GOAL_OPTIONS.map((o) => ({
              id: o.id,
              label: o.label,
              count: FOOD_DATABASE.filter((f) => f.weightGoal.includes(o.id)).length,
            }))}
            selected={weightGoal}
            onSelect={(id) => setWeightGoal(id as WeightGoal | null)}
          />

          <FilterGroup
            legend={t('Blood type')}
            t={t}
            columns="grid-cols-4"
            options={BLOOD_TYPE_OPTIONS.map((o) => ({
              id: o.id,
              label: o.label,
              count: FOOD_DATABASE.filter((f) => f.bloodTypes.includes(o.id)).length,
            }))}
            selected={bloodType}
            onSelect={(id) => setBloodType(id as BloodType | null)}
          />

          {(activeHealthOption || activeWeightOption) && (
            <div className="space-y-2">
              {activeHealthOption && (
                <p className="text-xs text-[#4e6b3e] leading-relaxed bg-[#eef3e3] border border-[#d4dfc6] rounded-lg p-3">
                  <span className="font-semibold text-[#2f4026]">
                    {t(activeHealthOption.label)}:{' '}
                  </span>
                  {t(activeHealthOption.rationale)}
                </p>
              )}
              {activeWeightOption && (
                <p className="text-xs text-[#4e6b3e] leading-relaxed bg-[#eef3e3] border border-[#d4dfc6] rounded-lg p-3">
                  <span className="font-semibold text-[#2f4026]">
                    {t(activeWeightOption.label)}:{' '}
                  </span>
                  {t(activeWeightOption.rationale)}
                </p>
              )}
            </div>
          )}

          {bloodType && (
            <p className="text-xs text-[#5a6b4f] leading-relaxed bg-[#f2e9d6] border border-[#e9dfc8] rounded-lg p-3">
              <span className="font-semibold text-[#2f4026]">{t('About blood type eating:')} </span>
              {t('These groupings follow the popular blood type diet. Controlled studies have not found that blood group changes how your body responds to a diet, so treat this as a preference filter rather than a medical one — the health concern and weight goal filters rest on firmer evidence.')}
            </p>
          )}

          <p className="text-[10px] text-[#7b8370] leading-relaxed">
            {t('General nutrition guidance only — not medical advice. Check with a clinician before changing your diet, especially if you take medication.')}
          </p>
        </div>

        {/* 3-Column Shelf Grid inspired by image_30263df0.png */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFoods.map((food) => {
            const isSaved = savedItemIds.has(food.id);
            const isTipExpanded = expandedTipId === food.id;
            const isPrepExpanded = expandedPrepId === food.id;

            return (
              <div
                key={food.id}
                className="bg-white border border-[#ddd3ba] rounded-xl flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-xs transition-shadow"
              >
                {/* Visual Top Food Photography */}
                {renderFoodGraphic(food)}

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Category & Title */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold tracking-wider uppercase text-[#4e6b3e]">
                      {t(food.categoryLabel)}
                    </div>
                    <h3 className="text-lg font-bold text-[#2f4026] leading-snug">
                      {t(food.name)}
                    </h3>
                    <p className="text-xs text-[#5a6b4f] leading-relaxed">
                      {t(food.subDescription)}
                    </p>
                  </div>

                  {/* Pricing and Pack Size */}
                  <div className="pt-2 border-t border-[#f7eedd] flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-[#2f4026] font-numeric tabular-nums">
                        {formatPrice(food.unitCostZar, currency)}
                      </div>
                      <div className="text-[11px] text-[#7b8370]">
                        {t(food.packSize)}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#4e6b3e] bg-[#eef3e3] px-2 py-0.5 rounded">
                      {t(food.badge)}
                    </span>
                  </div>

                  {/* Nutrition micro-metrics */}
                  <div className="bg-[#fdfaf3] p-2.5 rounded-lg text-[11px] text-[#3e5531] flex items-center justify-between">
                    <span>{t('Protein')}: <strong>{t(food.keyNutrients.protein)}</strong></span>
                    <span>{t('Fiber')}: <strong>{t(food.keyNutrients.fiber)}</strong></span>
                    <span><strong>{t(food.keyNutrients.micronutrient)}</strong></span>
                  </div>

                  {/* Action row matching screenshot: "+ Save food idea" / "Added" */}
                  <div className="pt-1">
                    <button
                      onClick={() => onAddToShoppingList(food)}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSaved
                          ? 'bg-[#4e6b3e] text-white hover:bg-[#3e5531]'
                          : 'bg-[#eef3e3] hover:bg-[#e9efe0] text-[#4e6b3e] border border-[#d4dfc6]'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('In Grocery List')}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('Save food idea')} +</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Collapsible simple preparation: what to buy with it, and how to cook it */}
                  <div className="pt-2 border-t border-[#f7eedd]">
                    <button
                      onClick={() => setExpandedPrepId(isPrepExpanded ? null : food.id)}
                      aria-expanded={isPrepExpanded}
                      className="w-full flex items-center justify-between text-xs font-medium text-[#3e5531] hover:text-[#2f4026] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <CookingPot className="w-3.5 h-3.5 text-[#627f50]" />
                        <span>{t('Ingredients & directions')}</span>
                      </span>
                      {isPrepExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#627f50]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#627f50]" />
                      )}
                    </button>

                    {isPrepExpanded && (
                      <div className="mt-2 bg-[#fdfaf3] p-3 rounded-lg border border-[#e9efe0] space-y-3">
                        <div>
                          <p className="text-xs font-bold text-[#2f4026] leading-snug">
                            {t(food.simplePrep.title)}
                          </p>
                          <p className="text-[11px] text-[#7b8370] mt-0.5">
                            {t('Serves')} {food.simplePrep.servings} · {t(food.simplePrep.time)}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7b8370]">
                            {t('Ingredients')}
                          </h4>
                          <ul className="space-y-1">
                            {food.simplePrep.ingredients.map((ingredient) => (
                              <li
                                key={ingredient}
                                className="flex gap-1.5 text-[11px] text-[#3e5531] leading-relaxed"
                              >
                                <span className="text-[#9bab8c]" aria-hidden="true">
                                  •
                                </span>
                                <span>{t(ingredient)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7b8370]">
                            {t('Directions')}
                          </h4>
                          <ol className="space-y-1.5">
                            {food.simplePrep.directions.map((step, idx) => (
                              <li
                                key={step}
                                className="flex gap-2 text-[11px] text-[#3e5531] leading-relaxed"
                              >
                                <span className="shrink-0 mt-px w-4 h-4 rounded-full bg-[#eef3e3] border border-[#d4dfc6] text-[9px] font-bold text-[#4e6b3e] flex items-center justify-center font-numeric tabular-nums">
                                  {idx + 1}
                                </span>
                                <span>{t(step)}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Practical tip matching screenshot: "▶ Practical tip" */}
                  <div className="pt-2 border-t border-[#f7eedd]">
                    <button
                      onClick={() => setExpandedTipId(isTipExpanded ? null : food.id)}
                      aria-expanded={isTipExpanded}
                      className="w-full flex items-center justify-between text-xs font-medium text-[#3e5531] hover:text-[#2f4026] cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-[10px]">▶</span>
                        <span>{t('Practical tip')}</span>
                      </span>
                      {isTipExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#627f50]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#627f50]" />
                      )}
                    </button>

                    {isTipExpanded && (
                      <div className="mt-2 text-xs text-[#3e5531] bg-[#fdfaf3] p-3 rounded-lg border border-[#e9efe0] leading-relaxed">
                        <p>{t(food.practicalTip)}</p>
                        <p className="mt-1.5 text-[11px] text-[#4e6b3e] italic">
                          {t('Storage')}: {t(food.storageAdvice)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredFoods.length === 0 && (
          <div className="text-center py-12 px-4 bg-white border border-dashed border-[#e9dfc8] rounded-xl space-y-2">
            <Leaf className="w-6 h-6 text-[#627f50] mx-auto" />
            <p className="text-sm font-semibold text-[#2f4026]">
              {t('No foods match this combination.')}
            </p>
            <p className="text-xs text-[#5a6b4f] max-w-sm mx-auto">
              {t('Nothing matches every filter at once. Try relaxing one of them')}
              {hasPersonalFilter
                ? ` — currently ${[
                    activeHealthOption ? t(activeHealthOption.label) : null,
                    activeWeightOption ? t(activeWeightOption.label) : null,
                    bloodType ? `${t('Blood type')} ${bloodType}` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}`
                : ''}
              .
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setNutrientFocus('all');
                clearPersonalFilters();
              }}
              className="mt-1 text-xs font-semibold text-[#4e6b3e] hover:text-[#2f4026] underline cursor-pointer"
            >
              {t('Reset all filters')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
