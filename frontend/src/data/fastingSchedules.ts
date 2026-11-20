/**
 * Fasting schedules and the educational content behind the Fasting Journey.
 *
 * Content notes, because this is health material and not marketing copy:
 *
 *  - Everything here is written in English and translated at render time
 *    through t(), like the rest of the app.
 *  - The physiology below is the broadly agreed picture of what happens as a
 *    fast lengthens. Where the human evidence is weaker than the popular claim
 *    (autophagy, longevity) the text says so rather than repeating the claim.
 *  - The safety list is not decorative. This app is aimed at people eating on a
 *    tight budget in South Africa, where going without food is often not a
 *    choice, and where TB and ARV treatment that must be taken with food is
 *    common. Both cases are called out explicitly.
 *  - Nothing here is medical advice, and the UI says so.
 */

import { FastingSchedule } from '../types';

export const FASTING_SCHEDULES: FastingSchedule[] = [
  {
    id: '12-12',
    label: '12:12',
    name: 'Overnight rest',
    fastHours: 12,
    eatHours: 12,
    level: 'gentle',
    blurb: 'Dinner at 19:00, breakfast at 07:00. Most people already do this without calling it fasting.',
  },
  {
    id: '14-10',
    label: '14:10',
    name: 'Gentle start',
    fastHours: 14,
    eatHours: 10,
    level: 'gentle',
    blurb: 'A softer first step. Push breakfast two hours later and keep the rest of your day normal.',
  },
  {
    id: '16-8',
    label: '16:8',
    name: 'The classic window',
    fastHours: 16,
    eatHours: 8,
    level: 'common',
    blurb: 'The most studied daily pattern. Usually skipping breakfast and eating between about 12:00 and 20:00.',
  },
  {
    id: '18-6',
    label: '18:6',
    name: 'Tighter window',
    fastHours: 18,
    eatHours: 6,
    level: 'common',
    blurb: 'Two solid meals in a six-hour window. Easier if your eating window lands around your main cooked meal.',
  },
  {
    id: '20-4',
    label: '20:4',
    name: 'Four-hour window',
    fastHours: 20,
    eatHours: 4,
    level: 'advanced',
    blurb: 'One big meal plus a snack. Hard to get enough protein and iron in, so plan the meal before you start.',
  },
  {
    id: 'omad',
    label: 'OMAD',
    name: 'One meal a day',
    fastHours: 23,
    eatHours: 1,
    level: 'advanced',
    blurb: 'A single meal daily. Not a beginner pattern, and genuinely difficult to eat a complete diet on.',
  },
];

export const DEFAULT_SCHEDULE_ID = '16-8';

export function scheduleById(id: string): FastingSchedule | undefined {
  return FASTING_SCHEDULES.find((s) => s.id === id);
}

/**
 * What the body is doing as the hours pass.
 *
 * `fromHours` is inclusive, and the last stage is open-ended. These are
 * approximate and vary with the person, the last meal and activity - the UI
 * frames them as a guide, not a readout of anything measured.
 */
export interface MetabolicStage {
  fromHours: number;
  title: string;
  body: string;
  /** Tailwind-ready accent, deepening as the fast lengthens. */
  tone: string;
}

export const METABOLIC_STAGES: MetabolicStage[] = [
  {
    fromHours: 0,
    title: 'Fed state',
    body: 'Your last meal is still being digested. Insulin is raised, and the body is storing energy rather than drawing on its reserves.',
    tone: '#a8b89a',
  },
  {
    fromHours: 4,
    title: 'Settling down',
    body: 'Blood sugar and insulin drop back towards baseline. The liver starts releasing stored glucose to keep levels steady.',
    tone: '#8da87c',
  },
  {
    fromHours: 12,
    title: 'Stores running low',
    body: 'The liver’s glucose store is thinning out, so more of your fuel starts coming from fat. Hunger often arrives in waves here and passes.',
    tone: '#6f9159',
  },
  {
    fromHours: 16,
    title: 'Fat becomes the main fuel',
    body: 'Fatty acids take over the bulk of the work and ketones begin to rise. Many people report a clear-headed stretch around this point.',
    tone: '#4e6b3e',
  },
  {
    fromHours: 18,
    title: 'Ketones climbing',
    body: 'Ketones become a real fuel for the brain. This is the window usually linked to cellular clean-up (autophagy) — though most of that evidence is from animals, not people.',
    tone: '#3e5531',
  },
  {
    fromHours: 24,
    title: 'Extended fast',
    body: 'Past a day, growth hormone rises and ketones keep climbing, but so do the risks — low blood sugar, dizziness, electrolyte loss. Rare, planned, and ideally with medical advice.',
    tone: '#7a4e32',
  },
];

export function stageForHours(hours: number): MetabolicStage {
  let current = METABOLIC_STAGES[0];
  for (const stage of METABOLIC_STAGES) {
    if (hours >= stage.fromHours) current = stage;
  }
  return current;
}

export function nextStage(hours: number): MetabolicStage | null {
  return METABOLIC_STAGES.find((s) => s.fromHours > hours) || null;
}

// --- Education panel content ----------------------------------------------

export interface EducationSection {
  id: string;
  title: string;
  /** Short line under the heading, shown while the section is collapsed. */
  summary: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Rendered as a warning block rather than body text. */
  caution?: boolean;
}

export const EDUCATION_SECTIONS: EducationSection[] = [
  {
    id: 'what',
    title: 'What intermittent fasting actually is',
    summary: 'Not a diet. A schedule.',
    paragraphs: [
      'Intermittent fasting does not tell you what to eat. It only sets when you eat. You pick a window — say eight hours — eat your normal meals inside it, and drink only water, black tea, black coffee or rooibos outside it.',
      'That is the whole idea. Nothing is forbidden and nothing needs to be bought. For a household watching every rand, that matters: it is one of the very few wellness habits that costs nothing to start.',
      'It is also not new. Long overnight gaps between an early supper and a late breakfast were the ordinary pattern for most of human history, and still are in many homes.',
    ],
  },
  {
    id: 'body',
    title: 'What happens in the body',
    summary: 'From digesting to burning fat, hour by hour.',
    paragraphs: [
      'After a meal, insulin rises and your body stores energy. As the hours pass without food, insulin falls and the body switches to spending instead of storing: first the glucose stored in your liver, then increasingly fat.',
      'Somewhere past the twelve-hour mark that liver store thins out and fat becomes the larger share of your fuel. Your liver turns some of it into ketones, which the brain can use. This is why people describe a clear-headed stretch later in a fast.',
      'The timer above names the stage you are in. Treat those as a rough guide — they shift with your last meal, your activity and your own body, and the app is not measuring anything in your blood.',
    ],
  },
  {
    id: 'benefits',
    title: 'What the evidence supports',
    summary: 'Real effects, and the overstated ones.',
    bullets: [
      'Weight and fat loss: it works, but mostly because a shorter window means you eat less overall. Trials put it roughly level with ordinary calorie cutting — not ahead of it.',
      'Blood sugar and insulin sensitivity: modest improvements in several trials, clearest in people who already have insulin resistance.',
      'Blood pressure and cholesterol: small improvements in some studies, inconsistent across others.',
      'Simplicity: fewer meals to plan, cook and buy. On a tight budget this is a practical benefit, not a minor one.',
      'Autophagy, longevity and "cellular repair": genuinely promising in animal research, not established in humans. Be sceptical of anyone selling you certainty here.',
      'What it will not do: fix a diet made of cheap refined starch. Eating badly in a shorter window is still eating badly.',
    ],
  },
  {
    id: 'safety',
    title: 'Who should not fast',
    summary: 'Read this part before you start.',
    caution: true,
    bullets: [
      'If food is already scarce in your home, this is not for you. Fasting by choice and going hungry because there is nothing to cook are completely different things, and the second one does no good at all.',
      'Pregnant or breastfeeding — your needs are higher, not lower.',
      'Under 18 — growing bodies need regular food.',
      'Any history of an eating disorder. Rules about when you may eat can restart a very harmful pattern.',
      'Type 1 diabetes, or type 2 managed with insulin or sulfonylureas — real risk of blood sugar dropping dangerously low. Speak to your clinic first.',
      'Underweight, frail, or recovering from illness or surgery.',
      'Medication that must be taken with food. TB treatment and several ARVs fall into this group — never move or skip a dose to protect a fasting window. Your treatment comes first, always.',
      'Doing heavy physical work, or walking long distances to work, with limited food. Fasting through that is unsafe.',
    ],
    paragraphs: [
      'This app is a tracker, not a clinician. If you have any ongoing condition or take daily medication, talk to a nurse, clinic or doctor before changing when you eat.',
    ],
  },
  {
    id: 'howto',
    title: 'How to fast well',
    summary: 'Hydration, breaking the fast, and the usual mistakes.',
    bullets: [
      'Drink. Water, rooibos, black tea and black coffee are all fine and all free of calories. Most of what feels like hunger early on is thirst.',
      'If you feel lightheaded, a pinch of salt in water often settles it. If it does not, eat.',
      'Start gently. 12:12 for a week, then 14:10. There is no prize for jumping straight to 20:4.',
      'Break the fast small. Something light first — a few spoons of food, a boiled egg — then your real meal twenty minutes later. A huge meal on an empty stomach feels terrible.',
      'Do not treat the window as a reward. Eating double because you waited is the most common way people get nothing out of this.',
      'Protect protein and vegetables. A shorter window makes it easier to fall short on protein, iron and calcium, so put those in the meal deliberately.',
      'Stop if you are shaky, your heart is racing, you feel faint or you cannot think straight. Ending a fast early is not a failure — it is information.',
      'Sleep matters more than the schedule. A badly slept night makes fasting much harder and hunger much louder.',
    ],
  },
  {
    id: 'breakfast',
    title: 'Good food to break a fast on',
    summary: 'Cheap, filling and nutrient-dense.',
    paragraphs: [
      'The meal that ends a fast is the one that decides whether the whole thing was worth doing. Aim for protein, something green and a slow starch — all of which are already on this app’s shelf at low cost.',
    ],
    bullets: [
      'Eggs — complete protein, cooks in minutes, among the cheapest protein per rand.',
      'Lentils or sugar beans — protein plus iron and fibre, and a pot stretches over several meals.',
      'Morogo or spinach — iron, vitamin A and folate for very little money.',
      'Rolled oats — slow-release starch that holds off the next hunger wave.',
      'Pilchards in tomato — omega-3 and calcium straight from the tin, no cooking needed.',
      'Peanut butter on brown bread — fat and protein together, useful when there is no time to cook.',
    ],
  },
  {
    id: 'patterns',
    title: 'Other patterns this timer does not track',
    summary: '5:2, alternate-day, and why they are not here.',
    paragraphs: [
      'The timer handles daily eating windows, because those are the patterns a clock can actually follow. Two well-known approaches work by the week instead, so they are described here rather than timed.',
      '5:2: eat normally five days a week and cut to roughly 500–600 calories on two non-consecutive days. Effective in trials, but it means counting calories on those days, which a timer cannot do for you.',
      'Alternate-day fasting: a normal day, then a very low day, repeating. The research is reasonable but adherence is poor — most people give it up.',
      'If you want either of these, the daily timer can still help: use it to log the long gap on your low days.',
    ],
  },
];
