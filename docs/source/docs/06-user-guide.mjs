import { table, note, control } from '../lib.mjs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const IMG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'img');
const shot = (file, caption, width = '86%') =>
  `<figure><img src="${pathToFileURL(path.join(IMG, file)).href}" style="width:${width};border:1px solid #d8dfd3;border-radius:4px"><figcaption>${caption}</figcaption></figure>`;
const steps = (items) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;

export default {
  slug: '06-User-Guide',
  number: 'BTE-DOC-06',
  title: 'User Guide',
  subtitle: 'How to use Back To Eden on the web and on your phone',
  audience: 'People using the app, and the support staff who help them',
  sections: [
    {
      title: 'Getting started',
      html: `
<p>Back To Eden helps you plan healthy, affordable meals for your household. You can use it in a web browser on a computer or phone, and the Community Kitchen and fasting timer are also in the Back To Eden phone app.</p>
<h3>1.1 Sign in, sign up, or look around as a guest</h3>
${shot('01-welcome.jpg', 'Figure 1.1 The sign-in screen.', '42%')}
<ul>
<li><strong>Continue as Guest</strong> lets you use the budget planner, ingredient shelf, recipes and grocery list without an account. Nothing about you is stored on our server.</li>
<li><strong>Sign Up</strong> creates a free account so you can share recipes, like and comment, use the leftover assistant and track your fasts.</li>
<li>The language button at the top lets you choose any of South Africa's eleven written languages before you start.</li>
</ul>
<h3>1.2 Creating an account</h3>
${steps([
  'Tap <strong>Sign Up</strong>.',
  'Enter your full name, email address and a password of at least 8 characters, twice.',
  'Read the privacy policy, then tick the box to confirm you are 18 or older, accept the policy, and agree that Back To Eden may store your fasting history to show you your progress.',
  'Tap <strong>Create Account</strong>. You are signed in straight away.',
])}
${shot('02-sign-up.jpg', 'Figure 1.2 Creating an account.', '42%')}
<h3>1.3 Forgot your password?</h3>
<p>Tap <strong>Forgot Password?</strong>. Reset by email is coming soon; for now the screen tells you how to contact the Back To Eden team, who will reset it for you after checking it is really you.</p>
<h3>1.4 Finding your way around</h3>
<p>The menu on the left (the ☰ button on a phone) has every part of the app: Community Kitchen, Fasting Journey, Budget Planner, Ingredient Shelf, Nutritious Recipes, Leftover Assistant, Grocery List and Account &amp; Privacy. A number next to Grocery List shows how many items are on your list; a timer next to Fasting Journey shows a fast in progress.</p>`,
    },
    {
      title: 'Planning your food budget',
      html: `
${shot('06-budget.jpg', 'Figure 2.1 Budget Planner.')}
${steps([
  'Open <strong>Budget Planner</strong>.',
  'Choose a preset budget (Minimal, Balanced, Generous or Family Plan) or type your own amount.',
  'Choose how many people you are feeding.',
  'The cards show your total budget, what is in your cart, what is left and the cost per person per day. The ingredient shelf and recipes adjust to your budget.',
])}
<p>To see prices in another currency, use the currency selector at the top of the page (rand, US dollar, euro, pound, Kenyan shilling or naira).</p>
${note('<p>All prices are estimates of typical South African supermarket prices, not live prices. Check prices in your own shop.</p>')}`,
    },
    {
      title: 'Ingredient Shelf',
      html: `
${shot('07-shelf.jpg', 'Figure 3.1 Ingredient Shelf with personal filters.')}
<p>The shelf lists affordable foods that give the most nourishment for the money: beans, lentils, pilchards, eggs, maize meal, oats, morogo, butternut and more. Each one shows its price, nutrients, why it is good value and how to store it.</p>
<ul>
<li><strong>Filter by category</strong> (Proteins, Staples, Vegetables, Healthy Fats, Seasonings) or by <strong>nutrient focus</strong> (protein, fibre, iron).</li>
<li><strong>Personalise your shelf</strong>: choose a health concern (high blood pressure, diabetes, inflammation, gut issues), a weight goal or a blood type to see which foods suit you, with the reason.</li>
<li>Add a food to your grocery list with one tap.</li>
</ul>
${note('<p>The blood type filter follows a popular diet. Studies have not found that blood group changes how your body responds to food, so treat it as a preference. For health conditions, speak to a clinic.</p>', 'warn')}`,
    },
    {
      title: 'Recipes and the Leftover Assistant',
      html: `
<h3>4.1 Nutritious Recipes</h3>
${shot('08-recipes.jpg', 'Figure 4.1 Nutritious Recipes.')}
<p>Each recipe shows the cost per portion, the whole recipe and the full shop packs, a cost breakdown for every ingredient, step-by-step instructions and nutrition notes. Tap <strong>Add All To Grocery List</strong> to put everything you need on your list.</p>
<h3>4.2 Leftover Assistant</h3>
${shot('09-leftovers.jpg', 'Figure 4.2 Leftover Assistant.')}
${steps([
  'Open <strong>Leftover Assistant</strong> (you need to be signed in).',
  'Tick the ingredients you already have, or type others and tap <strong>+ Add</strong>.',
  'Set the most you want to spend on the dish and how many servings you need.',
  'Tap <strong>Suggest Healthy Recipe with These</strong>. You get a recipe with costs and steps, which you can add to your shopping list.',
])}`,
    },
    {
      title: 'Grocery list in the shop',
      html: `
${shot('10-grocery.jpg', 'Figure 5.1 Grocery List, grouped by aisle.')}
<ul>
<li>Items are grouped by supermarket aisle. Tick each one as it goes into your trolley; the totals at the top show what is in the cart, what is left and whether you are within budget.</li>
<li>Add your own items with the <strong>Add item</strong> row (name, aisle and price). Change quantities with − and +, or remove an item with the bin.</li>
</ul>
<h3>5.1 Taking the list to the shop on your phone</h3>
${steps([
  'On the computer, open Grocery List and tap <strong>QR Code</strong>.',
  'Point your phone\'s camera at the code and open the link. The same list opens on your phone.',
  'Or tap <strong>Copy Link</strong> and send it to your phone or to someone shopping with you.',
  'Ticks and changes on any device show up on the others.',
])}
${note('<p>Anyone with your list\'s link or code can see and change the list, so only share it with people you shop with. Lists not used for 90 days are deleted.</p>', 'warn')}`,
    },
    {
      title: 'Community Kitchen',
      html: `
${shot('03-community.jpg', 'Figure 6.1 The Community Kitchen feed.')}
<h3>6.1 Reading and reacting</h3>
<ul>
<li>Choose <strong>Most recent</strong> or <strong>Most loved</strong>. Scroll down for more.</li>
<li>Tap <strong>View the recipe</strong> for ingredients, costs and steps.</li>
<li><strong>Like</strong> a recipe, tap <strong>Cooked this</strong> when you have made it, or <strong>Comment</strong>. Tap again to undo a like or "cooked".</li>
<li>The <strong>⋯</strong> menu lets you report a post or comment that is harmful or spam. Moderators will look at it; the person you report is not told who reported them.</li>
</ul>
<h3>6.2 Sharing your recipe</h3>
${shot('04-composer.jpg', 'Figure 6.2 Sharing a recipe.')}
${steps([
  'Tap <strong>Photo &amp; recipe</strong> at the top of the feed.',
  'Add a photo of the dish if you like (JPEG, PNG or WebP). It is resized on your device before upload.',
  'Give it a title and short description, how many it serves, and prep and cook times.',
  'Add each ingredient with the amount and what it cost, then each step.',
  'Tap <strong>Share recipe</strong>.',
])}
<p>Your recipe shows <strong>Waiting for review</strong> until a moderator approves it; until then only you can see it. You can delete your own recipes and comments at any time.</p>`,
    },
    {
      title: 'Fasting Journey',
      html: `
${shot('05-fasting.jpg', 'Figure 7.1 Fasting Journey with a fast in progress.')}
${note('<p><strong>Read this first.</strong> The fasting timer is a tracker, not medical advice. If you are pregnant, under 18, diabetic, underweight, take daily medication such as TB treatment or ARVs, or have ever had an eating disorder, speak to a clinic before changing when you eat. If you feel faint, shaky or your heart is racing, eat something now.</p>', 'risk')}
<h3>7.1 Starting a fast</h3>
${steps([
  'Open <strong>Fasting Journey</strong>.',
  'Choose a window. New to this? Start with 12:12 or 14:10 for a week before going longer.',
  'Start now, or choose when you last ate (up to 48 hours ago).',
])}
<h3>7.2 While you fast</h3>
<p>The ring shows how long you have fasted and how close you are to your target. The cards show when you started, when you can eat and how long is left. The stage card describes, approximately, what your body is doing. Water, rooibos, black tea and black coffee are fine while fasting.</p>
<h3>7.3 Ending a fast</h3>
<p>Tap <strong>End fast and eat</strong> (or <strong>End fast now</strong> before the target). Ending early still counts and is recorded. If you started by mistake, use <strong>Started by mistake</strong> to discard it without a record.</p>
<h3>7.4 Your progress</h3>
<p>Below the timer you see your current and best streak, fasts logged, how often you hit your target, your longest fast and the last 14 days. Your fasting history is private: only you can see it.</p>`,
    },
    {
      title: 'Your language',
      html: `
${shot('12-isizulu.jpg', 'Figure 8.1 The app in isiZulu.')}
<p>Tap the language button (top of the menu, or on the sign-in screen) and choose English, Afrikaans, isiZulu, isiXhosa, Sepedi, Sesotho, Setswana, siSwati, isiNdebele, Xitsonga or Tshivenḓa. The whole app switches, including foods, recipes and fasting guidance. Your choice is remembered on that device.</p>
<p>A few things stay in English: the privacy policy and the consent statement (until a checked translation exists), some messages from the server, and recipes and comments people write themselves.</p>`,
    },
    {
      title: 'Your account and privacy',
      html: `
${shot('11-account.jpg', 'Figure 9.1 Account &amp; privacy.')}
<ul>
<li><strong>Download my data</strong> gives you a file with everything we store about you: your account, recipes, comments, likes, reports and fasting history.</li>
<li><strong>Delete my account</strong> permanently erases your account, recipes and their photos, comments, likes, reports and fasting history. Enter your password, type DELETE and confirm. This cannot be undone.</li>
<li><strong>Read the privacy policy</strong> at any time. If we change it, the app asks you to accept the new version the next time you sign in.</li>
<li><strong>Sign out</strong> ends your session on that device.</li>
</ul>`,
    },
    {
      title: 'The phone app',
      html: `
<p>The Back To Eden phone app (Android and iPhone) has the parts you use on the go. Planning tools stay on the website, where they are easier to use on a bigger screen.</p>
${table(['Tab', 'What you can do'], [
  ['Feed', 'Read the Community Kitchen, like a recipe, mark "Cooked this", open the full recipe. Pull down to refresh.'],
  ['Fasting', 'Choose a window, start and end fasts, see the timer, stage and when you can eat, and your progress and recent fasts.'],
  ['Account', 'See who you are signed in as, change language, sign out, delete your account. Downloading your data and reading the privacy policy are on the website\'s Account &amp; Privacy page.'],
], { widths: ['18%', '82%'] })}
<ul>
<li>Sign in with the same account as on the website. You stay signed in; your session is kept in your phone's secure storage.</li>
<li>The first time you open the app it uses your phone's language if Back To Eden speaks it. You can change it on the sign-in screen or under Account.</li>
<li>The small address at the bottom of the screen shows which server the app is connected to; support staff may ask you for it.</li>
</ul>
${shot('13-phone-web.jpg', 'Figure 10.1 The website on a phone also works: tap ☰ for the menu.', '34%')}`,
    },
    {
      title: 'Questions and help',
      html: `
${table(['Question', 'Answer'], [
  ['Are the prices exact?', 'No. They are estimates of typical prices and change by shop, area and season.'],
  ['Why is my recipe not on the feed?', 'New recipes wait for a moderator to check them. You can see yours marked "Waiting for review".'],
  ['Why did it say "Too many attempts"?', 'After several wrong passwords the account is paused for 15 minutes to protect it. Try again later, or ask the team to reset your password.'],
  ['Can other people see my fasting history?', 'No. Only you can see it, and you can delete it with your account.'],
  ['I shared my grocery list link by mistake.', 'Start a new list (new code) and stop using the old one.'],
  ['The app says "Could not reach the server".', 'Check your internet connection and try again. If it keeps happening, tell the support team the address shown at the bottom of the phone app.'],
  ['How do I contact the team?', '[CONTACT EMAIL - to be completed by the client]'],
], { widths: ['36%', '64%'] })}`,
    },
    { title: 'Document control', html: control() },
  ],
};
