import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, MODERATOR, PASSWORD, TINY_PNG, recipe } from './helpers.mjs';

let s;
before(async () => (s = await startServer()));
after(async () => s?.stop());

test('fasting history is private to each account', async () => {
  const a = await s.register('Faster A', 'fa@test.example');
  const b = await s.register('Faster B', 'fb@test.example');
  assert.equal((await s.api('POST', '/api/fasting/start', { token: a, body: { scheduleId: '16-8', targetHours: 16 } })).status, 200);
  const stopped = await s.api('POST', '/api/fasting/stop', { token: a, body: { note: 'mine' } });
  const sessionId = stopped.body.session.id;

  const bState = await s.api('GET', '/api/fasting/state', { token: b });
  assert.equal(bState.body.totals.sessionCount, 0);
  assert.equal((await s.api('DELETE', `/api/fasting/sessions/${sessionId}`, { token: b })).status, 403);
  assert.equal((await s.api('GET', '/api/fasting/state', { token: a })).body.totals.sessionCount, 1);
});

test('an account that has not accepted the current policy is held at the door', async () => {
  const token = await s.register('Old Timer', 'old@test.example');
  // Simulate someone who registered before consent existed (or before a policy change).
  const db = s.db('auth.db');
  db.prepare('UPDATE users SET policy_version = NULL WHERE email = ?').run('old@test.example');
  db.close();

  assert.equal((await s.api('GET', '/api/auth/me', { token })).body.user.needsConsent, true);
  assert.equal((await s.api('GET', '/api/fasting/state', { token })).status, 403);
  assert.equal((await s.api('POST', '/api/auth/consent', { token, body: {} })).status, 400);
  assert.equal((await s.api('POST', '/api/auth/consent', { token, body: { acceptedPrivacyPolicy: true } })).status, 200);
  assert.equal((await s.api('GET', '/api/fasting/state', { token })).status, 200);
});

test('download my data contains everything, without the password hash', async () => {
  const token = await s.register('Exporter', 'export@test.example');
  await s.api('POST', '/api/community/posts', { token, body: recipe('Exported Recipe') });
  await s.api('POST', '/api/fasting/start', { token, body: { scheduleId: '16-8', targetHours: 16 } });

  const res = await s.api('GET', '/api/auth/export', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.account.email, 'export@test.example');
  assert.ok(res.body.account.privacyPolicyVersion);
  assert.equal(res.body.community.recipes[0].title, 'Exported Recipe');
  assert.equal(res.body.fasting.sessions.length, 1);
  assert.ok(!res.text.includes('scrypt'), 'export must not contain the password hash');
});

test('deleting an account erases every trace, including photo files', async () => {
  const email = 'leaving@test.example';
  const token = await s.register('Leaving', email);
  const other = await s.register('Staying', 'staying@test.example');
  const mod = await s.login(MODERATOR.email, MODERATOR.password);
  await s.api('POST', '/api/auth/consent', { token: mod, body: { acceptedPrivacyPolicy: true } });

  const post = await s.api('POST', '/api/community/posts', { token, body: recipe('Goodbye Soup', { imageDataUrl: TINY_PNG }) });
  const postId = post.body.id;
  const photo = path.join(s.dataDir, 'uploads', path.basename(post.body.post.imageUrl));
  assert.ok(fs.existsSync(photo), 'photo saved');
  await s.api('POST', `/api/community/admin/posts/${postId}/approve`, { token: mod });
  await s.api('POST', `/api/community/posts/${postId}/comments`, { token: other, body: { body: 'on their post' } });
  await s.api('POST', '/api/community/report', { token, body: { targetType: 'post', targetId: postId, reason: 'test' } });
  await s.api('POST', '/api/fasting/start', { token, body: { scheduleId: '16-8', targetHours: 16 } });

  // Wrong password: nothing happens, still signed in.
  assert.equal((await s.api('POST', '/api/auth/delete-account', { token, body: { password: 'wrong-one' } })).status, 401);
  assert.equal((await s.api('GET', '/api/auth/me', { token })).status, 200);

  const del = await s.api('POST', '/api/auth/delete-account', { token, body: { password: PASSWORD } });
  assert.equal(del.status, 200);
  assert.deepEqual(del.body.removed, { recipes: 1, photos: 1, fastingSessions: 1 });

  assert.equal((await s.api('GET', '/api/auth/me', { token })).status, 401);
  assert.equal((await s.api('POST', '/api/auth/login', { body: { email, password: PASSWORD } })).status, 401);
  assert.ok(!fs.existsSync(photo), 'photo file removed');

  const count = (file, sql, ...args) => {
    const db = s.db(file);
    const n = db.prepare(sql).get(...args).n;
    db.close();
    return n;
  };
  assert.equal(count('auth.db', 'SELECT count(*) n FROM users WHERE email = ?', email), 0);
  assert.equal(count('auth.db', 'SELECT count(*) n FROM sessions WHERE email = ?', email), 0);
  assert.equal(count('community.db', 'SELECT count(*) n FROM posts WHERE author_key = ?', email), 0);
  assert.equal(count('community.db', 'SELECT count(*) n FROM comments WHERE post_id = ?', postId), 0);
  assert.equal(count('community.db', 'SELECT count(*) n FROM reports WHERE reporter_key = ?', email), 0);
  assert.equal(count('fasting.db', 'SELECT count(*) n FROM fasting_sessions WHERE user_key = ?', email), 0);
});
