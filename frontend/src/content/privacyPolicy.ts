/**
 * The Back To Eden privacy policy (POPIA, South Africa).
 *
 * DRAFT - written to match what the app actually stores and does, but it is
 * not legal advice. Before launch:
 *   1. Replace every [BRACKETED] placeholder.
 *   2. Have someone qualified in POPIA review it.
 *   3. Register your Information Officer with the Information Regulator.
 *   4. The "Backups: up to 30 days" line assumes Railway volume backups are set
 *      to Daily + Weekly only (kept 6 and 27 days). Monthly keeps 89 days.
 *
 * When you change anything users should agree to again, bump
 * PRIVACY_POLICY_VERSION here AND in backend/src/database/auth-db.ts. Everyone
 * is then asked to accept the new version on their next visit.
 */

export const PRIVACY_POLICY_VERSION = '2026-11-16';
export const PRIVACY_POLICY_UPDATED = '16 November 2026';

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export const PRIVACY_POLICY: PolicySection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      'Back To Eden is run by [ORGANISATION NAME] ("we"). We are the responsible party for your personal information under the Protection of Personal Information Act, 2013 (POPIA).',
      'Our Information Officer is [NAME], reachable at [CONTACT EMAIL]. Write to them with any question, request or complaint about your information.',
    ],
  },
  {
    heading: 'What we collect',
    bullets: [
      'Your account: your name, email address and password. Passwords are stored only in a scrambled (hashed) form that we cannot read.',
      'What you share in the Community Kitchen: recipes, photos, comments, likes, "cooked this" marks and any reports you make. Recipes, photos, comments and your name are visible to everyone using the app.',
      'Your fasting history: when each fast started and ended, your target and any notes. This is information about your health, which POPIA treats as special personal information, and we process it only with your explicit consent.',
      'Sign-in records: when you signed in and when that sign-in expires (after 30 days).',
      'Your IP address, held briefly in memory to slow down password guessing. It is not stored.',
    ],
  },
  {
    heading: 'What we do not collect',
    bullets: [
      'No advertising or tracking cookies, and no analytics that follow you around the web.',
      'Your browser stores your sign-in, language and shopping-list preferences on your own device so the app works. That stays on your device.',
      'Shared grocery lists are not linked to your account. Anyone with a list\'s code can see and edit that list, so do not put anything private in one.',
    ],
  },
  {
    heading: 'Why we use it',
    bullets: [
      'To run your account and keep it secure.',
      'To show your recipes and comments in the Community Kitchen, and to let moderators review posts and reports.',
      'To track your fasts and show your progress, only for you.',
      'We do not sell your information, and we do not use it for advertising.',
    ],
  },
  {
    heading: 'Who else handles it',
    bullets: [
      'Our hosting provider, [HOSTING PROVIDER], stores the app and its data in [COUNTRY/REGION]. [If outside South Africa: we only use providers bound by data protection comparable to POPIA, as section 72 requires.]',
      'Google (Gemini) receives the ingredients and budget you type into the Leftover Assistant, and text that needs translating into your language. It does not receive your name, email or fasting history.',
      'We disclose information to authorities only when the law requires it.',
    ],
  },
  {
    heading: 'How long we keep it',
    bullets: [
      'Your account and everything linked to it: until you delete your account.',
      'Sign-ins: 30 days, or until you sign out.',
      'Shared grocery lists: deleted automatically after 90 days without use.',
      'Backups: up to 30 days, after which deleted data is gone from backups too.',
    ],
  },
  {
    heading: 'Your rights',
    paragraphs: ['Under POPIA you can:'],
    bullets: [
      'See what we hold: use "Download my data" on the Account & privacy page.',
      'Correct it: delete a post or comment and share it again, or contact us to correct anything else, such as your name.',
      'Delete it: use "Delete my account". This permanently erases your account, recipes, photos, comments, likes, reports and fasting history.',
      'Withdraw consent at any time by deleting your account. Withdrawing does not affect processing already done.',
      'Object to processing, or complain to us at [CONTACT EMAIL].',
      'Complain to the Information Regulator (South Africa): https://inforegulator.org.za',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'Passwords are hashed, sign-in sessions are random tokens we store only in hashed form, repeated wrong passwords are blocked, and the app is served over an encrypted (HTTPS) connection. No system is perfectly secure; if a breach affects your information, we will tell you and the Information Regulator as POPIA requires.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'Back To Eden is for people aged 18 and over. Fasting is not suitable for children. If you are under 18, please do not create an account.',
    ],
  },
  {
    heading: 'Health',
    paragraphs: [
      'Back To Eden gives general information, not medical advice. Speak to a doctor before fasting if you are pregnant, diabetic, take medication, or have or have had an eating disorder.',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'If we change this policy in a way that matters, we will ask you to read and accept the new version the next time you use the app.',
    ],
  },
];
