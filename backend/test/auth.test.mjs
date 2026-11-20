import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, MODERATOR, PASSWORD } from './helpers.mjs';

let s;
before(async () => (s = await startServer()));
after(async () => s?.stop());

test('registration requires accepting the privacy policy', async () => {
  const res = await s.api('POST', '/api/auth/register', {
    body: { name: 'No Consent', email: 'noconsent@test.example', password: PASSWORD },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /privacy policy/i);
});

test('registration validates email and password length', async () => {
  const bad = await s.api('POST', '/api/auth/register', {
    body: { name: 'A', email: 'not-an-email', password: PASSWORD, acceptedPrivacyPolicy: true },
  });
  assert.equal(bad.status, 400);
  const short = await s.api('POST', '/api/auth/register', {
    body: { name: 'A', email: 'short@test.example', password: '1234567', acceptedPrivacyPolicy: true },
  });
  assert.equal(short.status, 400);
});

test('moderator addresses cannot be registered from the web', async () => {
  const res = await s.api('POST', '/api/auth/register', {
    body: { name: 'Impostor', email: MODERATOR.email, password: PASSWORD, acceptedPrivacyPolicy: true },
  });
  assert.equal(res.status, 409);
});

test('an email can only be registered once', async () => {
  await s.register('Ann', 'ann@test.example');
  const again = await s.api('POST', '/api/auth/register', {
    body: { name: 'Ann 2', email: 'ANN@test.example', password: PASSWORD, acceptedPrivacyPolicy: true },
  });
  assert.equal(again.status, 409);
});

test('sign-in gives a token; wrong password and unknown email look the same', async () => {
  await s.register('Ben', 'ben@test.example');
  const token = await s.login('ben@test.example');
  const me = await s.api('GET', '/api/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'ben@test.example');
  assert.equal(me.body.user.isAdmin, false);

  const wrong = await s.api('POST', '/api/auth/login', { body: { email: 'ben@test.example', password: 'nope-nope' } });
  const unknown = await s.api('POST', '/api/auth/login', { body: { email: 'ghost@test.example', password: 'nope-nope' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.body.message, unknown.body.message);
});

test('the old identity headers are ignored', async () => {
  const res = await s.api('GET', '/api/fasting/state', {
    headers: { 'x-user-key': 'ben@test.example', 'x-user-name': 'Ben' },
  });
  assert.equal(res.status, 401);
  const admin = await s.api('GET', '/api/community/admin/pending', { headers: { 'x-user-key': MODERATOR.email } });
  assert.equal(admin.status, 401);
});

test('a made-up token is rejected', async () => {
  const res = await s.api('GET', '/api/auth/me', { token: 'made-up-token' });
  assert.equal(res.status, 401);
});

test('signing out kills the token', async () => {
  await s.register('Cat', 'cat@test.example');
  const token = await s.login('cat@test.example');
  assert.equal((await s.api('POST', '/api/auth/logout', { token })).status, 200);
  assert.equal((await s.api('GET', '/api/auth/me', { token })).status, 401);
});

test('the moderator signs in with the server-set password and is an admin', async () => {
  const token = await s.login(MODERATOR.email, MODERATOR.password);
  const me = await s.api('GET', '/api/auth/me', { token });
  assert.equal(me.body.user.isAdmin, true);
});

test('repeated wrong passwords lock that account only', async () => {
  await s.register('Dan', 'dan@test.example');
  await s.register('Eve', 'eve@test.example');
  const codes = [];
  for (let i = 0; i < 9; i++) {
    const r = await s.api('POST', '/api/auth/login', { body: { email: 'dan@test.example', password: `guess-${i}xx` } });
    codes.push(r.status);
  }
  assert.deepEqual(codes.slice(0, 8), Array(8).fill(401));
  assert.equal(codes[8], 429);
  // Even the right password is refused while locked...
  const locked = await s.api('POST', '/api/auth/login', { body: { email: 'dan@test.example', password: PASSWORD } });
  assert.equal(locked.status, 429);
  // ...but someone else on the same network can still sign in.
  await s.login('eve@test.example');
});
