/**
 * Sets (or resets) an account's password from the server.
 *
 * This is the only way to give a moderator (an ADMIN_EMAILS address) a
 * password: those addresses cannot be registered from the web, because email
 * addresses are not verified yet. It also works as a manual password reset for
 * any user until reset-by-email exists. Changing a password signs that account
 * out everywhere.
 *
 *   Local:   node dist/cli/set-password.js you@example.com "Your Name"
 *   Docker:  docker compose exec app node dist/cli/set-password.js you@example.com "Your Name"
 *
 * The password is asked for interactively so it never lands in shell history.
 * For scripts, pipe it in on stdin instead.
 */

import * as readline from 'node:readline';
import {
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  normaliseEmail,
  setPassword,
} from '../database/auth-db';

function ask(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden && process.stdin.isTTY) {
      // Print the prompt, then swallow the typed characters.
      const write = (rl as any)._writeToOutput?.bind(rl);
      (rl as any)._writeToOutput = (s: string) => {
        if (s.includes(question)) write?.(s);
        else if (s.includes('\n') || s.includes('\r')) write?.('\n');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function readStdin(): Promise<string> {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data.split(/\r?\n/)[0];
}

async function main() {
  const email = normaliseEmail(process.argv[2]);
  const name = process.argv[3] || '';

  if (!isValidEmail(email)) {
    console.error('Usage: node dist/cli/set-password.js <email> ["Display Name"]');
    process.exit(1);
  }

  let password: string;
  if (process.stdin.isTTY) {
    password = await ask(`New password for ${email}: `, true);
    const again = await ask('Type it again: ', true);
    if (password !== again) {
      console.error('Passwords do not match. Nothing changed.');
      process.exit(1);
    }
  } else {
    password = await readStdin();
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters. Nothing changed.`);
    process.exit(1);
  }

  const user = await setPassword(email, name, password);
  console.log(`Password set for ${user.email} (${user.name}). Any existing sessions were signed out.`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
