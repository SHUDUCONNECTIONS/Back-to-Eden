/**
 * schema.sql is generated from the code. This fails if someone changed a
 * table in src/database without regenerating it (npm run schema).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSchema } from '../scripts/schema.mjs';

const SCHEMA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'schema.sql');

test('schema.sql matches the schema the code creates', () => {
  const onDisk = fs.readFileSync(SCHEMA, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(onDisk, generateSchema(), 'schema.sql is out of date: run "npm run build && npm run schema"');
});
