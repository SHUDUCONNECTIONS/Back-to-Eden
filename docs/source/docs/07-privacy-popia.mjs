import { table, note, control } from '../lib.mjs';

const ok = '<span class="tag done">In place</span>';
const part = '<span class="tag open">Partly</span>';
const gap = '<span class="tag gap">Action needed</span>';

export default {
  slug: '07-Privacy-and-POPIA-Compliance',
  number: 'BTE-DOC-07',
  title: 'Privacy and POPIA Compliance',
  subtitle: 'What personal information Back To Eden processes, how it meets POPIA, and what the client must still do',
  audience: 'Client, Information Officer, legal and compliance reviewers',
  sections: [
    {
      title: 'Purpose and limits of this document',
      html: `
<p>This document records how Back To Eden handles personal information and maps the product against the Protection of Personal Information Act, 2013 (POPIA). It describes the software as built. It is <strong>not legal advice</strong>: the client, as the responsible party, should have the privacy policy and this assessment reviewed by a qualified adviser before launch.</p>
${note('<p><strong>Before launch the client must:</strong> complete the placeholders in the privacy policy (organisation, Information Officer, contact email, hosting provider and country), register the Information Officer with the Information Regulator, and confirm the hosting arrangement. See section 9.</p>', 'risk')}`,
    },
    {
      title: 'Roles',
      html: `
${table(['POPIA role', 'Who', 'Notes'], [
  ['Responsible party', '[ORGANISATION NAME] (the client)', 'Decides why and how personal information is processed.'],
  ['Information Officer', '[NAME], [CONTACT EMAIL]', 'Must be registered with the Information Regulator.'],
  ['Operators', '[HOSTING PROVIDER]; Google (Gemini), only if a key is configured', 'Process information on the client\'s behalf. Need written agreements (section 21).'],
  ['Data subjects', 'Members (account holders), aged 18 or over', 'Guests are not data subjects of the server: nothing about them is stored.'],
], { widths: ['22%', '36%', '42%'] })}`,
    },
    {
      title: 'Personal information inventory',
      html: `
${table(['Information', 'Category', 'Purpose', 'Where', 'Who sees it'], [
  ['Name, email address', 'Personal', 'Account, sign-in, authorship', 'auth.db', 'Member; name is public on posts and comments'],
  ['Password', 'Personal (credential)', 'Sign-in', 'auth.db, scrypt hash only', 'Nobody'],
  ['Consent record (policy version and time)', 'Personal', 'Evidence of consent', 'auth.db', 'Member (in data download)'],
  ['Sign-in sessions', 'Personal', 'Keeping the member signed in', 'auth.db, token hashes only', 'Member (in data download)'],
  ['Recipes, photos, comments', 'Personal (user content)', 'Community Kitchen', 'community.db, uploads/', 'Everyone, once approved'],
  ['Likes, "cooked this"', 'Personal', 'Community Kitchen', 'community.db', 'Counts are public'],
  ['Reports filed', 'Personal', 'Moderation', 'community.db', 'Moderators only'],
  ['Fasting history', '<strong>Special personal information (health)</strong>', 'Showing the member their progress', 'fasting.db', 'The member only'],
  ['IP address', 'Personal', 'Rate limiting against password guessing and spam', 'Server memory only, not stored', 'Nobody'],
  ['Grocery lists', 'Not linked to a person', 'Shopping', 'sync.db', 'Anyone with the code'],
  ['Session token, language, list copy', 'Personal (on the device)', 'Making the app work', 'The member\'s own browser or phone', 'The member'],
], { widths: ['21%', '17%', '22%', '19%', '21%'], cls: 'compact' })}
<p>The app has no advertising, no tracking cookies and no third-party analytics. It does not collect location, contacts, ID numbers, dates of birth, payment details or device identifiers.</p>`,
    },
    {
      title: 'Lawful basis and consent',
      html: `
<ul>
<li><strong>Account and community features:</strong> consent given at sign-up, and processing necessary to provide the service the member asked for (section 11(1)(a) and (b)).</li>
<li><strong>Fasting history (health):</strong> processed only with the member's <strong>explicit consent</strong> (section 27(1)(a)). The sign-up statement names it: "I consent to Back To Eden storing my fasting history (health information) to show me my progress."</li>
<li><strong>Children:</strong> the service is for people aged 18 and over; the consent statement includes "I am 18 or older". There is no age verification beyond this declaration.</li>
</ul>
<h3>4.1 How consent is recorded</h3>
<ul>
<li>An account cannot be created without ticking the consent statement; the server refuses the request otherwise.</li>
<li>The policy version and the time of acceptance are stored on the account.</li>
<li>When the policy version changes, every member must accept the new version before using any signed-in feature (they can still download their data or delete their account first).</li>
<li>Consent is withdrawn by deleting the account, available in the web app and the phone app.</li>
<li>The consent statement and privacy policy are shown in English in every language setting, so that consent is not given on the strength of an unchecked translation.</li>
</ul>`,
    },
    {
      title: 'The eight conditions for lawful processing',
      html: `
${table(['Condition (POPIA)', 'How Back To Eden meets it', 'Status'], [
  ['1. Accountability (s8)', 'Responsible party and Information Officer named in the policy; this document and the technical documentation describe the processing.', `${part}<br><span class="small">placeholders to complete</span>`],
  ['2. Processing limitation (s9 to 12)', 'Only what the features need is collected (section 3). Consent recorded at sign-up. Collected from the member directly.', ok],
  ['3. Purpose specification (s13, 14)', 'Purposes stated in the policy. Retention: account data until deletion; sessions 30 days; grocery lists 90 days idle; backups 7 days (policy promises at most 30).', ok],
  ['4. Further processing limitation (s15)', 'No secondary use: no advertising, profiling, selling or analytics.', ok],
  ['5. Information quality (s16)', 'Members can delete and re-post content. Editing posts and changing name or email are not available in the app yet; the operator can help on request.', part],
  ['6. Openness (s17, 18)', 'Privacy policy available before sign-up and at any time; it lists what is collected, why, who receives it and the member\'s rights.', `${part}<br><span class="small">placeholders to complete</span>`],
  ['7. Security safeguards (s19 to 22)', 'Hashed passwords and tokens, access control on every route, rate limits, security headers, HTTPS in production, nightly backups, automated tests of privacy features. Breach notification needs a written procedure (section 7).', part],
  ['8. Data subject participation (s23 to 25)', 'Download my data (JSON) and Delete my account in the app; requests and complaints to the Information Officer; Information Regulator named in the policy.', ok],
], { widths: ['24%', '58%', '18%'] })}`,
    },
    {
      title: 'Data subject rights in the product',
      html: `
${table(['Right', 'How a member exercises it', 'Response time'], [
  ['Access (s23)', '"Download my data" on the web Account &amp; Privacy page: one JSON file with the account, recipes, comments, likes, reports and fasting history.', 'Immediate'],
  ['Correction (s24)', 'Delete and re-post a recipe or comment. Other corrections: contact the Information Officer.', 'Immediate / on request'],
  ['Deletion (s24)', '"Delete my account" on the web or in the phone app. Removes all linked records and photo files at once.', 'Immediate; backups within 7 days'],
  ['Withdraw consent (s11(2)(b))', 'Delete the account.', 'Immediate'],
  ['Object, complain (s11(3), s74)', 'Contact the Information Officer; complain to the Information Regulator (address in the policy).', 'Client process'],
], { widths: ['22%', '58%', '20%'] })}
<p>Both the data download and the account deletion are covered by automated tests: the download must contain every kind of record and no password hash; deletion must leave no trace in any database or the photo folder.</p>`,
    },
    {
      title: 'Security safeguards and breaches',
      html: `
<p>The technical controls are listed in the Technical Architecture (BTE-DOC-02, section 6). In summary: passwords hashed with scrypt; session tokens stored only as hashes; every API route private unless deliberately public; moderator rights only from server configuration; rate limits on sign-in, sign-up and posting; strict security headers; uploads checked and renamed; nightly consistent backups kept 7 days.</p>
<h3>7.1 Breach procedure (to be adopted by the client)</h3>
<ol>
<li>Contain: take the server offline or revoke access; change server credentials and the Gemini key.</li>
<li>Assess what information and how many members are affected, using the server logs and databases.</li>
<li>Notify the Information Regulator and affected members as soon as reasonably possible (section 22), by email to the account address, describing what happened, what information was involved and what members should do (for example, change a reused password).</li>
<li>Record the incident and the actions taken.</li>
</ol>
${note('<p>Signing every member out is done by deleting the sessions table rows on the server; members then sign in again.</p>')}`,
    },
    {
      title: 'Operators and cross-border transfer',
      html: `
${table(['Operator', 'Receives', 'Location', 'Action'], [
  ['[HOSTING PROVIDER]', 'All data on the server', '[COUNTRY/REGION]', 'Written operator agreement (s21). If outside South Africa, confirm adequate protection (s72).'],
  ['Google (Gemini API)', 'Only if a key is set: the ingredient names, budget and servings typed into the Leftover Assistant, and interface text to translate. No name, email, recipes from others or fasting history.', 'Outside South Africa', 'Accept Google\'s data processing terms; keep the policy statement accurate.'],
  ['Cloudflare (demonstration tunnel only)', 'All traffic passes through it while the tunnel is used', 'Global', 'Do not use the tunnel for real members\' data.'],
], { widths: ['20%', '40%', '14%', '26%'], cls: 'compact' })}`,
    },
    {
      title: 'Pre-launch privacy checklist',
      html: `
${table(['#', 'Item', 'Owner', 'Status'], [
  ['1', 'Fill in the privacy policy placeholders: organisation name, Information Officer name, contact email, hosting provider and country.', 'Client', gap],
  ['2', 'Register the Information Officer with the Information Regulator.', 'Client', gap],
  ['3', 'Choose production hosting; sign an operator agreement; confirm the data location.', 'Client', gap],
  ['4', 'Have the policy and this assessment reviewed by a legal adviser.', 'Client', gap],
  ['5', 'Remove all demonstration accounts and content (@example.com).', 'Team', gap],
  ['6', 'Policy sentence on correcting information now matches the app (delete and re-post; contact us for anything else).', 'Team', '<span class="tag done">Done</span>'],
  ['7', 'Adopt the breach procedure in section 7.1 and name who runs it.', 'Client', gap],
  ['8', 'Arrange off-site backup copies, kept no longer than the policy allows.', 'Client and team', '<span class="tag open">Recommended</span>'],
  ['9', 'Decide whether to enable Gemini; if so, accept Google\'s terms.', 'Client', '<span class="tag open">Decision</span>'],
  ['10', 'Commission a checked human translation of the policy and consent statement, if they are to be offered in other languages.', 'Client', '<span class="tag open">Optional</span>'],
  ['11', 'Add email verification, so that an account can only be created by the owner of the address.', 'Team', '<span class="tag open">Next release</span>'],
], { widths: ['5%', '61%', '16%', '18%'] })}`,
    },
    { title: 'Document control', html: control() },
  ],
};
