import { test, before, after } from 'node:test';
import assert from 'node:assert';

let server;
let baseUrl;

before(async () => {
  const mod = await import('../index.js');
  await mod.ensureSchema();
  server = mod.app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('authentication flow', async (t) => {
  let token;

  await t.test('register valid data', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.token);
  });

  await t.test('reject duplicate email', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret'
      })
    });
    assert.strictEqual(res.status, 409);
  });

  await t.test('login with correct credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'secret' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    token = body.token;
  });

  await t.test('login with incorrect credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'wrong' })
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test('protected route requires token', async () => {
    let res = await fetch(`${baseUrl}/me`);
    assert.strictEqual(res.status, 401);

    res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.user.email, 'alice@example.com');
  });
});
