import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, MODERATOR, recipe } from './helpers.mjs';

let s, alice, bob, mod;
before(async () => {
  s = await startServer();
  alice = await s.register('Alice', 'alice@test.example');
  bob = await s.register('Bob', 'bob@test.example');
  mod = await s.login(MODERATOR.email, MODERATOR.password);
  // A moderator set up on the server has not accepted the privacy policy yet,
  // so - like everyone - they are held until they do (the web app shows the
  // consent screen on their first sign-in).
  assert.equal((await s.api('GET', '/api/community/admin/pending', { token: mod })).status, 403);
  await s.api('POST', '/api/auth/consent', { token: mod, body: { acceptedPrivacyPolicy: true } });
});
after(async () => s?.stop());

const publicTitles = async () =>
  (await s.api('GET', '/api/community/posts?limit=50')).body.posts.map((p) => p.title);

test('guests can browse but not post', async () => {
  assert.equal((await s.api('GET', '/api/community/posts')).status, 200);
  assert.equal((await s.api('POST', '/api/community/posts', { body: recipe('Guest post') })).status, 401);
});

test('a new post waits for review, and only its author sees it', async () => {
  const res = await s.api('POST', '/api/community/posts', { token: alice, body: recipe('Pending Pap') });
  assert.equal(res.status, 201);
  assert.ok(!(await publicTitles()).includes('Pending Pap'));
  const own = await s.api('GET', '/api/community/posts?limit=50', { token: alice });
  const mine = own.body.posts.find((p) => p.title === 'Pending Pap');
  assert.equal(mine?.status, 'pending');
});

test('only the moderator can see and approve the queue', async () => {
  assert.equal((await s.api('GET', '/api/community/admin/pending', { token: bob })).status, 403);

  const { body } = await s.api('POST', '/api/community/posts', { token: alice, body: recipe('Approved Stew') });
  const queue = await s.api('GET', '/api/community/admin/pending', { token: mod });
  assert.equal(queue.status, 200);
  assert.equal((await s.api('POST', `/api/community/admin/posts/${body.id}/approve`, { token: bob })).status, 403);
  assert.equal((await s.api('POST', `/api/community/admin/posts/${body.id}/approve`, { token: mod })).status, 200);
  assert.ok((await publicTitles()).includes('Approved Stew'));
});

test('people can only delete their own posts and comments', async () => {
  const { body } = await s.api('POST', '/api/community/posts', { token: alice, body: recipe('Alice Only') });
  await s.api('POST', `/api/community/admin/posts/${body.id}/approve`, { token: mod });

  assert.equal((await s.api('DELETE', `/api/community/posts/${body.id}`, { token: bob })).status, 403);

  const c = await s.api('POST', `/api/community/posts/${body.id}/comments`, { token: bob, body: { body: 'Nice one' } });
  assert.equal(c.status, 201);
  const commentId = c.body.comments.find((x) => x.body === 'Nice one').id;
  assert.equal((await s.api('DELETE', `/api/community/comments/${commentId}`, { token: alice })).status, 403);
  assert.equal((await s.api('DELETE', `/api/community/comments/${commentId}`, { token: bob })).status, 200);

  assert.equal((await s.api('DELETE', `/api/community/posts/${body.id}`, { token: alice })).status, 200);
  assert.ok(!(await publicTitles()).includes('Alice Only'));
});

test('likes toggle on and off', async () => {
  const { body } = await s.api('POST', '/api/community/posts', { token: alice, body: recipe('Likeable') });
  await s.api('POST', `/api/community/admin/posts/${body.id}/approve`, { token: mod });
  const on = await s.api('POST', `/api/community/posts/${body.id}/reactions`, { token: bob, body: { kind: 'like' } });
  assert.equal(on.body.active, true);
  const off = await s.api('POST', `/api/community/posts/${body.id}/reactions`, { token: bob, body: { kind: 'like' } });
  assert.equal(off.body.active, false);
});

test('posting is capped at 10 an hour per person', async () => {
  const carol = await s.register('Carol', 'carol@test.example');
  const codes = [];
  for (let i = 0; i < 11; i++) {
    codes.push((await s.api('POST', '/api/community/posts', { token: carol, body: recipe(`Flood ${i}`) })).status);
  }
  assert.deepEqual(codes.slice(0, 10), Array(10).fill(201));
  assert.equal(codes[10], 429);
});
