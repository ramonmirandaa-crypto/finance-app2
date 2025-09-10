import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { newDb } from 'pg-mem';
import bcrypt from 'bcryptjs';
import { app, ensureSchema, setPool } from '../index.js';

let pool;

test('setup database', async () => {
  const db = newDb();
  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
  setPool(pool);
  await ensureSchema(pool);
});

test('login fails with invalid credentials', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'ghost@example.com', password: 'secret' });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'INVALID_CREDENTIALS');
});

test('login succeeds with valid credentials', async () => {
  const hash = await bcrypt.hash('secret', 10);
  await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3)',
    ['Tester', 'tester@example.com', hash]
  );
  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'tester@example.com', password: 'secret' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.email, 'tester@example.com');
  assert.ok(res.body.token);
});

test('teardown', async () => {
  await pool.end();
});
