import { table, note, control, code } from '../lib.mjs';

const done = '<span class="tag done">Done</span>';
const part = '<span class="tag open">Partly</span>';
const gap = '<span class="tag gap">Not started</span>';

export default {
  slug: '09-Project-Status-and-Handover',
  number: 'BTE-DOC-09',
  title: 'Project Status and Handover',
  subtitle: 'What has been delivered, what remains before launch, and how to take the project forward',
  audience: 'Client, project sponsor, and any team taking over development',
  sections: [
    {
      title: 'Summary',
      html: `
<p>Back To Eden is <strong>feature-complete for a pilot</strong>: the web app, server and phone app work end to end, with real accounts, moderation, privacy controls and all eleven languages. It currently runs on a development PC for demonstrations.</p>
<p>Four things stand between the product and real users, and all of them need the client:</p>
<ol>
<li>Complete the privacy policy details and register the Information Officer.</li>
<li>Choose and pay for production hosting with a permanent address.</li>
<li>Remove the demonstration data.</li>
<li>Run the acceptance tests and sign off.</li>
</ol>
${note('<p>Native-speaker review of the translations and publishing the phone app to the app stores are strongly recommended, but a web-only pilot in English could start without them.</p>')}`,
    },
    {
      title: 'Feature status',
      html: `
${table(['Area', 'Status', 'Notes'], [
  ['Accounts: sign-up, sign-in, sessions, sign-out', done, 'Secure hashing, 30-day sessions, rate limits. No email verification or reset by email yet.'],
  ['Budget planner and currencies', done, 'Prices are labelled estimates.'],
  ['Ingredient shelf and personal filters', done, '16 foods.'],
  ['Built-in recipes', done, '5 costed recipes.'],
  ['Leftover assistant', part, 'Works with built-in fallbacks; AI suggestions need a Gemini key.'],
  ['Grocery list with cross-device sync and QR code', done, 'Stored on the server; lists expire after 90 days idle.'],
  ['Community Kitchen: feed, posts with photos, likes, comments, reports', done, ''],
  ['Moderation: review queue, reports, removal', done, ''],
  ['Fasting Journey: timer, history, streaks, education, safety', done, ''],
  ['Privacy: consent, policy versions, data download, account deletion', done, 'Policy placeholders to complete.'],
  ['Eleven languages, web', done, '1,111 strings each; needs native-speaker review.'],
  ['Phone app: feed, fasting, account, languages', part, 'Builds and type-checks; not yet tested on a physical phone or published.'],
  ['Automated tests', done, '26 tests, all passing.'],
  ['Docker packaging and nightly backups', done, ''],
  ['Production hosting', gap, 'Railway trial expired; hosting decision pending.'],
  ['Email service (verification, reset)', gap, 'Next release.'],
], { widths: ['42%', '14%', '44%'] })}`,
    },
    {
      title: 'Work completed in this phase',
      html: `
${table(['Item', 'What changed'], [
  ['Real sign-in', 'Replaced an unverified "who you say you are" header scheme with passwords, hashed session tokens and a server-wide access guard. Moderators are set on the server.'],
  ['Grocery lists in a database', 'Lists moved from server memory (lost on restart) to SQLite, with validation and expiry.'],
  ['POPIA', 'Consent at sign-up, versioned privacy policy, data download, full account deletion including photos, backup retention.'],
  ['Production packaging', 'Single Docker image serving the API and web app, health checks, security headers, nightly backups.'],
  ['Automated tests', '25 end-to-end API tests covering accounts, community, privacy and platform, plus a schema check.'],
  ['Clean-up', 'Legacy folders moved to <code>_archive/</code> (kept, not deleted).'],
  ['Honest pricing', 'Prices and exchange rates labelled as estimates, with a review date shown only once someone checks them.'],
  ['Phone app', 'Upgraded to Expo SDK 58; secure session storage; account deletion; consent flow.'],
  ['Translations', 'Every web and phone string in all ten languages; dictionaries shared by web and phone; downloaded per language.'],
  ['Grocery QR code', 'Replaced a placeholder image with a real, scannable QR code.'],
  ['Documentation', 'This set of nine documents (BTE-DOC-01 to 09).'],
], { widths: ['24%', '76%'] })}`,
    },
    {
      title: 'Launch readiness checklist',
      html: `
${table(['#', 'Task', 'Owner', 'Blocks launch?'], [
  ['1', 'Complete privacy policy placeholders', 'Client', 'Yes'],
  ['2', 'Register the Information Officer with the Information Regulator', 'Client', 'Yes'],
  ['3', 'Choose hosting; set up the server with a persistent volume, HTTPS and a domain name', 'Client and team', 'Yes'],
  ['4', 'Set ADMIN_EMAILS and moderator passwords on the production server', 'Team', 'Yes'],
  ['5', 'Remove demonstration data', 'Team', 'Yes'],
  ['6', 'Run the user acceptance tests (BTE-DOC-08) and sign off', 'Client', 'Yes'],
  ['7', 'Commit the source code to version control and keep an off-site copy', 'Team', 'Yes'],
  ['8', 'Set up off-site backup copies', 'Team', 'Recommended'],
  ['9', 'Native-speaker review of translations', 'Client', 'Recommended'],
  ['10', 'Confirm prices against current shop prices; set the review date', 'Client', 'Recommended'],
  ['11', 'Test the phone app on Android and iPhone devices', 'Team', 'For the phone launch'],
  ['12', 'Publish the phone app (Google Play US$25 once; Apple US$99 a year)', 'Client', 'For the phone launch'],
  ['13', 'Decide on a Gemini key (cost per use, capped daily)', 'Client', 'No'],
], { widths: ['5%', '59%', '18%', '18%'] })}`,
    },
    {
      title: 'Recommended roadmap',
      html: `
${table(['Release', 'Scope', 'Relative size'], [
  ['Pilot launch', 'Checklist items 1 to 8; web app only; English plus reviewed languages.', 'Small'],
  ['1.1', 'Email service: verification at sign-up and password reset by email. Post editing. Phone app published to stores.', 'Medium'],
  ['1.2', 'Budget planner and grocery list in the phone app; offline support for the list in shops without signal.', 'Medium'],
  ['1.3', 'Price review tooling for the content owner (edit prices without a developer).', 'Medium'],
  ['Scale', 'Move to PostgreSQL and object storage for photos when usage needs more than one server (BTE-DOC-02, section 9).', 'Large'],
], { widths: ['16%', '64%', '20%'] })}`,
    },
    {
      title: 'Handover information',
      html: `
<h3>6.1 Source code</h3>
${table(['Item', 'Location'], [
  ['Project folder', '<code>D:\\BackToEden\\BackToEden</code> on the development PC'],
  ['Server', '<code>backend/</code>'],
  ['Database schema (generated)', '<code>backend/schema.sql</code>'],
  ['Web app', '<code>frontend/</code>'],
  ['Phone app', '<code>mobile/</code>'],
  ['Shared types and translations', '<code>shared/</code>'],
  ['Developer guide', '<code>README.md</code> (setup, commands, configuration, deployment)'],
  ['Documentation (PDF) and its source', '<code>docs/</code>; rebuild with <code>node docs/source/build.mjs</code>'],
  ['Archived legacy code', '<code>D:\\BackToEden\\_archive\\</code> (not used by the product; kept for reference)'],
], { widths: ['32%', '68%'] })}
${note('<p><strong>Version control:</strong> a git repository has been initialised but nothing has been committed yet, at the client\'s request. Commit before any further changes, and push to a private remote (for example GitHub or Azure DevOps) so the code is not held on one PC only.</p>', 'risk')}
<h3>6.2 Accounts and secrets</h3>
<ul>
<li>No third-party accounts are required to run the product. Optional: hosting provider, Google AI Studio (Gemini key), Apple and Google developer accounts.</li>
<li>Secrets (moderator passwords, Gemini key) are never stored in the source code. They are set on the server (BTE-DOC-05). Hand them over in person or through a password manager, never by chat or email.</li>
<li>Demonstration accounts all use <code>@example.com</code>; their shared password is in <code>scripts/seed-demo.mjs</code>.</li>
</ul>
<h3>6.3 Everyday commands</h3>
${code(`node dev.mjs                          # run server + web app for development
cd backend && npm test                # automated tests
docker build -t backtoeden .          # production image
docker compose up -d --no-build       # run it (http://localhost:8081)
node scripts/i18n-missing.mjs         # translation coverage
node docs/source/build.mjs            # rebuild these PDFs`)}`,
    },
    {
      title: 'Documentation set',
      html: `
${table(['No.', 'Document', 'For'], [
  ['BTE-DOC-01', 'Functional Specification', 'Client, product owner, testers'],
  ['BTE-DOC-02', 'Technical Architecture', 'Developers, technical reviewers'],
  ['BTE-DOC-03', 'Data Model and ERDs', 'Developers, database and privacy reviewers'],
  ['BTE-DOC-04', 'API Reference', 'Developers'],
  ['BTE-DOC-05', 'Administration and Operations Guide', 'Moderators, server operator, support'],
  ['BTE-DOC-06', 'User Guide', 'App users, support staff'],
  ['BTE-DOC-07', 'Privacy and POPIA Compliance', 'Client, Information Officer, legal'],
  ['BTE-DOC-08', 'Test Plan and Test Report', 'Acceptance testers, QA'],
  ['BTE-DOC-09', 'Project Status and Handover', 'Client, sponsor, future team'],
], { widths: ['18%', '42%', '40%'] })}`,
    },
    { title: 'Document control', html: control() },
  ],
};
