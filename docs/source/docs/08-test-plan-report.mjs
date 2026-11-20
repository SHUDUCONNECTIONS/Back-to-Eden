import { table, note, control, code } from '../lib.mjs';

const pass = '<span class="tag done">Pass</span>';
const todo = '<span class="tag open">To run</span>';

const auto = [
  ['auth', 'registration requires accepting the privacy policy', 'FR-AUTH-02'],
  ['auth', 'registration validates email and password length', 'FR-AUTH-01'],
  ['auth', 'moderator addresses cannot be registered from the web', 'FR-AUTH-04'],
  ['auth', 'an email can only be registered once', 'FR-AUTH-03'],
  ['auth', 'sign-in gives a token; wrong password and unknown email look the same', 'FR-AUTH-05'],
  ['auth', 'the old identity headers are ignored', 'Security'],
  ['auth', 'a made-up token is rejected', 'Security'],
  ['auth', 'signing out kills the token', 'FR-AUTH-08'],
  ['auth', 'the moderator signs in with the server-set password and is an admin', 'FR-AUTH-04, FR-MOD-06'],
  ['auth', 'repeated wrong passwords lock that account only', 'FR-AUTH-06'],
  ['community', 'guests can browse but not post', 'FR-COM-01, roles'],
  ['community', 'a new post waits for review, and only its author sees it', 'FR-COM-07'],
  ['community', 'only the moderator can see and approve the queue', 'FR-MOD-01, FR-MOD-02'],
  ['community', 'people can only delete their own posts and comments', 'FR-COM-04, FR-COM-08'],
  ['community', 'likes toggle on and off', 'FR-COM-03'],
  ['community', 'posting is capped at 10 an hour per person', 'FR-COM-10'],
  ['platform', 'health check answers', 'NFR availability'],
  ['platform', 'security headers are set and CORS is closed by default', 'NFR security'],
  ['platform', 'grocery lists: junk is cleaned, create never overwrites, bad codes are refused', 'FR-GROC-07, FR-GROC-08'],
  ['platform', 'grocery lists survive a server restart', 'FR-GROC-04'],
  ['platform', 'AI: recipe ideas need an account; translation only accepts real languages', 'FR-AI-01, FR-LANG-04'],
  ['privacy', 'fasting history is private to each account', 'FR-FAST-07'],
  ['privacy', 'an account that has not accepted the current policy is held at the door', 'FR-AUTH-10'],
  ['privacy', 'download my data contains everything, without the password hash', 'FR-PRIV-02'],
  ['privacy', 'deleting an account erases every trace, including photo files', 'FR-PRIV-03'],
  ['schema', 'schema.sql matches the schema the code creates', 'Data model (BTE-DOC-03)'],
];

const uat = [
  ['UAT-01', 'FR-AUTH-01/02', 'Sign up with a new email, ticking the consent box.', 'Account created; you are signed in and see the Community Kitchen.'],
  ['UAT-02', 'FR-AUTH-02', 'Try to sign up without ticking the consent box.', 'Account is not created; a message asks you to accept the policy.'],
  ['UAT-03', 'FR-AUTH-05/06', 'Sign in with a wrong password 9 times.', 'Same "do not match" message each time, then "too many attempts".'],
  ['UAT-04', 'FR-AUTH-09', 'Sign in, close the browser, reopen the app.', 'Still signed in.'],
  ['UAT-05', 'FR-BUD-01/04', 'Choose a preset budget, then switch currency to USD.', 'Totals update; prices shown in dollars and labelled as estimates.'],
  ['UAT-06', 'FR-SHELF-05/06', 'On the Ingredient Shelf choose "Diabetes", then a blood type.', 'Matching foods with reasons; blood type notice shown.'],
  ['UAT-07', 'FR-REC-03', 'Open a recipe and tap Add All To Grocery List.', 'Ingredients appear on the grocery list; the menu count goes up.'],
  ['UAT-08', 'FR-AI-01/03', 'In Leftover Assistant tick three ingredients and ask for a recipe.', 'A recipe with costs and steps appears (a built-in one while no Gemini key is set).'],
  ['UAT-09', 'FR-GROC-04/05', 'Open the grocery list QR code and scan it with a phone. Tick an item on the phone.', 'Same list on the phone; the tick appears on the computer.'],
  ['UAT-10', 'FR-COM-05/06/07', 'As a member, share a recipe with a photo.', 'It appears for you marked "Waiting for review"; another member does not see it.'],
  ['UAT-11', 'FR-MOD-02', 'As a moderator, approve that recipe on the Admin page.', 'It appears on everyone\'s feed.'],
  ['UAT-12', 'FR-COM-03/04', 'Like, mark cooked, and comment on a recipe; then undo the like.', 'Counts update; undoing removes the like.'],
  ['UAT-13', 'FR-COM-09, FR-MOD-04', 'Report a comment; as a moderator remove it and resolve the report.', 'The report appears on the Admin page; after removal the comment is gone.'],
  ['UAT-14', 'FR-FAST-01/02/03', 'Start a 16:8 fast backdated 2 hours.', 'Timer shows about 2 hours elapsed; eat-at time is 14 hours away.'],
  ['UAT-15', 'FR-FAST-04/06', 'End the fast.', 'It appears in recent fasts; totals update.'],
  ['UAT-16', 'FR-LANG-01/03', 'Switch the language to Xitsonga and visit every page.', 'All interface text and content is in Xitsonga; privacy policy stays English.'],
  ['UAT-17', 'FR-PRIV-02', 'Download my data.', 'A JSON file with account, recipes, comments, likes, reports and fasts; no password.'],
  ['UAT-18', 'FR-PRIV-03', 'Delete the account (password + DELETE).', 'Signed out; signing in again fails; your recipes are gone from the feed.'],
  ['UAT-19', 'Phone app', 'Install the phone app build, sign in, like a recipe, start and end a fast, change language.', 'All work; language is remembered after closing the app.'],
  ['UAT-20', 'FR-PRIV-04', 'In the phone app, delete an account.', 'Account deleted; app returns to sign-in.'],
  ['UAT-21', 'NFR compatibility', 'Repeat UAT-01, 09 and 14 on an Android phone browser and an iPhone (Safari).', 'Works and is readable at phone width.'],
];

export default {
  slug: '08-Test-Plan-and-Report',
  number: 'BTE-DOC-08',
  title: 'Test Plan and Test Report',
  subtitle: 'How Back To Eden is tested, the results of the automated tests, and the acceptance tests for the client',
  audience: 'Client acceptance testers, QA, developers',
  sections: [
    {
      title: 'Test approach',
      html: `
${table(['Level', 'What', 'How', 'When'], [
  ['Automated API tests', 'Accounts, sessions, moderation, community rules, privacy rights, grocery sync, security headers', '25 tests (node:test) that start the real compiled server with an empty data folder and call it over HTTP, as the apps do', 'Every change: <code>cd backend &amp;&amp; npm test</code>'],
  ['Static checks', 'Type errors in server, web and phone code', 'TypeScript compiler (<code>tsc --noEmit</code>) for each app', 'Every change'],
  ['Build checks', 'The web app and the phone app bundle successfully', '<code>npm run build</code> (web); <code>expo export</code> (phone); <code>docker build</code>', 'Before each release'],
  ['Translation coverage', 'Every interface and content string has a translation in all ten languages', '<code>node scripts/i18n-missing.mjs</code>', 'When text changes'],
  ['End-to-end seeding', 'The full flow through the real API: register, post with photo, approve, react, comment, report, fast, grocery list', '<code>node scripts/seed-demo.mjs</code> against a running server', 'Before demonstrations'],
  ['User acceptance tests', 'The product from a person\'s point of view, on real devices', 'Scripted scenarios in section 4, run by the client', 'Before sign-off'],
], { widths: ['18%', '30%', '34%', '18%'], cls: 'compact' })}`,
    },
    {
      title: 'Test environment',
      html: `
${table(['Item', 'Value'], [
  ['Date of the results below', '20 November 2026'],
  ['Server', 'Node.js 24.21, NestJS 11, compiled from <code>backend/src</code>'],
  ['Data', 'A new temporary data folder per test file; never the real data'],
  ['Moderator', 'A test-only address set through the same <code>set-password</code> command used in production'],
  ['AI', 'Gemini disabled (fallback paths tested)'],
  ['Operating system', 'Windows 11 (development PC); the same tests run in any environment with Node 24'],
], { widths: ['30%', '70%'] })}`,
    },
    {
      title: 'Automated test results',
      html: `
${note(`<p><strong>Result: 26 of 26 tests passed</strong>, 0 failed, in about 4 seconds plus the build (run on 20 November 2026).</p>`)}
${table(['#', 'File', 'Test', 'Covers', 'Result'], auto.map(([f, t, r], i) => [String(i + 1), f, t, r, pass]), { widths: ['5%', '12%', '50%', '21%', '12%'], cls: 'compact' })}
<h3>3.1 Other checks on the same date</h3>
${table(['Check', 'Result'], [
  ['TypeScript: phone app', `${pass} no errors`],
  ['TypeScript: web app', `${pass} no errors`],
  ['Web production build', `${pass} main bundle about 142 KB compressed; each language a separate file of about 40 KB`],
  ['Phone app bundle (Android, expo export)', `${pass} 630 modules, includes the shared dictionaries`],
  ['Docker image build and start', `${pass} health check answers; the web app is served`],
  ['Translation coverage', `${pass} 1,111 of 1,111 strings in each of the 10 languages`],
], { widths: ['40%', '60%'] })}
<h3>3.2 Running the tests</h3>
${code(`cd backend
npm test          # builds the server, then runs test/*.test.mjs`)}`,
    },
    {
      title: 'User acceptance test script',
      html: `
<p>Run these on the demonstration or staging server with a fresh member account and a moderator account. Record Pass or Fail and any notes. "FR" references are to the Functional Specification (BTE-DOC-01).</p>
${table(['ID', 'Req.', 'Steps', 'Expected result', 'Result'], uat.map((r) => [...r, todo]), { widths: ['8%', '14%', '36%', '32%', '10%'], cls: 'compact' })}`,
    },
    {
      title: 'Coverage gaps and known issues',
      html: `
<h3>5.1 Not covered by automated tests</h3>
<ul>
<li>The web and phone user interfaces (no browser or device automation yet). Covered by the UAT script.</li>
<li>The phone app has been type-checked and bundled but <strong>not yet run on a physical phone</strong>.</li>
<li>Gemini responses (only the fallbacks are tested, because no key is configured).</li>
<li>Nightly backups and restore (manual check recommended before launch; see BTE-DOC-05, section 6).</li>
<li>Load and performance testing.</li>
<li>Accessibility (screen readers, contrast) has not been formally assessed.</li>
<li>Translation quality: coverage is checked automatically, but correctness needs native speakers.</li>
</ul>
<h3>5.2 Known issues</h3>
${table(['#', 'Issue', 'Impact', 'Recommendation'], [
  ['1', 'Posts and comments cannot be edited, only deleted and shared again (the privacy policy now says so).', 'Minor inconvenience', 'Add editing in a later release.'],
  ['2', 'No email verification or reset by email.', 'Someone could register an address they do not own; resets need the team', 'Add an email service (next release).'],
  ['3', 'Rate-limit counters are kept in memory.', 'A server restart clears lockouts', 'Acceptable for launch; persist if abuse appears.'],
  ['4', 'Demonstration data is present (including a demo fast that has been running since seeding).', 'Not suitable for real users', 'Remove before launch (BTE-DOC-05, section 7.1).'],
  ['5', 'Prices and exchange rates have no review date.', 'Estimates may drift', 'Agree a review process (BTE-DOC-01, section 14).'],
], { widths: ['5%', '40%', '25%', '30%'], cls: 'compact' })}`,
    },
    {
      title: 'Acceptance sign-off',
      html: `
<p>By signing below the client confirms that the user acceptance tests in section 4 have been run and the results recorded, and accepts the product subject to the open items listed in the Project Status and Handover document (BTE-DOC-09).</p>
${table(['', 'Client', 'Development team'], [
  ['Name', '', ''],
  ['Role', '', ''],
  ['Signature', '<br><br>', '<br><br>'],
  ['Date', '', ''],
], { widths: ['20%', '40%', '40%'] })}`,
    },
    { title: 'Document control', html: control() },
  ],
};
