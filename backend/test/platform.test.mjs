import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer } from './helpers.mjs';

let s;
before(async () => (s = await startServer()));
after(async () => s?.stop({ keepData: false }));

test('health check answers', async () => {
  const res = await s.api('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test('security headers are set and CORS is closed by default', async () => {
  const res = await fetch(`${s.base}/api/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('grocery lists: junk is cleaned, create never overwrites, bad codes are refused', async () => {
  const pushed = await s.api('POST', '/api/sync/TEST-LIST1', {
    body: {
      items: [
        { name: 'x'.repeat(5000), priceZar: -5, quantity: 1e9, checked: 'yes', extra: 'drop me' },
        { name: '' },
        { name: 'Bread', priceZar: 17.499 },
      ],
      budget: 'lots',
    },
  });
  assert.equal(pushed.status, 200);
  const [big, bread] = pushed.body.items;
  assert.equal(pushed.body.items.length, 2);
  assert.equal(big.name.length, 120);
  assert.equal(big.priceZar, 0);
  assert.equal(big.quantity, 999);
  assert.equal(big.checked, false);
  assert.equal('extra' in big, false);
  assert.equal(bread.priceZar, 17.5);
  assert.equal(pushed.body.budget, 500);

  const create = await s.api('POST', '/api/sync/create', { body: { customCode: 'test-list1' } });
  assert.equal(create.body.items.length, 2, 'existing list kept');

  assert.equal((await s.api('GET', '/api/sync/..%2Fetc')).status, 400);
  const fresh = await s.api('POST', '/api/sync/create', { body: {} });
  assert.match(fresh.body.code, /^CART-[A-HJ-NP-Z2-9]{8}$/);
});

test('grocery lists survive a server restart', async () => {
  await s.api('POST', '/api/sync/KEEP-ME-1', { body: { items: [{ name: 'Maize meal' }] } });
  const dataDir = s.dataDir;
  await s.stop({ keepData: true });
  const again = await startServer({ dataDir });
  try {
    const res = await again.api('GET', '/api/sync/KEEP-ME-1');
    assert.equal(res.status, 200);
    assert.equal(res.body.items[0].name, 'Maize meal');
  } finally {
    await again.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
    s = await startServer(); // the remaining tests (and after()) need a running server
  }
});

test('AI: recipe ideas need an account; translation only accepts real languages', async () => {
  assert.equal((await s.api('POST', '/api/ai/recipe-suggest', { body: {} })).status, 401);
  const token = await s.register('Cook', 'cook@test.example');
  const idea = await s.api('POST', '/api/ai/recipe-suggest', { token, body: { availableIngredients: ['beans'] } });
  assert.equal(idea.status, 200);
  assert.equal(idea.body.source, 'curated-fallback', 'no key in tests -> curated recipe');

  assert.equal((await s.api('POST', '/api/translate', { body: { locale: 'xx', strings: ['Hi'] } })).status, 400);
  assert.equal((await s.api('POST', '/api/translate', { body: { locale: 'zu', strings: ['Hi'] } })).status, 200);
});
