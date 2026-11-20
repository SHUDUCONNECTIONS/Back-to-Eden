import { table, note, control } from '../lib.mjs';

const R = (id) => `<span class="req">${id}</span>`;
const reqs = (rows) =>
  table(['ID', 'Requirement', 'Priority'], rows.map(([id, text, p = 'Must']) => [R(id), text, `<span class="tag${p === 'Must' ? ' must' : ''}">${p}</span>`]), {
    widths: ['13%', '73%', '14%'],
  });

export default {
  slug: '01-Functional-Specification',
  number: 'BTE-DOC-01',
  title: 'Functional Specification',
  subtitle: 'What Back To Eden does, who it is for, and the rules it follows',
  audience: 'Client, product owner, project manager, testers, developers',
  sections: [
    {
      title: 'Introduction',
      html: `
<h3>1.1 Purpose</h3>
<p>This document describes the functions of Back To Eden as built: what each part of the product does, who can use it, and the business rules behind it. It is the reference against which the client accepts the product and against which testers write test cases. How the product is built is covered in the Technical Architecture (BTE-DOC-02); the data it stores is in the Data Model and ERDs (BTE-DOC-03).</p>
<h3>1.2 Product summary</h3>
<p>Back To Eden helps South African households eat well on a small budget. A person sets a weekly food budget, sees which affordable local foods give the most nourishment for the money, follows costed recipes, builds a shopping list that syncs to their phone in the shop, shares recipes with a moderated community, and can track intermittent fasting with safety guidance. The interface is available in all eleven written official languages of South Africa.</p>
<h3>1.3 Delivery channels</h3>
${table(['Channel', 'What it offers'], [
  ['Web app (any modern browser, desktop or phone)', 'The full product: budget planner, ingredient shelf, recipes, leftover assistant, grocery list, Community Kitchen, Fasting Journey, account and privacy, moderation.'],
  ['Phone app (Android and iOS, built with Expo)', 'The Community Kitchen feed, the Fasting Journey timer and the account (sign-in, language, account deletion). Planning features stay on the web, where people plan sitting down.'],
], { widths: ['32%', '68%'] })}
<h3>1.4 Definitions</h3>
${table(['Term', 'Meaning'], [
  ['Guest', 'Someone using the web app without signing in.'],
  ['Member', 'Someone signed in with an account.'],
  ['Moderator', 'A member whose email address is listed by the server operator as an administrator (ADMIN_EMAILS). Moderators review posts and reports.'],
  ['Server operator', 'Whoever runs the server: sets moderator passwords, configuration and backups.'],
  ['Post', 'A recipe shared to the Community Kitchen.'],
  ['Sync code', 'A short code that links devices to the same grocery list.'],
  ['Fast', 'One fasting session, from start to end, with a target length.'],
  ['ZAR', 'South African rand. All prices are stored in rand and converted for display.'],
], { widths: ['22%', '78%'] })}`,
    },
    {
      title: 'Users and roles',
      html: `
<p>There are four roles. Permissions are enforced on the server; hiding a button in the interface is presentation, not protection.</p>
${table(['Capability', 'Guest', 'Member', 'Moderator'], [
  ['Budget planner, ingredient shelf, built-in recipes', 'Yes', 'Yes', 'Yes'],
  ['Grocery list and device sync', 'Yes', 'Yes', 'Yes'],
  ['Read the Community Kitchen feed and comments', 'Yes', 'Yes', 'Yes'],
  ['Leftover assistant (AI recipe ideas)', 'No', 'Yes', 'Yes'],
  ['Post recipes, like, mark as cooked, comment, report', 'No', 'Yes', 'Yes'],
  ['Delete own posts and comments', 'n/a', 'Yes', 'Yes'],
  ['Fasting Journey (timer and history)', 'No', 'Yes', 'Yes'],
  ['Download own data, delete own account', 'n/a', 'Yes', 'Yes'],
  ['Review queue: approve or reject posts', 'No', 'No', 'Yes'],
  ['Handle reports, remove any post or comment', 'No', 'No', 'Yes'],
  ['Posts published without review', 'n/a', 'No', 'Yes'],
  ['Exempt from posting rate limits', 'n/a', 'No', 'Yes'],
], { widths: ['52%', '16%', '16%', '16%'] })}
<p>The server operator is not a role inside the app. The operator works on the server itself: setting moderator passwords, resetting passwords on request, changing configuration and restoring backups (see the Administration and Operations Guide, BTE-DOC-05).</p>`,
    },
    {
      title: 'Accounts and sign-in',
      html: `
${reqs([
  ['FR-AUTH-01', 'A person can create an account with their full name, email address and a password of 8 to 200 characters.'],
  ['FR-AUTH-02', 'Creating an account requires ticking a statement that the person is 18 or older, accepts the privacy policy, and consents to their fasting history (health information) being stored. Without it the account is not created.'],
  ['FR-AUTH-03', 'An email address can only be registered once. Email addresses are not case sensitive.'],
  ['FR-AUTH-04', 'Moderator email addresses cannot be registered from the app. Their passwords are set by the server operator.'],
  ['FR-AUTH-05', 'Sign-in with email and password returns a session that lasts 30 days. A wrong password and an unknown email give the same message, so the app does not reveal who has an account.'],
  ['FR-AUTH-06', 'After 8 failed sign-ins for one account within 15 minutes, that account is locked for the rest of the 15 minutes. Other accounts on the same network are not affected (40 failures per network address in 15 minutes).'],
  ['FR-AUTH-07', 'At most 10 accounts can be created from one network address per hour.'],
  ['FR-AUTH-08', 'Signing out ends the session on the server, not only on the device.'],
  ['FR-AUTH-09', 'When the app opens it checks the saved session with the server. An expired or revoked session returns the person to sign-in.'],
  ['FR-AUTH-10', 'When the privacy policy version changes, existing members must accept the new version before using any signed-in feature.'],
  ['FR-AUTH-11', '"Forgot password" explains that reset by email is coming soon and tells the person to contact the Back To Eden team, who reset it on the server.', 'Interim'],
  ['FR-AUTH-12', 'Changing a password signs that account out on every device.'],
])}
${note('<p><strong>Known gap:</strong> email addresses are not verified and there is no reset-by-email. Both need an email-sending service. See section 13.</p>', 'warn')}`,
    },
    {
      title: 'Budget planner and currency',
      html: `
${reqs([
  ['FR-BUD-01', 'A person sets a food budget either by choosing a preset (Minimal, Balanced, Generous, Family Plan) or by typing a custom amount.'],
  ['FR-BUD-02', 'The budget is a weekly target for a household of a chosen size (1 person up to a family of 6).'],
  ['FR-BUD-03', 'The ingredient shelf and recipes respond to the active budget.'],
  ['FR-BUD-04', 'Prices can be shown in South African rand (default), US dollar, euro, British pound, Kenyan shilling or Nigerian naira.'],
  ['FR-BUD-05', 'Every price is labelled as an estimate. Prices and exchange rates are fixed values entered by hand, not live prices from any shop. A "last checked" date appears only once someone has actually checked them.'],
])}
${note('<p>All prices are stored in rand. Other currencies are converted with fixed approximate rates (for example 1 ZAR = 0.055 USD). The client should decide who checks prices and rates, and how often (section 13).</p>')}`,
    },
    {
      title: 'Ingredient shelf',
      html: `
${reqs([
  ['FR-SHELF-01', 'The shelf lists 16 affordable, nutritious foods (for example dried sugar beans, brown lentils, pilchards, eggs, peanut butter, maize meal, oats, brown rice, sweet potatoes, morogo, cabbage, butternut).'],
  ['FR-SHELF-02', 'Each food shows its estimated price, pack size, nutrients, why it is worth buying, and how to store it.'],
  ['FR-SHELF-03', 'Foods can be filtered by category: Proteins, Staples, Vegetables, Healthy Fats, Seasonings.'],
  ['FR-SHELF-04', 'Foods can be filtered by nutrient focus: High Protein, High Fiber, Iron and Blood Health.'],
  ['FR-SHELF-05', 'A person can personalise the shelf by health concern (high blood pressure, diabetes, inflammation, gut issues), weight goal (gain or loss) and blood type (O, A, B, AB). Each tag explains why the food helps.'],
  ['FR-SHELF-06', 'The blood type filter carries a notice that controlled studies have not found blood group changes how the body responds to a diet, and that it is a preference filter, not a medical one.'],
  ['FR-SHELF-07', 'Foods can be added to the grocery list.'],
])}`,
    },
    {
      title: 'Recipes and leftover assistant',
      html: `
<h3>6.1 Built-in recipes</h3>
${reqs([
  ['FR-REC-01', 'The app includes 5 costed recipes built from shelf foods (for example braised sugar beans with pap, and pilchard and cabbage stir-fry).'],
  ['FR-REC-02', 'Each recipe shows servings, cost per portion, total recipe cost, the cost of buying full store packs, an ingredient cost breakdown (amount needed, portion cost, store pack price), step-by-step instructions and nutrition and satiety notes.'],
  ['FR-REC-03', 'A person can add all of a recipe\'s ingredients to the grocery list in one tap.'],
])}
<h3>6.2 Leftover assistant</h3>
${reqs([
  ['FR-AI-01', 'A signed-in member selects the ingredients they have, a maximum dish budget and a number of servings, and asks for a recipe.'],
  ['FR-AI-02', 'The suggestion shows the dish, cost per serving, ingredients with estimated costs and preparation steps, and can be added to the grocery list.'],
  ['FR-AI-03', 'Suggestions come from Google Gemini when the operator has configured a key. Without a key, or once the daily limit is reached, the app returns a suitable built-in recipe instead of failing.'],
  ['FR-AI-04', 'Paid AI calls are capped per day (default 500 across recipes and translation) to control cost.'],
])}
${note('<p>No Gemini key is configured at the time of writing, so the assistant currently returns built-in fallback recipes.</p>', 'warn')}`,
    },
    {
      title: 'Grocery list and device sync',
      html: `
${reqs([
  ['FR-GROC-01', 'The grocery list groups items by supermarket aisle (category). Each item has a name, price, quantity and optional note.'],
  ['FR-GROC-02', 'A person ticks items as they go into the trolley. The list shows the basket total, what is in the cart, what is left to buy, and whether the total exceeds the budget.'],
  ['FR-GROC-03', 'A person can quick-add their own item with a name, category and price.'],
  ['FR-GROC-04', 'Each list has a sync code. Opening the list on another device with the same code shows the same list; ticks and changes sync between devices.'],
  ['FR-GROC-05', 'The list can be opened on a phone by copying a link or scanning a QR code shown on screen.'],
  ['FR-GROC-06', 'Sync codes avoid the characters I, O, 0 and 1 and are not case sensitive, so they can be read aloud and typed without mistakes.'],
  ['FR-GROC-07', 'Creating a list never overwrites an existing list with the same code.'],
  ['FR-GROC-08', 'A list holds at most 300 items. Lists nobody has opened for 90 days are deleted.'],
  ['FR-GROC-09', 'Grocery lists do not need an account. Anyone with a code can read and change that list, so codes should be treated like a shared key.'],
])}`,
    },
    {
      title: 'Community Kitchen',
      html: `
<h3>8.1 Feed</h3>
${reqs([
  ['FR-COM-01', 'Everyone, including guests, can read the feed of approved recipes, sorted by most recent or most popular, loaded page by page.'],
  ['FR-COM-02', 'Each post shows the author, when it was posted, a photo if one was added, cost per serving, servings, cook time, title, description, ingredients with amounts and costs, steps, and counts of likes, "cooked this" and comments.'],
  ['FR-COM-03', 'Members can like a post and mark it as "cooked this". Each is a toggle: tapping again removes it.'],
  ['FR-COM-04', 'Everyone can read comments. Members can add comments of up to 1,000 characters and delete their own.'],
])}
<h3>8.2 Sharing a recipe</h3>
${reqs([
  ['FR-COM-05', 'A member can post a recipe with a title (up to 120 characters), description (up to 600), servings, prep and cook time, 1 to 30 ingredients (name, amount, cost) and 1 to 30 steps (up to 600 characters each).'],
  ['FR-COM-06', 'A post can include one photo: JPEG, PNG or WebP, up to 6 MB.'],
  ['FR-COM-07', 'A member\'s new post waits for moderator review. Until approved, only its author sees it, marked "waiting for review". A moderator\'s own post is published straight away.'],
  ['FR-COM-08', 'Members can delete their own posts. Deleting a post removes its photo, ingredients, steps, reactions and comments.'],
])}
<h3>8.3 Reporting and limits</h3>
${reqs([
  ['FR-COM-09', 'A member can report a post or a comment, with a reason of up to 300 characters. Reports go to the moderators.'],
  ['FR-COM-10', 'Per member, per hour: at most 10 posts, 60 comments, 300 reactions and 20 reports. Moderators are exempt.'],
])}`,
    },
    {
      title: 'Moderation',
      html: `
${reqs([
  ['FR-MOD-01', 'Moderators see a Admin page, with counts of posts waiting and open reports. Other members never see it, and the server refuses its actions to anyone else.'],
  ['FR-MOD-02', 'A moderator can approve a waiting post (it appears on the feed) or reject it. A rejected post is kept on record and can be approved later.'],
  ['FR-MOD-03', 'A moderator can delete any post for good.'],
  ['FR-MOD-04', 'A moderator sees open reports with a summary of the reported post or comment and its author, can remove the reported comment or post, and can mark the report resolved.'],
  ['FR-MOD-05', 'Each approval or rejection records which moderator made it and when.'],
  ['FR-MOD-06', 'Moderator accounts are chosen by the server operator (ADMIN_EMAILS setting), not inside the app.'],
])}`,
    },
    {
      title: 'Fasting Journey',
      html: `
${reqs([
  ['FR-FAST-01', 'A member chooses an eating window: 12:12 (overnight rest), 14:10 (gentle start), 16:8 (the classic window), 18:6, 20:4 or OMAD (one meal a day, 23 hours). The last choice is remembered.'],
  ['FR-FAST-02', 'A member starts a fast now, or backdates the start to when they last ate (up to 48 hours back).'],
  ['FR-FAST-03', 'While fasting, the app shows the elapsed time, progress towards the target, the time they can eat, time to go or time over target, and the approximate stage the body is in (fed state through to extended fast), labelled as approximate.'],
  ['FR-FAST-04', 'A member can end the fast (it is recorded, whether or not the target was reached) or discard it (nothing is recorded).'],
  ['FR-FAST-05', 'Only one fast can run at a time per member.'],
  ['FR-FAST-06', 'The app shows progress: fasts logged, how often the target was hit, total hours, longest fast and day streak, plus a history of recent fasts. A member can delete a record.'],
  ['FR-FAST-07', 'Fasting history is private to each member.'],
  ['FR-FAST-08', 'A learning section explains the stages and the eating windows, and describes patterns the timer does not track (5:2, alternate-day).'],
  ['FR-FAST-09', 'Safety guidance is always visible: the app is a tracker, not medical advice, and people who are pregnant, under 18, diabetic, underweight, on daily medication such as TB treatment or ARVs, or who have had an eating disorder are told to speak to a clinic first. The safety section opens by default.'],
  ['FR-FAST-10', 'The timer works from the stored start time, so it stays correct if the app is closed or the phone sleeps.'],
])}`,
    },
    {
      title: 'Privacy and account control',
      html: `
${reqs([
  ['FR-PRIV-01', 'The privacy policy can be read at any time from the account page, and before signing up.'],
  ['FR-PRIV-02', 'A member can download everything stored about them (account, recipes, comments, likes, reports, fasting history) as a JSON file. The password hash is never included.'],
  ['FR-PRIV-03', 'A member can delete their account. They confirm with their password and by typing DELETE. Deletion erases the account, sessions, posts and their photo files, comments, reactions, reports and fasting history. Other people\'s comments on their recipes go too. It cannot be undone.'],
  ['FR-PRIV-04', 'Account deletion is available inside the phone app, as Apple and Google require.'],
  ['FR-PRIV-05', 'Guests are told that nothing about them is stored on the server.'],
  ['FR-PRIV-06', 'Server backups are kept for 7 days by default (configurable), so deleted data leaves the backups within that time. The privacy policy promises at most 30 days.'],
])}
<p>How the product meets POPIA is covered in the Privacy and POPIA Compliance document (BTE-DOC-07).</p>`,
    },
    {
      title: 'Languages',
      html: `
${reqs([
  ['FR-LANG-01', 'The interface is available in English, Afrikaans, isiZulu, isiXhosa, Sepedi, Sesotho, Setswana, siSwati, isiNdebele, Xitsonga and Tshivenḓa. South African Sign Language has no written form and is not a text option.'],
  ['FR-LANG-02', 'Languages are listed by their own names (for example "isiZulu", not "Zulu") with the English name as a subtitle.'],
  ['FR-LANG-03', 'All interface text and the app\'s own content (foods, recipes, fasting stages and education) is translated: 1,111 strings in each language.'],
  ['FR-LANG-04', 'On the web, each language is downloaded only when chosen. If a string has no translation, the web app may ask the server for a machine translation (when a Gemini key is set), otherwise it shows English.'],
  ['FR-LANG-05', 'The phone app uses the same translations. It follows the phone\'s language on first launch and remembers the person\'s choice.'],
  ['FR-LANG-06', 'The privacy policy and the consent statement stay in English until a checked human translation exists, because consent must be informed. Messages written by the server (such as a wrong password) are also English.'],
  ['FR-LANG-07', 'User-generated content (posts and comments) is shown as written; it is not translated.'],
])}
${note('<p>The translations were drafted without native speakers. They must be reviewed by native speakers before launch (section 13).</p>', 'warn')}`,
    },
    {
      title: 'Non-functional requirements',
      html: `
${table(['Area', 'Requirement as built'], [
  ['Security', 'Passwords hashed with scrypt; session tokens are random and only their hash is stored; every API route requires a session unless marked public; security headers (no framing, no MIME sniffing, strict referrer policy); cross-origin calls refused unless the operator allows an origin; rate limits on sign-in, sign-up, posting, comments, reactions and reports. See BTE-DOC-02.'],
  ['Privacy', 'POPIA consent at sign-up, versioned policy, data download, full account deletion including files, 7-day backup retention. See BTE-DOC-07.'],
  ['Performance', 'The web app\'s main download is about 142 KB compressed; each language adds about 40 KB only when chosen. The feed loads in pages (8 posts on the phone, 20 on the web by default).'],
  ['Availability and recovery', 'Runs as a single container. Data is backed up nightly with a consistent SQLite snapshot and kept for 7 days. A health check endpoint reports whether the server is up.'],
  ['Scalability', 'One server instance with SQLite files. Suits a pilot or a community-sized launch. Growth beyond one server needs a shared database (see BTE-DOC-02, section on limits).'],
  ['Compatibility', 'Current versions of Chrome, Edge, Firefox and Safari, on desktop and phone. Phone app: Android and iOS through Expo SDK 58.'],
  ['Low bandwidth', 'Language files load on demand; images are only those people upload; the feed pages rather than loading everything.'],
  ['Honesty of information', 'Prices are labelled as estimates; fasting stages are labelled as approximate; the blood type filter is labelled as not medically supported; the AI fallback is used rather than an error.'],
], { widths: ['22%', '78%'] })}`,
    },
    {
      title: 'Out of scope and open items',
      html: `
<p>The following are not part of this release, or need a decision or input from the client before launch.</p>
${table(['#', 'Item', 'Status', 'Owner'], [
  ['1', 'Privacy policy details: organisation name, contact email, Information Officer, hosting provider and country. The policy contains placeholders in square brackets.', '<span class="tag gap">Required before launch</span>', 'Client'],
  ['2', 'Register the Information Officer with the Information Regulator (POPIA).', '<span class="tag gap">Required before launch</span>', 'Client'],
  ['3', 'Production hosting with a permanent web address and HTTPS. The app currently runs from a development PC through a temporary tunnel.', '<span class="tag gap">Required before launch</span>', 'Client and team'],
  ['4', 'Native-speaker review of the ten translations.', '<span class="tag open">Recommended</span>', 'Client'],
  ['5', 'Remove the demonstration accounts and posts (all use @example.com addresses).', '<span class="tag gap">Required before launch</span>', 'Team'],
  ['6', 'Email verification and password reset by email (needs an email-sending service).', '<span class="tag open">Next release</span>', 'Team'],
  ['7', 'A process for checking prices and exchange rates, and who owns it.', '<span class="tag open">Decision</span>', 'Client'],
  ['8', 'Gemini API key for AI recipe ideas and machine translation (optional, has a cost).', '<span class="tag open">Decision</span>', 'Client'],
  ['9', 'Publishing the phone app to Google Play (one-off US$25) and the App Store (US$99 a year).', '<span class="tag open">Next release</span>', 'Client'],
  ['10', 'Translating the privacy policy and consent statement (needs checked human translation).', '<span class="tag open">Next release</span>', 'Client'],
  ['11', 'Not planned: payments, live supermarket prices, push notifications, budgeting and shopping list in the phone app.', '<span class="tag">Out of scope</span>', 'n/a'],
], { widths: ['5%', '60%', '20%', '15%'] })}`,
    },
    { title: 'Document control', html: control() },
  ],
};
