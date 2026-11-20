/**
 * Recipes served when Gemini is unavailable.
 *
 * The Leftover Assistant is a core screen, so it must never show an error page
 * just because GEMINI_API_KEY is unset or a call failed. These two are real,
 * costed South African budget meals - a usable answer rather than a placeholder.
 * The response says which one it is via `source`, so the client can be honest
 * about it if it wants to be.
 */

export const CURATED_FALLBACK = {
  title: 'Hearty Braised Lentil & Vegetable Pot',
  description:
    'A deeply comforting, budget-friendly one-pot meal loaded with plant-based protein, dietary fiber, and warm spices.',
  estimatedTotalCost: 38,
  costPerServing: 9.5,
  servings: 4,
  prepTime: '15 mins',
  cookTime: '30 mins',
  ingredients: [
    { name: 'Brown Lentils', amount: '1 cup (200g)', cost: 12, nutrition: '24g protein, high fiber' },
    { name: 'Seasonal Greens / Spinach', amount: '1 bunch', cost: 10, nutrition: 'Vitamin A, C, Iron' },
    { name: 'Onion & Garlic', amount: '1 onion + 2 cloves garlic', cost: 8, nutrition: 'Antioxidants' },
    { name: 'Sunflower Oil & Curry Spice', amount: '1 tbsp each', cost: 8, nutrition: 'Essential fatty acids' },
  ],
  steps: [
    'Rinse the brown lentils thoroughly under clean cold water.',
    'Heat oil in a heavy pot over medium heat. Sauté finely chopped onion and garlic until fragrant and translucent.',
    'Add curry powder, stirring for 30 seconds to release the natural aromas.',
    'Add the rinsed lentils and 3 cups of water. Bring to a gentle boil, then simmer covered for 25 minutes until tender.',
    'Stir in the washed and chopped greens, cooking for an additional 3-4 minutes until wilted and vibrant.',
    'Season with a pinch of salt. Serve warm over steamed maize meal (pap) or brown rice.',
  ],
  nutritionalHighlights: [
    'High in iron and plant protein',
    'Cholesterol-free',
    'Rich in dietary fiber for sustained satiety',
  ],
};

export const ERROR_FALLBACK = {
  title: 'Nutritious Savory Bean & Greens Medley',
  description:
    'Balanced, highly filling, protein-packed budget dish made from nourishing local staples.',
  estimatedTotalCost: 35,
  costPerServing: 8.75,
  servings: 4,
  prepTime: '10 mins',
  cookTime: '25 mins',
  ingredients: [
    { name: 'Sugar Beans or Lentils', amount: '1.5 cups cooked', cost: 14, nutrition: '22g protein, zinc & fiber' },
    { name: 'Fresh Seasonal Greens', amount: '1 large bunch', cost: 11, nutrition: 'Folate & Vitamin K' },
    { name: 'Tomato & Onion Gravy Base', amount: '1 tomato, 1 onion', cost: 10, nutrition: 'Lycopene & potassium' },
  ],
  steps: [
    'Sauté diced onion and fresh tomato until soft and rich.',
    'Add your cooked or canned beans along with 1/2 cup of broth or water.',
    'Simmer for 10 minutes so flavors meld together.',
    'Fold in chopped seasonal greens and cook for 3 minutes until tender-crisp.',
    'Serve with warm pap, sweet potato, or whole wheat flatbread.',
  ],
  nutritionalHighlights: [
    'Rich in plant-based iron and vitamin C to enhance absorption',
    'High fiber for digestive health',
  ],
};
