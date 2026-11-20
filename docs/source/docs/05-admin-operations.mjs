import { table, note, control, code } from '../lib.mjs';

export default {
  slug: '05-Administration-and-Operations-Guide',
  number: 'BTE-DOC-05',
  title: 'Administration and Operations Guide',
  subtitle: 'Moderating the community, running the server, backups, recovery and troubleshooting',
  audience: 'Moderators, the server operator and support staff',
  sections: [
    {
      title: 'Who does what',
      html: `
${table(['Role', 'Works in', 'Responsibilities'], [
  ['Moderator', 'The web app (Admin page)', 'Review new recipes, handle reports, remove harmful content, post official recipes.'],
  ['Server operator', 'The server (command line, hosting dashboard)', 'Choose moderators and set their passwords, reset members\' passwords on request, configuration, deployments, backups and restores, monitoring.'],
  ['Content owner (client)', 'Source files, through the development team', 'Prices, built-in recipes and foods, privacy policy text, translations review.'],
], { widths: ['20%', '28%', '52%'] })}`,
    },
    {
      title: 'Moderating the Community Kitchen',
      html: `
<h3>2.1 Signing in as a moderator</h3>
<ol>
<li>The operator has added your email address to ADMIN_EMAILS and set your password (section 4).</li>
<li>In the web app open the sign-in page and choose <strong>Moderator sign in</strong>, or sign in normally. An <strong>Admin</strong> entry appears in the side menu, with a badge counting posts waiting plus open reports.</li>
</ol>
<h3>2.2 Reviewing new recipes</h3>
<p>Every recipe a member shares waits in the queue until a moderator acts. The author sees it marked "waiting for review"; nobody else sees it.</p>
<ul>
<li><strong>Approve</strong> publishes it to the feed.</li>
<li><strong>Reject</strong> keeps it off the feed. It is kept on record, so a mistake can be undone by approving it later.</li>
<li><strong>Delete</strong> removes it and its photo for good.</li>
</ul>
<p>Suggested checks before approving: it is a real recipe; the costs are plausible; the photo is of food and contains no people's faces or personal details; there is no advertising, links or medical claims (for example "cures diabetes").</p>
<h3>2.3 Handling reports</h3>
<p>Members can report a post or a comment with a reason. The Admin page lists open reports with a summary of the content and its author. For each report: remove the comment or delete the post if it breaks the rules, then <strong>Resolve</strong> the report. Resolve without removing anything if the report is unfounded. Reporters are never shown to the people they report.</p>
<h3>2.4 Posting as a moderator</h3>
<p>Recipes posted by a moderator skip the queue and appear immediately, and moderators are not subject to the hourly posting limits. Use this for official Back To Eden recipes.</p>
${note('<p>Everything on the Admin page is checked again on the server. Hiding the page from other members is a convenience, not the protection.</p>')}`,
    },
    {
      title: 'Configuration',
      html: `
<p>The server is configured with environment variables, set in the hosting dashboard or in <code>backend/.env</code> (read by Docker Compose). Changes take effect after a restart.</p>
${table(['Variable', 'Default', 'Purpose'], [
  ['<code>ADMIN_EMAILS</code>', 'none', 'Comma-separated moderator email addresses. These addresses cannot be registered through the app.'],
  ['<code>GEMINI_API_KEY</code>', 'none', 'Google Gemini key for AI recipe ideas and machine translation. Without it both use fallbacks. Paid per use.'],
  ['<code>AI_DAILY_LIMIT</code>', '500', 'Maximum paid Gemini calls per day (UTC). Protects against runaway cost.'],
  ['<code>CORS_ORIGINS</code>', 'none', 'Extra web origins allowed to call the API. Not needed when the web app is served by the same server.'],
  ['<code>TRUST_PROXY</code>', '1 on Railway; local networks elsewhere', 'How many proxies sit in front of the server, so rate limits use the visitor\'s real address.'],
  ['<code>BACKUPS</code>', 'on', 'Set to <code>off</code> to disable nightly snapshots.'],
  ['<code>BACKUP_KEEP_DAYS</code>', '7', 'Days to keep snapshots. The privacy policy promises at most 30 days; never set it higher without changing the policy.'],
  ['<code>DATA_DIR</code>', '<code>/app/data</code> in Docker', 'Where databases, photos and backups are stored.'],
  ['<code>PORT</code>', '3001', 'Port the server listens on inside the container.'],
], { widths: ['24%', '22%', '54%'] })}
${note('<p>Keep <code>GEMINI_API_KEY</code> and any other secret out of source control and out of chat messages. Set them only in the hosting dashboard or the server\'s <code>.env</code> file.</p>', 'warn')}`,
    },
    {
      title: 'Accounts and passwords',
      html: `
<h3>4.1 Making someone a moderator</h3>
<ol>
<li>Add their email to <code>ADMIN_EMAILS</code> and restart the server.</li>
<li>Set their password on the server. The command asks for the password without showing it, so it never lands in shell history:</li>
</ol>
${code(`# Docker (local or on a VPS)
docker compose exec app node dist/cli/set-password.js moderator@example.org "Moderator Name"

# Without Docker
cd backend && node dist/cli/set-password.js moderator@example.org "Moderator Name"`)}
<p>Give them the password in person or by a secure channel, and ask them to keep it private.</p>
<h3>4.2 Resetting a member's password</h3>
<p>Reset by email does not exist yet; the "Forgot password" screen tells members to contact the team. To help them:</p>
<ol>
<li>Confirm the request really comes from the account holder (for example, by replying to the email address on the account).</li>
<li>Run the same <code>set-password</code> command with their email address and choose a temporary password.</li>
<li>Send it to them through the confirmed channel. Changing a password signs the account out on every device.</li>
</ol>
<h3>4.3 Removing a moderator</h3>
<p>Remove the address from <code>ADMIN_EMAILS</code> and restart. The account becomes an ordinary member account.</p>
<h3>4.4 Requests under POPIA</h3>
<p>Members can download and delete their own data in the app (Account &amp; Privacy). If someone asks the team instead, direct them there, or have the operator act on their behalf after confirming their identity. See BTE-DOC-07.</p>`,
    },
    {
      title: 'Running the system',
      html: `
<h3>5.1 Requirements</h3>
<ul>
<li>Docker (for production and the easiest local setup), or Node.js 24 for development.</li>
<li>A persistent volume of at least 1 GB for <code>/app/data</code> (databases, photos and 7 days of backups).</li>
<li>For a public launch: HTTPS on a permanent address. The hosting platform or a reverse proxy provides it.</li>
</ul>
<h3>5.2 Start with Docker</h3>
${code(`docker build -t backtoeden .
docker compose up -d --no-build
# Web app: http://localhost:8081   API: http://localhost:8081/api/health`)}
<p class="small">On Windows, build with <code>docker build</code> and start with <code>--no-build</code> as shown: <code>docker compose up --build</code> can fail there with a permissions error in the build step.</p>
<h3>5.3 Development</h3>
${code(`cd backend && node node_modules/typescript/bin/tsc -p tsconfig.build.json
cd .. && node dev.mjs            # API on :3001 and web app on :5173
node dev.mjs mobile              # Expo for the phone app`)}
<h3>5.4 Hosting options</h3>
${table(['Option', 'Notes'], [
  ['Railway (or similar container platform)', 'Detects the root Dockerfile. Add a volume mounted at <code>/app/data</code>, set the variables, attach a domain. Needs a paid plan once the trial ends. Steps are in the README.'],
  ['A small VPS', 'Install Docker, copy the project, run the commands in 5.2, and put a reverse proxy (for example Caddy) in front for HTTPS.'],
  ['A PC with a Cloudflare tunnel', 'What is used for demonstrations now. The address changes on every restart and the site is down when the PC is off. Not for production.'],
], { widths: ['30%', '70%'] })}
<h3>5.5 Updating to a new release</h3>
<ol>
<li>Take a backup (section 6.2) or confirm today's snapshot exists.</li>
<li>Build the new image and restart: <code>docker build -t backtoeden .</code> then <code>docker compose up -d --no-build</code>.</li>
<li>Check <code>/api/health</code> and sign in. Database changes are applied automatically at start-up.</li>
</ol>
<h3>5.6 Monitoring</h3>
<ul>
<li><strong>Health:</strong> <code>GET /api/health</code> returns <code>{"ok":true}</code>. Docker marks the container unhealthy after three failed checks.</li>
<li><strong>Logs:</strong> <code>docker compose logs -f app</code>. Look for "Backup failed", "AI_DAILY_LIMIT reached" and repeated 500 errors.</li>
<li><strong>Disk:</strong> watch the size of the data volume; photos are the main growth.</li>
</ul>`,
    },
    {
      title: 'Backups and recovery',
      html: `
<h3>6.1 Automatic backups</h3>
<p>Once a day the server writes a consistent copy of each database to <code>/app/data/backups/YYYY-MM-DD/</code> and deletes copies older than 7 days. A snapshot is written to a temporary folder and renamed when complete, so a half-written backup is never mistaken for a good one.</p>
${note('<p>Backups sit on the <strong>same volume</strong> as the live data. They protect against mistakes and corruption, not against losing the volume. For a production launch, also copy the backups folder off the server regularly (for example to cloud storage), and keep the off-site copies for no longer than the privacy policy allows (30 days).</p>', 'warn')}
<h3>6.2 Taking a copy now</h3>
${code(`docker compose cp app:/app/data ./eden-data-copy`)}
<h3>6.3 Restoring</h3>
<ol>
<li>Stop the server: <code>docker compose stop app</code>.</li>
<li>Copy the chosen backup's <code>.db</code> files over the live ones in <code>/app/data</code> (photos in <code>uploads/</code> are not in the snapshot; keep the current folder).</li>
<li>Delete any <code>-wal</code> and <code>-shm</code> files next to the restored databases.</li>
<li>Start the server and check the health endpoint and a sign-in.</li>
</ol>
<p>Everything created after the backup is lost, and accounts deleted after it come back. If an account deleted since the backup reappears, delete it again to honour the member's request.</p>`,
    },
    {
      title: 'Content maintenance',
      html: `
${table(['Task', 'How'], [
  ['Update prices', 'Edit <code>frontend/src/data/foodDatabase.ts</code> and <code>recipes.ts</code>, then set <code>PRICES_LAST_REVIEWED</code> in <code>data/pricing.ts</code> to the month checked. Rebuild and deploy.'],
  ['Update exchange rates', 'Edit <code>frontend/src/utils/currency.ts</code> and set <code>EXCHANGE_RATES_LAST_REVIEWED</code>.'],
  ['Change the privacy policy', 'Edit <code>frontend/src/content/privacyPolicy.ts</code> and raise <code>PRIVACY_POLICY_VERSION</code> in <code>backend/src/database/auth-db.ts</code>. Every member is then asked to accept the new version.'],
  ['Fix or add translations', 'Edit <code>shared/i18n/strings/&lt;language&gt;.ts</code> (keyed by the English text). Run <code>node scripts/i18n-missing.mjs</code> to list anything missing.'],
  ['Add demo data (testing only)', '<code>node scripts/seed-demo.mjs</code> against a running server. All demo accounts use @example.com.'],
], { widths: ['24%', '76%'] })}
<h3>7.1 Removing the demo data before launch</h3>
<p>Every demo account uses an <code>@example.com</code> address and the demo password set in <code>scripts/seed-demo.mjs</code>. The cleanest removal uses the app's own account deletion, which also removes photos and fasting history: sign in as each demo account and call <code>POST /api/auth/delete-account</code>, or, if the server holds no real data yet, stop it and delete the data volume to start empty.</p>`,
    },
    {
      title: 'Troubleshooting',
      html: `
${table(['Symptom', 'Likely cause', 'What to do'], [
  ['Web app shows "Failed to fetch"', 'The server is not running or not reachable.', 'Check <code>docker compose ps</code> and <code>/api/health</code>; restart the container.'],
  ['Phone app: "Could not reach the server"', 'The phone cannot reach the API address shown at the bottom of the app.', 'On a real phone, use the computer\'s Wi-Fi address, the same network, and a server listening on all interfaces; in production use the HTTPS address.'],
  ['"Too many attempts"', 'A rate limit was hit.', 'Wait 15 minutes (sign-in) or an hour (posting). Limits reset when the server restarts.'],
  ['Sign-in works but everything says "accept the updated privacy policy"', 'The policy version was raised.', 'Expected: the member accepts once.'],
  ['Admin page missing', 'Email not in ADMIN_EMAILS, or server not restarted after changing it.', 'Fix the variable and restart.'],
  ['Leftover assistant always gives the same few recipes', 'No Gemini key, or the daily limit is reached.', 'Set GEMINI_API_KEY, or wait until midnight UTC.'],
  ['Port already in use when starting Docker', 'Another program uses 8081 or 3001.', 'Change the left-hand port in <code>docker-compose.yml</code>.'],
  ['Demo link stopped working', 'The Cloudflare quick tunnel restarted or expired.', 'Restart the tunnel and share the new address.'],
  ['"Backup failed" in the logs', 'Disk full or permissions.', 'Free space on the volume; check the container can write to <code>/app/data</code>.'],
], { widths: ['28%', '32%', '40%'] })}`,
    },
    { title: 'Document control', html: control() },
  ],
};
