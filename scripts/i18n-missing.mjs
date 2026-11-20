#!/usr/bin/env node
/**
 * Lists text that a language has no hand-written translation for.
 *
 *   node scripts/i18n-missing.mjs              summary for every language
 *   node scripts/i18n-missing.mjs zu           the missing strings for one language
 *   node scripts/i18n-missing.mjs zu --json    the same, as a JSON array (for tooling)
 *
 * Two kinds of text are translated through the dictionaries in
 * shared/i18n/strings/<locale>.ts (used by the web and the Expo app), keyed
 * by the English text:
 *
 *   ui       every t('...') call in frontend/src and in the Expo app (mobile/)
 *   content  the app's own content, shown through t(variable): food, recipe,
 *            fasting-schedule, stage and education text in frontend/src/data,
 *            plus option labels written inside components
 *
 * A missing string is not an error - the app falls back to machine translation
 * (when a Gemini key is set) and then to English - but this is the to-do list.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'frontend', 'src');
const mobileRoot = path.join(repo, 'mobile');
const dictDir = path.join(repo, 'shared', 'i18n', 'strings');
const LOCALES = ['af', 'zu', 'xh', 'nso', 'st', 'tn', 'ss', 'nr', 'ts', 've'];
const CONTENT_FILES = ['data/foodDatabase.ts', 'data/recipes.ts', 'data/fastingSchedules.ts'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'i18n') walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Reads a JS string literal ('...', "..." or a `...` without ${}) starting at index i. */
function readLiteral(src, i) {
  const quote = src[i];
  let value = '';
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') {
      const next = src[j + 1];
      if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(j + 2, j + 6))) {
        value += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
        j += 5;
        continue;
      }
      value += next === 'n' ? '\n' : next;
      j++;
    } else if (quote === '`' && c === '$' && src[j + 1] === '{') return null;
    else if (c === quote) return { value, end: j };
    else value += c;
  }
  return null;
}

/** Text a person reads, as opposed to ids, enum values, paths and codes. */
function isProse(s) {
  const v = s.trim();
  if (v.length < 2) return false;
  if (/^(\/|https?:|data:|#)/.test(v)) return false; // paths, urls, colours
  if (/^[a-z0-9:_.-]+$/.test(v)) return false; // ids and enum values: 'dried-beans', 'protein'
  if (/^[A-Z0-9_]+$/.test(v) && v.length > 1 && !/[AEIOU]/.test(v)) return false; // codes like 'ZAR'
  if (!/[A-Za-z]/.test(v)) return false; // numbers only
  return true;
}

function collect() {
  const keys = new Map(); // text -> { file, kind }
  const add = (text, file, kind) => {
    if (!keys.has(text)) keys.set(text, { file: path.relative(repo, file), kind });
  };

  const mobileFiles = [path.join(mobileRoot, 'App.tsx'), ...walk(path.join(mobileRoot, 'src'))];
  for (const file of [...walk(root), ...mobileFiles]) {
    const src = fs.readFileSync(file, 'utf8');
    // ui: t('...') / t("...")
    const re = /\bt\(\s*(['"])/g;
    let m;
    while ((m = re.exec(src))) {
      const lit = readLiteral(src, m.index + m[0].length - 1);
      if (lit && lit.value.trim()) add(lit.value, file, 'ui');
    }
    // content written inside components: option labels shown through t(variable)
    if (file.includes(`${path.sep}components${path.sep}`) || mobileFiles.includes(file)) {
      const prop = /\b(label|title|name|summary|description|blurb|hint|note)\s*:\s*(['"])/g;
      while ((m = prop.exec(src))) {
        const lit = readLiteral(src, m.index + m[0].length - 1);
        if (lit && isProse(lit.value)) add(lit.value, file, 'content');
      }
    }
  }

  // content: every prose string literal in the data files
  for (const rel of CONTENT_FILES) {
    const file = path.join(root, rel);
    const src = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length)) // block comments
      .replace(/(^|[^:])\/\/.*$/gm, (c, p) => p + ' '.repeat(c.length - p.length)); // line comments
    const re = /(['"`])/g;
    let m;
    while ((m = re.exec(src))) {
      const lit = readLiteral(src, m.index);
      if (!lit) continue;
      re.lastIndex = lit.end + 1;
      // Skip import paths and type-only strings ("'protein' | 'grain'").
      const before = src.slice(Math.max(0, m.index - 30), m.index);
      if (/\bfrom\s*$/.test(before) || /\|\s*$/.test(before)) continue;
      if (isProse(lit.value)) add(lit.value, file, 'content');
    }
  }
  return keys;
}

function dictionary(locale) {
  const src = fs.readFileSync(path.join(dictDir, `${locale}.ts`), 'utf8');
  const keys = new Set();
  const re = /^\s*(['"])/gm;
  let m;
  while ((m = re.exec(src))) {
    const lit = readLiteral(src, m.index + m[0].length - 1);
    if (lit && /^\s*:/.test(src.slice(lit.end + 1))) keys.add(lit.value);
  }
  return keys;
}

const strings = collect();
const [only, flag] = process.argv.slice(2);

if (only) {
  if (!LOCALES.includes(only)) {
    console.error(`Unknown locale "${only}". Use one of: ${LOCALES.join(', ')}`);
    process.exit(1);
  }
  const have = dictionary(only);
  const missing = [...strings].filter(([s]) => !have.has(s));
  if (flag === '--json') {
    console.log(JSON.stringify(missing.map(([s]) => s), null, 1));
  } else {
    console.log(`${only}: ${missing.length} of ${strings.size} strings have no hand-written translation\n`);
    for (const [s, { file, kind }] of missing) console.log(`  [${kind} ${file}] ${JSON.stringify(s)}`);
  }
} else {
  const ui = [...strings.values()].filter((v) => v.kind === 'ui').length;
  console.log(`${strings.size} translatable strings (${ui} interface, ${strings.size - ui} content)\n`);
  for (const locale of LOCALES) {
    const have = dictionary(locale);
    const covered = [...strings.keys()].filter((s) => have.has(s)).length;
    const pct = Math.round((covered / strings.size) * 100);
    console.log(`  ${locale.padEnd(4)} ${String(covered).padStart(5)} / ${strings.size}  (${pct}%)`);
  }
  console.log('\nDetails for one language: node scripts/i18n-missing.mjs <locale>');
}
