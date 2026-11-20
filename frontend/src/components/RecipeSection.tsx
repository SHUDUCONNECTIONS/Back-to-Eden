import React, { useState } from 'react';
import { Recipe, RecipeIngredient, CurrencyCode } from '../types';
import { RECIPES_DATABASE } from '../data/recipes';
import { formatPrice } from '../utils/currency';
import { ChefHat, Clock, Users, PlusCircle, Check, ArrowRight, Utensils, BadgeCheck, Lightbulb, BookOpen } from 'lucide-react';
import { useT } from '../i18n/useTranslation';
import { PriceNote } from './PriceNote';

interface RecipeSectionProps {
  currency: CurrencyCode;
  onAddRecipeIngredientsToCart: (ingredients: RecipeIngredient[], recipeTitle: string) => void;
  currentBudgetZar: number;
}

export const RecipeSection: React.FC<RecipeSectionProps> = ({
  currency,
  onAddRecipeIngredientsToCart,
  currentBudgetZar,
}) => {
  const t = useT();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(RECIPES_DATABASE[0].id);
  const [activeTab, setActiveTab] = useState<'cost' | 'steps' | 'nutrition'>('cost');
  const [recentlyAddedRecipe, setRecentlyAddedRecipe] = useState<string | null>(null);

  const selectedRecipe =
    RECIPES_DATABASE.find((r) => r.id === selectedRecipeId) || RECIPES_DATABASE[0];

  const handleAddAll = (recipe: Recipe) => {
    onAddRecipeIngredientsToCart(recipe.ingredients, recipe.title);
    setRecentlyAddedRecipe(recipe.id);
    setTimeout(() => setRecentlyAddedRecipe(null), 2500);
  };

  return (
    <section id="recipes" className="py-12 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#5f7250] uppercase">
              <span className="w-5 h-px bg-[#5f7250]"></span>
              <span>{t('Step 3 · Discover Recipes')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2f4026]">
              {t('Nutritious meals with an estimated cost for every ingredient.')}
            </h2>
            <p className="text-sm text-[#4e6b3e] max-w-xl">
              {t('Cook healthy, balanced family dishes and see roughly what each ingredient costs before you shop.')}
            </p>
            <PriceNote currency={currency} />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#3e5531] bg-white border border-[#e9dfc8] px-3 py-2 rounded-lg">
            <BadgeCheck className="w-4 h-4 text-[#4e6b3e]" />
            <span>{t('All recipes estimated under')} {formatPrice(15, currency)} {t('per generous serving')}</span>
          </div>
        </div>

        {/* Recipe Cards Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {RECIPES_DATABASE.map((recipe) => {
            const isSelected = recipe.id === selectedRecipe.id;
            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipeId(recipe.id)}
                className={`rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? 'bg-[#4e6b3e] text-white border-[#4e6b3e] shadow-xs'
                    : 'bg-white hover:bg-[#f7eedd] text-[#2f4026] border-[#e9dfc8]'
                }`}
              >
                {recipe.imageUrl ? (
                  <div className="w-full h-24 overflow-hidden relative">
                    <img
                      src={recipe.imageUrl}
                      alt={t(recipe.title)}
                      className="w-full h-full object-cover object-center"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-1.5 left-2 text-[9px] font-bold uppercase tracking-wider text-white/95 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-2xs">
                      {t(recipe.difficulty)}
                    </span>
                  </div>
                ) : null}

                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    {!recipe.imageUrl && (
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSelected ? 'text-[#d4dfc6]' : 'text-[#4e6b3e]'
                        }`}
                      >
                        {t(recipe.difficulty)} · {recipe.prepTime.split(' ')[0]} {t('prep')}
                      </div>
                    )}
                    <div className="font-bold text-xs sm:text-sm line-clamp-2 mt-0.5 leading-snug">
                      {t(recipe.title)}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-current/15 flex items-center justify-between">
                    <span className="font-numeric text-xs font-bold tabular-nums">
                      {formatPrice(recipe.costPerServingZar, currency)}
                      <span className="text-[10px] font-normal opacity-80">/{t('portion')}</span>
                    </span>
                    <div className="text-[10px] opacity-75">{recipe.servings} {t('servings')}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Recipe Deep Dive Container */}
        <div className="bg-white border border-[#e9dfc8] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          {/* Recipe Hero Info & Real Dish Photography */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#f2e9d6]">
            {selectedRecipe.imageUrl && (
              <div className="lg:w-72 sm:w-80 w-full h-52 shrink-0 rounded-xl overflow-hidden shadow-xs border border-[#e9dfc8] relative group">
                <img
                  src={selectedRecipe.imageUrl}
                  alt={t(selectedRecipe.title)}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded text-white/95">
                    {t('Freshly Prepared Dish')}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {selectedRecipe.dietaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold text-[#4e6b3e] bg-[#eef3e3] px-2.5 py-0.5 rounded"
                  >
                    {t(tag)}
                  </span>
                ))}
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-[#2f4026] leading-tight">
                {t(selectedRecipe.title)}
              </h3>

              <p className="text-sm text-[#4e6b3e] leading-relaxed">
                {t(selectedRecipe.description)}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#4e6b3e] pt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4e6b3e]" />
                  <span>{t('Prep')}: {t(selectedRecipe.prepTime)}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#4e6b3e]" />
                  <span>{t('Cook')}: {t(selectedRecipe.cookTime)}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#4e6b3e]" />
                  <span>{t('Servings')}: {selectedRecipe.servings} {t('generous bowls')}</span>
                </span>
              </div>
            </div>

            {/* Financial Summary & Add All CTA */}
            <div className="bg-[#fdfaf3] border border-[#ddd3ba] p-5 rounded-xl space-y-4 shrink-0 lg:w-80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#4e6b3e] uppercase">
                  {t('Portion Cost')}
                </span>
                <div className="text-xl font-bold text-[#2f4026] font-numeric tabular-nums">
                  {formatPrice(selectedRecipe.costPerServingZar, currency)}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#5a6b4f]">
                <span>{t('Total Recipe Cost')}</span>
                <span className="font-bold font-numeric tabular-nums">
                  {formatPrice(selectedRecipe.totalCostZar, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#5a6b4f]">
                <span>{t('Full Store Basket Cost')}</span>
                <span className="font-bold font-numeric tabular-nums">
                  {formatPrice(
                    selectedRecipe.ingredients.reduce((acc, i) => acc + i.packCostZar, 0),
                    currency
                  )}
                </span>
              </div>

              <button
                onClick={() => handleAddAll(selectedRecipe)}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  recentlyAddedRecipe === selectedRecipe.id
                    ? 'bg-[#4e6b3e] text-white'
                    : 'bg-[#4e6b3e] hover:bg-[#3e5531] text-white'
                }`}
              >
                {recentlyAddedRecipe === selectedRecipe.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{t('Added to Grocery List!')}</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>{t('Add All To Grocery List')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#f2e9d6] pb-2">
            <button
              onClick={() => setActiveTab('cost')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === 'cost'
                  ? 'bg-[#4e6b3e] text-white'
                  : 'text-[#4e6b3e] hover:bg-[#e9dfc8]'
              }`}
            >
              {t('Ingredient Cost Breakdown')} ({selectedRecipe.ingredients.length})
            </button>
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === 'steps'
                  ? 'bg-[#4e6b3e] text-white'
                  : 'text-[#4e6b3e] hover:bg-[#e9dfc8]'
              }`}
            >
              {t('Step-by-Step Cooking Guide')}
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                activeTab === 'nutrition'
                  ? 'bg-[#4e6b3e] text-white'
                  : 'text-[#4e6b3e] hover:bg-[#e9dfc8]'
              }`}
            >
              {t('Nutritional Facts & Satiety')}
            </button>
          </div>

          {/* Tab 1: Ingredient Cost Breakdown Table */}
          {activeTab === 'cost' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#ece2cc] text-[#4e6b3e] font-semibold">
                      <th className="py-2.5 pr-4">{t('Ingredient')}</th>
                      <th className="py-2.5 px-4">{t('Amount Needed')}</th>
                      <th className="py-2.5 px-4">{t('Portion Cost')}</th>
                      <th className="py-2.5 px-4">{t('Store Pack Price')}</th>
                      <th className="py-2.5 pl-4">{t('Nutritional Benefit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f7eedd]">
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <tr key={idx} className="hover:bg-[#fdfaf3]">
                        <td className="py-3 pr-4 font-bold text-[#2f4026]">{t(ing.name)}</td>
                        <td className="py-3 px-4 text-[#4e6b3e]">{t(ing.amount)}</td>
                        <td className="py-3 px-4 font-numeric font-bold text-[#3e5531] tabular-nums">
                          {formatPrice(ing.portionCostZar, currency)}
                        </td>
                        <td className="py-3 px-4 font-numeric text-[#627f50] tabular-nums">
                          {formatPrice(ing.packCostZar, currency)}{' '}
                          <span className="text-[10px] text-[#87997a]">({t(ing.packSize)})</span>
                        </td>
                        <td className="py-3 pl-4 text-[#3e5531]">{t(ing.nutrition)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Budget Chef Tip */}
              <div className="bg-[#f2f6ec] border border-[#d4dfc6] p-3.5 rounded-xl flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-[#4e6b3e] shrink-0 mt-0.5" />
                <div className="text-xs text-[#2f4026]">
                  <strong className="font-bold">{t('Budget & Meal Prep Tip')}: </strong>
                  {t(selectedRecipe.budgetTip)}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Step-by-Step Cooking Steps */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <ol className="space-y-3.5">
                {selectedRecipe.steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3.5 p-3 rounded-xl bg-[#fdfaf3] border border-[#f2e9d6]"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#4e6b3e] text-white flex items-center justify-center font-bold text-xs shrink-0 font-numeric">
                      {idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-[#2f4026] leading-relaxed pt-0.5">
                      {t(step)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tab 3: Nutrition Panel */}
          {activeTab === 'nutrition' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="bg-[#fdfaf3] border border-[#ece2cc] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-[#6e8060] uppercase">{t('Calories')}</span>
                  <div className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums">
                    {selectedRecipe.nutritionFacts.calories}
                  </div>
                  <span className="text-[10px] text-[#7b8370]">kcal / {t('portion')}</span>
                </div>

                <div className="bg-[#fdfaf3] border border-[#ece2cc] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-[#6e8060] uppercase">{t('Protein')}</span>
                  <div className="text-lg font-bold text-[#3e5531] font-numeric tabular-nums">
                    {selectedRecipe.nutritionFacts.proteinG}g
                  </div>
                  <span className="text-[10px] text-[#7b8370]">{t('High fullness')}</span>
                </div>

                <div className="bg-[#fdfaf3] border border-[#ece2cc] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-[#6e8060] uppercase">{t('Fiber')}</span>
                  <div className="text-lg font-bold text-[#3e5531] font-numeric tabular-nums">
                    {selectedRecipe.nutritionFacts.fiberG}g
                  </div>
                  <span className="text-[10px] text-[#7b8370]">{t('Digestive health')}</span>
                </div>

                <div className="bg-[#fdfaf3] border border-[#ece2cc] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-[#6e8060] uppercase">{t('Carbohydrates')}</span>
                  <div className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums">
                    {selectedRecipe.nutritionFacts.carbsG}g
                  </div>
                  <span className="text-[10px] text-[#7b8370]">{t('Slow burn energy')}</span>
                </div>

                <div className="bg-[#fdfaf3] border border-[#ece2cc] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-[#6e8060] uppercase">{t('Healthy Fats')}</span>
                  <div className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums">
                    {selectedRecipe.nutritionFacts.fatG}g
                  </div>
                  <span className="text-[10px] text-[#7b8370]">{t('Nutrient carrier')}</span>
                </div>

                <div className="bg-[#fdfaf3] border border-[#ece2cc] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-[#6e8060] uppercase">{t('Iron')}</span>
                  <div className="text-lg font-bold text-[#3e5531] font-numeric tabular-nums">
                    {selectedRecipe.nutritionFacts.ironMg}mg
                  </div>
                  <span className="text-[10px] text-[#7b8370]">&gt;30% {t('daily rec')}</span>
                </div>
              </div>

              <p className="text-xs text-[#4e6b3e] italic">
                {t('* Nutritional values estimated per serving using standard USDA and South African food composition tables.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
