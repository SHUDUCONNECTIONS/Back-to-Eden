#!/usr/bin/env node
/**
 * Fills a running Back To Eden stack with demo data, going through the real
 * API the way users would - so seeding doubles as an end-to-end test of
 * posting, photo upload, moderation, reactions, comments, reports, fasting
 * and the shared grocery list. Any failed call stops the script.
 *
 *   node scripts/seed-demo.mjs                       -> http://localhost:8081 (Docker)
 *   node scripts/seed-demo.mjs http://localhost:5173 -> local dev servers
 *
 * Every demo account is @example.com, so demo rows are easy to find and remove.
 *
 * Demo accounts are registered through /api/auth with the password in
 * DEMO_PASSWORD below. The moderator (first ADMIN_EMAILS address) is a real
 * person, so the script never signs in as them: demo posts are approved
 * directly in the database, and two are left in the review queue.
 *
 * Past fasting history is the one thing the API cannot create (a fast always
 * ends "now"), so for Docker it is written straight into fasting.db inside the
 * backend container. Pass --no-history to skip that step.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith('http')) || 'http://localhost:8081').replace(/\/$/, '');
const WITH_HISTORY = !args.includes('--no-history');

// ---------------------------------------------------------------- identities

const USERS = {
  demo: { email: 'demo@example.com', name: 'Demo User' },
  thandi: { email: 'thandi@example.com', name: 'Thandi Mokoena' },
  pieter: { email: 'pieter@example.com', name: 'Pieter van Wyk' },
  fatima: { email: 'fatima@example.com', name: 'Fatima Adams' },
  lwazi: { email: 'lwazi@example.com', name: 'Lwazi Dlamini' },
};

function readAdmin() {
  try {
    const env = readFileSync(path.join(root, 'backend', '.env'), 'utf8');
    const line = env.split(/\r?\n/).find((l) => l.startsWith('ADMIN_EMAILS='));
    const first = line?.slice('ADMIN_EMAILS='.length).split(',')[0].trim();
    return first ? { email: first, name: 'Moderator' } : null;
  } catch {
    return null;
  }
}
const ADMIN = readAdmin();

// ----------------------------------------------------------------- http glue

/** Password for every demo account. They are all @example.com - never real. */
export const DEMO_PASSWORD = 'eden-demo-2026';

async function api(method, route, user, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (user?.token) headers.Authorization = `Bearer ${user.token}`;
  const res = await fetch(BASE + route, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

function photo(file) {
  const bytes = readFileSync(path.join(root, 'frontend', 'public', 'images', file));
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

// ------------------------------------------------------------------- recipes
// Prices are rough 2026 South African supermarket figures, per amount used.

const RECIPES = [
  {
    by: 'thandi', image: 'food_maize_pap_1793344254610.jpg',
    title: 'Pap and Chakalaka', servings: 4, prepTime: '15 mins', cookTime: '35 mins',
    description: 'The Sunday-lunch classic on a weekday budget. Stiff pap with a spicy bean-and-veg relish.',
    ingredients: [
      ['Maize meal', '500g', 7.5], ['Baked beans', '1 tin (410g)', 14],
      ['Carrots', '3 medium', 6], ['Onion', '1 large', 3.5],
      ['Green pepper', '1', 6], ['Curry powder', '1 tbsp', 1.5], ['Sunflower oil', '2 tbsp', 1.5],
    ],
    steps: [
      'Boil 1.25L salted water. Whisk in a third of the maize meal to make a thin porridge, cover and simmer 10 minutes.',
      'Add the rest of the maize meal, stir hard with a wooden spoon until stiff, cover and steam on low for 20 minutes.',
      'Meanwhile fry the onion and pepper in oil, add curry powder for a minute, then the grated carrots.',
      'Stir in the baked beans, simmer 10 minutes and season. Serve hot on the pap.',
    ],
  },
  {
    by: 'pieter', image: 'food_lentil_curry_1793344255201.jpg',
    title: 'Red Lentil Curry', servings: 4, prepTime: '10 mins', cookTime: '25 mins',
    description: 'One pot, no meat, very filling. Red lentils cook down without soaking.',
    ingredients: [
      ['Red lentils', '250g', 12], ['Chopped tomatoes', '1 tin', 12],
      ['Onion', '1', 3.5], ['Garlic', '3 cloves', 2], ['Curry powder', '2 tbsp', 3],
      ['Rice', '300g', 7],
    ],
    steps: [
      'Fry the onion and garlic until soft, add curry powder and cook for a minute.',
      'Add rinsed lentils, tomatoes and 600ml water. Simmer 20 minutes, stirring now and then, until thick.',
      'Cook the rice while the curry simmers. Season the curry well and serve.',
    ],
  },
  {
    by: 'fatima', image: 'food_canned_pilchards_1793344256389.jpg',
    title: 'Pilchard Fishcakes', servings: 4, prepTime: '20 mins', cookTime: '15 mins',
    description: 'Cheap tinned pilchards turned into crispy fishcakes the kids will actually eat.',
    ingredients: [
      ['Pilchards in tomato sauce', '1 tin (400g)', 26], ['Potatoes', '4 medium', 8],
      ['Egg', '1', 3], ['Onion', '1 small', 2.5], ['Flour', '3 tbsp', 1], ['Sunflower oil', 'for frying', 4],
    ],
    steps: [
      'Boil and mash the potatoes.',
      'Remove the bones from the pilchards if you like, then mash the fish with the potato, grated onion and egg.',
      'Shape into 8 patties, dust in flour and shallow-fry 3-4 minutes a side until golden.',
    ],
  },
  {
    by: 'lwazi', image: 'food_dried_beans_1793344253472.jpg',
    title: 'Umngqusho (Samp and Beans)', servings: 6, prepTime: '10 mins + overnight soak', cookTime: '2 hrs',
    description: 'Slow food at its cheapest. Make a big pot - it is better the next day.',
    ingredients: [
      ['Samp', '500g', 14], ['Sugar beans', '250g', 9], ['Onion', '1', 3.5],
      ['Tomatoes', '2', 5], ['Stock cube', '1', 2.5], ['Butter', '1 tbsp', 2],
    ],
    steps: [
      'Soak the samp and beans together overnight. Drain and rinse.',
      'Cover with fresh water and simmer for about 2 hours, topping up water, until both are soft.',
      'Fry onion and tomato, then stir into the pot with the stock cube and butter. Season and serve.',
    ],
  },
  {
    by: 'thandi', image: 'food_fresh_greens_1793344255215.jpg',
    title: 'Morogo with Peanuts', servings: 4, prepTime: '10 mins', cookTime: '15 mins',
    description: 'Wild spinach and peanut butter. A traditional side that adds iron and protein for very little.',
    ingredients: [
      ['Spinach / morogo', '1 bunch', 15], ['Peanut butter', '2 tbsp', 4],
      ['Onion', '1', 3.5], ['Tomato', '1', 2.5],
    ],
    steps: [
      'Wash and roughly chop the greens.',
      'Fry onion and tomato, add the greens with a splash of water and cook until wilted.',
      'Stir through the peanut butter until creamy. Season.',
    ],
  },
  {
    by: 'pieter', image: 'food_butternut_squash.jpg',
    title: 'Butternut Soup', servings: 4, prepTime: '15 mins', cookTime: '30 mins',
    description: 'Smooth, sweet and cheap in winter. A single butternut feeds four.',
    ingredients: [
      ['Butternut', '1 large', 18], ['Onion', '1', 3.5], ['Potato', '1', 2],
      ['Stock cube', '1', 2.5], ['Cinnamon', 'pinch', 0.5],
    ],
    steps: [
      'Peel and cube the butternut and potato.',
      'Soften the onion, add vegetables, stock cube and water to cover. Simmer 25 minutes.',
      'Blend until smooth (or mash well), add cinnamon and season.',
    ],
  },
  {
    by: 'fatima', image: 'food_fresh_eggs.jpg',
    title: 'Spinach and Egg Breakfast', servings: 2, prepTime: '5 mins', cookTime: '10 mins',
    description: 'Fast protein before work. Eggs cooked into wilted spinach and onion.',
    ingredients: [['Eggs', '4', 12], ['Spinach', 'half bunch', 7.5], ['Onion', '1 small', 2.5], ['Bread', '2 slices', 3]],
    steps: [
      'Fry onion until soft, add spinach and cook until wilted.',
      'Make four wells, crack in the eggs, cover and cook until set to your liking.',
      'Serve with toast.',
    ],
  },
  {
    by: 'lwazi', image: 'food_rolled_oats.jpg',
    title: 'Peanut Butter Oats', servings: 2, prepTime: '2 mins', cookTime: '8 mins',
    description: 'Keeps you full until lunch for under R5 a bowl.',
    ingredients: [['Rolled oats', '1 cup', 4], ['Peanut butter', '1 tbsp', 2], ['Banana', '1', 3], ['Milk', '1 cup', 4]],
    steps: [
      'Simmer the oats in milk and a cup of water for 5 minutes, stirring.',
      'Stir in peanut butter, top with sliced banana.',
    ],
  },
  {
    by: 'demo', image: 'food_sweet_potatoes.jpg',
    title: 'Sweet Potato and Bean Stew', servings: 4, prepTime: '15 mins', cookTime: '30 mins',
    description: 'Hearty, slightly sweet, and freezes well.',
    ingredients: [
      ['Sweet potatoes', '3 medium', 12], ['Sugar beans (tinned)', '1 tin', 14],
      ['Chopped tomatoes', '1 tin', 12], ['Onion', '1', 3.5], ['Paprika', '1 tsp', 1],
    ],
    steps: [
      'Soften onion with paprika.',
      'Add cubed sweet potato, tomatoes and a cup of water. Simmer 20 minutes.',
      'Add drained beans, simmer 10 more minutes and season.',
    ],
  },
  {
    by: 'thandi', image: 'food_fresh_cabbage.jpg',
    title: 'Cabbage and Potato Curry', servings: 4, prepTime: '10 mins', cookTime: '25 mins',
    description: 'Half a cabbage and a few potatoes stretched into a full meal.',
    ingredients: [
      ['Cabbage', 'half head', 9], ['Potatoes', '4', 8], ['Onion', '1', 3.5],
      ['Curry powder', '1 tbsp', 1.5], ['Garlic', '2 cloves', 1.5],
    ],
    steps: [
      'Fry onion, garlic and curry powder.',
      'Add cubed potato and half a cup of water, cover and cook 10 minutes.',
      'Add shredded cabbage, cover and cook until everything is tender.',
    ],
  },
  // These two stay in the moderation queue so the admin desk has work to show.
  {
    by: 'pieter', image: 'food_brown_rice.jpg', pending: true,
    title: 'Egg Fried Rice', servings: 3, prepTime: '5 mins', cookTime: '10 mins',
    description: 'Yesterday\'s rice, two eggs and whatever veg is left.',
    ingredients: [['Cooked rice', '3 cups', 6], ['Eggs', '2', 6], ['Frozen peas', '1 cup', 6], ['Soy sauce', '2 tbsp', 3]],
    steps: ['Scramble the eggs and set aside.', 'Fry rice and peas in a hot pan.', 'Add egg and soy sauce, toss and serve.'],
  },
  {
    by: 'demo', image: 'food_fresh_carrots.jpg', pending: true,
    title: 'Carrot and Lentil Soup', servings: 4, prepTime: '10 mins', cookTime: '25 mins',
    description: 'Bright orange, cheap, and very good with bread.',
    ingredients: [['Carrots', '6', 10], ['Red lentils', '150g', 7], ['Onion', '1', 3.5], ['Stock cube', '1', 2.5]],
    steps: ['Soften the onion.', 'Add sliced carrots, lentils, stock and 1.2L water. Simmer 25 minutes.', 'Blend and season.'],
  },
];

const COMMENTS = [
  ['Made this on Tuesday, the whole family loved it.', 'pieter'],
  ['Added a chilli - highly recommend.', 'lwazi'],
  ['How long does it keep in the fridge?', 'demo'],
  ['Three days in a closed container, easily.', 'thandi'],
  ['Cheaper than takeaways and tastier.', 'fatima'],
  ['Shoprite had the tins on special this week.', 'demo'],
];

// --------------------------------------------------------------------- steps

function step(label) {
  process.stdout.write(`  ${label.padEnd(44, '.')} `);
}

async function main() {
  console.log(`\nSeeding demo data into ${BASE}\n`);

  step('API reachable');
  await api('GET', '/api/community/posts');
  console.log('ok');

  if (!ADMIN) {
    console.log('\nNo ADMIN_EMAILS in backend/.env - posts cannot be approved, so the feed would stay empty.');
    process.exit(1);
  }

  // Accounts: register each demo user, or sign in if a previous run made it.
  step(`demo accounts (${Object.keys(USERS).length})`);
  for (const user of Object.values(USERS)) {
    const res = await api('POST', '/api/auth/register', null, {
      name: user.name,
      email: user.email,
      password: DEMO_PASSWORD,
      // Demo accounts are fictional; real people tick the consent box themselves.
      acceptedPrivacyPolicy: true,
    }).catch(() => api('POST', '/api/auth/login', null, { email: user.email, password: DEMO_PASSWORD }));
    user.token = res.token;
    if (res.user?.needsConsent) await api('POST', '/api/auth/consent', user, { acceptedPrivacyPolicy: true });
  }
  console.log('ok');

  // Posts
  step(`creating ${RECIPES.length} recipes with photos`);
  const ids = [];
  for (const r of RECIPES) {
    const res = await api('POST', '/api/community/posts', USERS[r.by], {
      title: r.title,
      description: r.description,
      servings: r.servings,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      ingredients: r.ingredients.map(([name, amount, costZar]) => ({ name, amount, costZar })),
      steps: r.steps,
      imageDataUrl: photo(r.image),
    });
    ids.push({ id: res.id, recipe: r });
  }
  console.log('ok');

  // Moderation. Done in the database rather than through the admin API: the
  // moderator is a real person who has to accept the privacy policy and set a
  // password themselves, so this script never signs in as them.
  step('approving demo posts');
  const toApprove = ids.filter((x) => !x.recipe.pending).map((x) => x.id);
  console.log(inContainer(`
    const db = new DatabaseSync('/app/data/community.db');
    const approve = db.prepare("UPDATE posts SET status = 'approved', reviewed_at = ?, reviewed_by = 'seed-demo' WHERE id = ?");
    for (const id of rows) approve.run(Date.now(), id);
    console.log(rows.length);
  `, toApprove, 'approved'));
  const approved = toApprove.length;

  // Reactions: a spread so the feed has a visible "popular" order.
  step('likes and "cooked this"');
  const people = Object.values(USERS);
  let reactions = 0;
  const live = ids.filter((x) => !x.recipe.pending);
  for (const [i, { id }] of live.entries()) {
    for (const [j, person] of people.entries()) {
      if ((i + j) % 3 !== 0) {
        await api('POST', `/api/community/posts/${id}/reactions`, person, { kind: 'like' });
        reactions++;
      }
      if ((i * j) % 4 === 1) {
        await api('POST', `/api/community/posts/${id}/reactions`, person, { kind: 'cooked' });
        reactions++;
      }
    }
  }
  console.log(`ok (${reactions})`);

  step('comments');
  let comments = 0;
  for (const [i, { id }] of live.slice(0, 5).entries()) {
    for (const [text, who] of COMMENTS.slice(i % 3, (i % 3) + 2)) {
      await api('POST', `/api/community/posts/${id}/comments`, USERS[who], { body: text });
      comments++;
    }
  }
  console.log(`ok (${comments})`);

  step('a report for the moderator to review');
  await api('POST', '/api/community/report', USERS.lwazi, {
    targetType: 'post',
    targetId: live[2].id,
    reason: 'Demo report: please double-check the bones warning for small children.',
  });
  console.log('ok');

  // Fasting: a live fast for the demo user, so the timer is running.
  step('live 16:8 fast for demo user (11h in)');
  await api('DELETE', '/api/fasting/active', USERS.demo).catch(() => {});
  await api('POST', '/api/fasting/start', USERS.demo, {
    scheduleId: '16-8',
    targetHours: 16,
    startedAt: Date.now() - 11 * 3600_000,
  });
  console.log('ok');

  step('live 18:6 fast for Thandi (4h in)');
  await api('DELETE', '/api/fasting/active', USERS.thandi).catch(() => {});
  await api('POST', '/api/fasting/start', USERS.thandi, {
    scheduleId: '18-6',
    targetHours: 18,
    startedAt: Date.now() - 4 * 3600_000,
  });
  console.log('ok');

  if (WITH_HISTORY) {
    step('two weeks of past fasts (written to the db)');
    console.log(seedFastingHistory());

    // Posts made a second ago all read "just now". Spread them over the last
    // ten days (newest first, as created) and move comments to after their post.
    step('spreading post dates over 10 days');
    const dated = ids.map(({ id }, i) => ({
      id,
      at: Date.now() - (ids.length - 1 - i) * 20 * 3600_000 - 2 * 3600_000,
    }));
    console.log(inContainer(`
      const db = new DatabaseSync('/app/data/community.db');
      const setPost = db.prepare('UPDATE posts SET created_at = ? WHERE id = ?');
      const setComments = db.prepare('UPDATE comments SET created_at = ? + (created_at % 1000) * 60000 + 3600000 WHERE post_id = ?');
      for (const r of rows) { setPost.run(r.at, r.id); setComments.run(r.at, r.id); }
      console.log(rows.length);
    `, dated, 'posts'));
  }

  // Shared grocery list.
  step('shared grocery list');
  const cart = await api('POST', '/api/sync/create', null, {
    customCode: 'DEMO-CART',
    initialData: {
      budget: 500,
      householdSize: 4,
      items: [
        ['Maize meal 2.5kg', 'grains', 32, 1, true],
        ['Sugar beans 1kg', 'protein', 28, 1, false],
        ['Pilchards 400g', 'protein', 26, 2, false],
        ['Cabbage', 'vegetables', 18, 1, true],
        ['Onions 2kg', 'vegetables', 30, 1, false],
        ['Eggs (18)', 'protein', 54, 1, false],
        ['Rolled oats 1kg', 'grains', 32, 1, false],
      ].map(([name, category, priceZar, quantity, checked], i) => ({
        id: `demo-${i}`, name, category, priceZar, quantity, checked, recipeSource: 'Demo',
      })),
    },
  });
  console.log(`ok (code ${cart.code})`);

  // Verify what a visitor sees.
  const feed = await api('GET', '/api/community/posts?limit=50', USERS.demo);
  const state = await api('GET', '/api/fasting/state', USERS.demo);
  console.log(`
Done.
  Feed:     ${feed.posts.filter((p) => p.status === 'approved').length} published recipes, ${ids.length - approved} waiting for review
  Fasting:  demo user has ${state.totals.sessionCount} sessions, ${state.totals.goalCount} reached goal${state.active ? ', one running now' : ''}
  Grocery:  join list ${cart.code}

Sign in at ${BASE} with demo@example.com and password ${DEMO_PASSWORD} to see it all.
Moderator: set your password once with
  docker compose exec app node dist/cli/set-password.js <your admin email>
then sign in with it to see the moderation queue and the report.
`);
}

/**
 * Inserts ~2 weeks of finished fasts for each demo user. Runs node inside the
 * backend container, which already has node:sqlite and the database file.
 */
function seedFastingHistory() {
  const now = Date.now();
  const rows = [];
  const plans = {
    demo: ['16-8', 16],
    thandi: ['18-6', 18],
    pieter: ['14-10', 14],
    fatima: ['16-8', 16],
    lwazi: ['12-12', 12],
  };
  const notes = ['', '', 'Felt great', 'Hungry at the end', 'Busy day, easy', 'Broke early - family dinner'];
  for (const [key, [scheduleId, target]] of Object.entries(plans)) {
    for (let day = 14; day >= 1; day--) {
      if (day > 1 && (day + key.length) % 5 === 0) continue; // skip some days (never yesterday, so streaks show)
      const start = now - day * 86_400_000 - (20 - (day % 3)) * 3600_000; // evening start
      const short = (day + key.length) % 4 === 0; // some fasts fall short of the goal
      const hours = short ? target - 2.5 - (day % 2) : target + (day % 3) * 0.4;
      rows.push({
        id: `fast_demo_${key}_${day}`,
        user: USERS[key].email,
        scheduleId,
        target,
        start,
        end: start + Math.round(hours * 3600_000),
        note: notes[(day + key.length) % notes.length],
      });
    }
  }

  return inContainer(`
    const db = new DatabaseSync('/app/data/fasting.db');
    const ins = db.prepare('INSERT OR REPLACE INTO fasting_sessions (id, user_key, schedule_id, target_hours, started_at, ended_at, note, created_at) VALUES (?,?,?,?,?,?,?,?)');
    for (const r of rows) ins.run(r.id, r.user, r.scheduleId, r.target, r.start, r.end, r.note, r.start);
    console.log(rows.length);
  `, rows, 'sessions');
}

/**
 * Runs a snippet of node inside the backend container, which already has
 * node:sqlite and the database files. `DatabaseSync` and `rows` are in scope.
 */
function inContainer(body, rows, noun) {
  const script = `const { DatabaseSync } = require('node:sqlite'); const rows = JSON.parse(process.argv[1]); ${body}`;
  try {
    const out = execFileSync(
      'docker',
      ['compose', 'exec', '-T', 'app', 'node', '-e', script, JSON.stringify(rows)],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return `ok (${out.trim()} ${noun})`;
  } catch (err) {
    return `skipped (${String(err.stderr || err.message).split('\n')[0].slice(0, 80)})`;
  }
}

main().catch((err) => {
  console.log('FAILED');
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
