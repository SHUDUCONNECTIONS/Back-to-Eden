#!/usr/bin/env node
/**
 * Builds the documentation PDFs.
 *
 *   node docs/source/build.mjs            all documents
 *   node docs/source/build.mjs 03         only documents whose file starts 03
 *
 * Each document in docs/source/docs/ is rendered to HTML, then printed to PDF
 * with Microsoft Edge (or Chrome) in headless mode. Output: docs/*.pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { page } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..');
const htmlDir = path.join(here, 'html');
fs.mkdirSync(htmlDir, { recursive: true });

const BROWSERS = [
  process.env.PDF_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);
const browser = BROWSERS.find((b) => fs.existsSync(b));
if (!browser) throw new Error('No Edge or Chrome found. Set PDF_BROWSER to its path.');

const only = process.argv[2];
const files = fs
  .readdirSync(path.join(here, 'docs'))
  .filter((f) => f.endsWith('.mjs') && (!only || f.startsWith(only)))
  .sort();

for (const f of files) {
  const doc = (await import(pathToFileURL(path.join(here, 'docs', f)).href)).default;
  const html = page(doc);
  const htmlFile = path.join(htmlDir, `${doc.slug}.html`);
  fs.writeFileSync(htmlFile, html);
  const pdf = path.join(outDir, `${doc.number} ${doc.title}.pdf`);
  execFileSync(browser, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--print-to-pdf=${pdf}`,
    pathToFileURL(htmlFile).href,
  ], { stdio: 'ignore' });
  const kb = Math.round(fs.statSync(pdf).size / 1024);
  console.log(`${path.basename(pdf)}  (${kb} KB)`);
}
