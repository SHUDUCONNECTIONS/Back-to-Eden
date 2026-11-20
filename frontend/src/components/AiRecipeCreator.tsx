import React, { useState } from 'react';
import { CurrencyCode, RecipeIngredient } from '../types';
import { formatPrice } from '../utils/currency';
import { Lightbulb, ChefHat, Check, Plus, Loader2, ArrowRight } from 'lucide-react';
import { useT } from '../i18n/useTranslation';
import { authHeaders, storedUser } from '../utils/auth';
import { PriceNote } from './PriceNote';

interface AiRecipeCreatorProps {
  currency: CurrencyCode;
  onAddRecipeIngredientsToCart: (ingredients: RecipeIngredient[], recipeTitle: string) => void;
  currentBudgetZar: number;
}

export const AiRecipeCreator: React.FC<AiRecipeCreatorProps> = ({
  currency,
  onAddRecipeIngredientsToCart,
  currentBudgetZar,
}) => {
  const t = useT();
  const [selectedPantry, setSelectedPantry] = useState<string[]>([
    'Dried beans',
    'Seasonal greens',
    'Maize meal',
    'Onions',
  ]);
  const [customIngredient, setCustomIngredient] = useState('');
  const [microBudget, setMicroBudget] = useState(40);
  const [targetServings, setTargetServings] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedRecipe, setSuggestedRecipe] = useState<any>(null);
  const [hasAddedToCart, setHasAddedToCart] = useState(false);

  const pantryOptions = [
    'Dried beans',
    'Brown lentils',
    'Seasonal greens',
    'Maize meal',
    'Pilchards',
    'Eggs',
    'Rolled oats',
    'Sweet potatoes',
    'Cabbage',
    'Onions',
    'Peanut butter',
    'Butternut squash',
  ];

  const togglePantry = (item: string) => {
    if (selectedPantry.includes(item)) {
      setSelectedPantry(selectedPantry.filter((i) => i !== item));
    } else {
      setSelectedPantry([...selectedPantry, item]);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customIngredient.trim() && !selectedPantry.includes(customIngredient.trim())) {
      setSelectedPantry([...selectedPantry, customIngredient.trim()]);
      setCustomIngredient('');
    }
  };

  const handleGenerateRecipe = async () => {
    setIsLoading(true);
    setHasAddedToCart(false);

    try {
      const res = await fetch('/api/ai/recipe-suggest', {
        method: 'POST',
        headers: authHeaders(storedUser()),
        body: JSON.stringify({
          availableIngredients: selectedPantry,
          budget: microBudget,
          targetServings,
          currency,
        }),
      });

      const data = await res.json();
      if (data && data.recipe) {
        setSuggestedRecipe(data.recipe);
      }
    } catch (e) {
      console.error('Failed to generate recipe:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedToCart = () => {
    if (!suggestedRecipe) return;
    const ingredients: RecipeIngredient[] = (suggestedRecipe.ingredients || []).map((i: any) => ({
      name: i.name,
      amount: i.amount,
      portionCostZar: i.cost,
      packCostZar: Math.round(i.cost * 1.5),
      packSize: 'Standard pack',
      category: 'pantry',
      nutrition: i.nutrition || 'Nourishing staple',
    }));

    onAddRecipeIngredientsToCart(ingredients, suggestedRecipe.title);
    setHasAddedToCart(true);
    setTimeout(() => setHasAddedToCart(false), 2500);
  };

  return (
    <section id="ai-creator" className="py-12 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#5f7250] uppercase">
            <span className="w-5 h-px bg-[#5f7250]"></span>
            <span>{t('Intelligent Kitchen Planning')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2f4026]">
            {t('What ingredients do you have right now?')}
          </h2>
          <p className="text-sm text-[#4e6b3e] max-w-xl">
            {t('Select items in your kitchen or pantry. We’ll generate a balanced, healthy recipe that costs next to nothing and wastes zero food.')}
          </p>
          <PriceNote currency={currency} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Ingredient Picker & Constraints */}
          <div className="lg:col-span-5 bg-white border border-[#e9dfc8] rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#4e6b3e] uppercase tracking-wider">
                {t('Select Your Available Ingredients')}:
              </label>
              <div className="flex flex-wrap gap-2">
                {pantryOptions.map((opt) => {
                  const isChecked = selectedPantry.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => togglePantry(opt)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-[#4e6b3e] text-white shadow-2xs'
                          : 'bg-[#f7eedd] hover:bg-[#ddd3ba] text-[#2f4026]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                      <span>{t(opt)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Ingredient Form */}
              <form onSubmit={handleAddCustom} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder={t('Add another item (e.g. carrots, rice)...')}
                  value={customIngredient}
                  onChange={(e) => setCustomIngredient(e.target.value)}
                  className="flex-1 text-xs bg-[#fdfaf3] border border-[#ddd3ba] rounded-lg px-3 py-2 text-[#2f4026] focus:outline-none focus:ring-1 focus:ring-[#3e5531]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-bold text-[#4e6b3e] bg-[#eef3e3] hover:bg-[#d4dfc6] rounded-lg cursor-pointer"
                >
                  + {t('Add')}
                </button>
              </form>
            </div>

            {/* Target Budget & Servings */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#f2e9d6]">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#67795a] uppercase">
                  {t('Max Dish Budget')}
                </label>
                <div className="flex items-center bg-[#fdfaf3] border border-[#ddd3ba] rounded-lg px-2.5 py-1.5">
                  <span className="text-xs text-[#5a6b4f] mr-1">R</span>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={microBudget}
                    onChange={(e) => setMicroBudget(Number(e.target.value))}
                    className="w-full text-xs font-bold text-[#2f4026] font-numeric focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#67795a] uppercase">
                  {t('Desired Servings')}
                </label>
                <select
                  value={targetServings}
                  onChange={(e) => setTargetServings(Number(e.target.value))}
                  className="w-full text-xs font-semibold text-[#2f4026] bg-[#fdfaf3] border border-[#ddd3ba] rounded-lg px-2.5 py-2 cursor-pointer focus:outline-none"
                >
                  <option value={1}>1 {t('serving')}</option>
                  <option value={2}>2 {t('servings')}</option>
                  <option value={4}>4 {t('servings')}</option>
                  <option value={6}>6 {t('servings')}</option>
                </select>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleGenerateRecipe}
              disabled={isLoading || selectedPantry.length === 0}
              className="w-full py-3 px-4 text-xs font-bold text-white bg-[#4e6b3e] hover:bg-[#3e5531] disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('Calculating healthy combination...')}</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  <span>{t('Suggest Healthy Recipe with These')}</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Recipe Output */}
          <div className="lg:col-span-7 bg-white border border-[#e9dfc8] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs flex flex-col justify-between">
            {suggestedRecipe ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#f2e9d6]">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#4e6b3e] bg-[#eef3e3] px-2 py-0.5 rounded">
                      {t('Tailored Nutritious Dish')}
                    </span>
                    <h3 className="text-xl font-bold text-[#2f4026]">
                      {t(suggestedRecipe.title)}
                    </h3>
                    <p className="text-xs text-[#5a6b4f]">
                      {t(suggestedRecipe.description)}
                    </p>
                  </div>

                  <div className="bg-[#fdfaf3] border border-[#ddd3ba] p-3 rounded-xl text-right shrink-0">
                    <span className="text-[10px] font-semibold text-[#4e6b3e] uppercase block">
                      {t('Cost per Serving')}
                    </span>
                    <div className="text-lg font-bold text-[#4e6b3e] font-numeric tabular-nums">
                      {formatPrice(suggestedRecipe.costPerServing || 9.5, currency)}
                    </div>
                    <span className="text-[10px] text-[#7b8370]">
                      {t('Total')}: {formatPrice(suggestedRecipe.estimatedTotalCost || 38, currency)}
                    </span>
                  </div>
                </div>

                {/* Nutritional highlights */}
                {suggestedRecipe.nutritionalHighlights && (
                  <div className="flex flex-wrap gap-2">
                    {suggestedRecipe.nutritionalHighlights.map((hl: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[11px] font-medium text-[#2f4026] bg-[#f2f6ec] border border-[#d4dfc6] px-2.5 py-1 rounded-md"
                      >
                        ✓ {t(hl)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ingredients needed */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#3e5531] uppercase tracking-wider">
                    {t('Ingredients & Estimated Costs')}:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {suggestedRecipe.ingredients.map((ing: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#fdfaf3] border border-[#f2e9d6] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-[#2f4026]">{t(ing.name)}</span>
                          <span className="text-[11px] text-[#4e6b3e] block">
                            {t(ing.amount)} · {t(ing.nutrition)}
                          </span>
                        </div>
                        <span className="font-numeric font-bold text-[#4e6b3e] tabular-nums">
                          {formatPrice(ing.cost || 5, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cooking steps */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-[#3e5531] uppercase tracking-wider">
                    {t('Preparation Steps')}:
                  </h4>
                  <ol className="space-y-2 text-xs text-[#2f4026]">
                    {suggestedRecipe.steps.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#eef3e3] text-[#4e6b3e] font-numeric font-bold flex items-center justify-center shrink-0 text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{t(step)}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-4 border-t border-[#f2e9d6]">
                  <button
                    onClick={handleAddSuggestedToCart}
                    className="w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#4e6b3e] hover:bg-[#3e5531] text-white shadow-xs"
                  >
                    {hasAddedToCart ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>{t('Added to Your Grocery List!')}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{t('Add Recipe Ingredients to Shopping List')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 space-y-4 my-auto">
                <div className="w-12 h-12 rounded-full bg-[#eef3e3] text-[#4e6b3e] flex items-center justify-center mx-auto">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#2f4026]">
                    {t('Turn pantry leftovers into balanced dinners')}
                  </h4>
                  <p className="text-xs text-[#5a6b4f] max-w-sm mx-auto">
                    {t('Pick whatever foods you currently have on the left, tap the button, and we’ll cook up a nutritious recipe within your exact budget.')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
