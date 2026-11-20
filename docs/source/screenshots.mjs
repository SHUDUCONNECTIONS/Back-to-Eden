#!/usr/bin/env node
/**
 * Captures screenshots of the running web app for the User Guide.
 *
 *   node docs/source/screenshots.mjs [http://localhost:8081]
 *
 * Needs the app running with demo data (scripts/seed-demo.mjs). Drives
 * headless Edge/Chrome over the DevTools protocol: signs in as the demo
 * account, clicks through the side menu and saves PNGs to docs/source/img/.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:8081';
const here = path.dirname(fileURLToPath(import.meta.url));
const IMG = path.join(here, 'img');
fs.mkdirSync(IMG, { recursive: true });

const BROWSERS = [
  process.env.PDF_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);
const browserPath = BROWSERS.find((b) => fs.existsSync(b));
const PORT = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eden-shots-'));
const browser = spawn(browserPath, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

const CARD = { x: 430, y: 40, width: 420, height: 740 }; // the sign-in card, in CSS pixels at 1280 wide
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Browser did not start');
}

const ws = new WebSocket(await target());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) =>
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result))),
  );
}
async function js(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
  return r.result.value;
}
async function size(width, height, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1.5, mobile });
}
async function go(url) {
  await send('Page.navigate', { url });
  await sleep(2500);
}
/** Clicks the first visible button or link whose text matches. */
async function click(text, { exact = false, within = 'button, a, [role=button]' } = {}) {
  const ok = await js(`(() => {
    const want = ${JSON.stringify(text)}.toLowerCase();
    const els = [...document.querySelectorAll(${JSON.stringify(within)})].filter((e) => e.offsetParent !== null);
    const el = els.find((e) => { const t = (e.innerText || e.getAttribute('aria-label') || '').trim().toLowerCase();
      return ${exact} ? t === want : t.includes(want); });
    if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
  if (!ok) console.warn(`  (no "${text}" to click)`);
  await sleep(1200);
  return ok;
}
async function top() {
  await js('window.scrollTo(0, 0); document.querySelectorAll("main, [class*=overflow-y-auto]").forEach((e) => (e.scrollTop = 0)); true');
  await sleep(300);
}
async function shot(name, clip) {
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 86, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
  fs.writeFileSync(path.join(IMG, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log(`  ${name}.jpg`);
}

await send('Page.enable');
await send('Runtime.enable');

// Sign in through the API, then hand the session to the page the way the app stores it.
const login = await (await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@example.com', password: process.env.DEMO_PASSWORD || 'eden-demo-2026' }),
})).json();
if (!login.token) throw new Error('Demo sign-in failed. Run scripts/seed-demo.mjs first.');
const stored = JSON.stringify({ name: login.user.name, email: login.user.email, isGuest: false, token: login.token });

try {
  await size(1280, 820);

  // Guest: sign-in page first.
  await go(BASE);
  await js('localStorage.clear(); true');
  await go(BASE);
  await shot('01-welcome', CARD);
  await click('Sign Up', { exact: true });
  await shot('02-sign-up', CARD);

  // Signed in.
  await js(`localStorage.setItem('back_to_eden_user', ${JSON.stringify(stored)}); localStorage.setItem('nourish_locale', 'en'); true`);
  await go(BASE);
  await shot('03-community');
  await click('Photo & recipe');
  await shot('04-composer');
  await go(BASE);

  for (const [label, name] of [
    ['Fasting Journey', '05-fasting'],
    ['Budget Planner', '06-budget'],
    ['Ingredient Shelf', '07-shelf'],
    ['Nutritious Recipes', '08-recipes'],
    ['Leftover Assistant', '09-leftovers'],
    ['Grocery List', '10-grocery'],
    ['Account & Privacy', '11-account'],
  ]) {
    await click(label);
    await top();
    await shot(name);
  }

  // The same app in isiZulu.
  await js(`localStorage.setItem('nourish_locale', 'zu'); true`);
  await go(BASE);
  await sleep(1500);
  await shot('12-isizulu');
  await js(`localStorage.setItem('nourish_locale', 'en'); true`);

  // Phone-sized browser.
  await size(390, 844, true);
  await go(BASE);
  await shot('13-phone-web');
} finally {
  ws.close();
  browser.kill();
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
