import request from 'supertest';
import { newDb } from 'pg-mem';
import { jest } from '@jest/globals';
import { randomUUID } from 'crypto';

const mockDb = newDb();
mockDb.public.registerFunction({ name: 'gen_random_uuid', returns: 'uuid', implementation: randomUUID });

await jest.unstable_mockModule('pg', () => {
  const { Pool } = mockDb.adapters.createPg();
  return { Pool, default: { Pool } };
});

const { default: app, ensureSchema, pool } = await import('../index.js');

beforeAll(async () => {
  await ensureSchema();
});

beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('Auth endpoints', () => {
  it('registers a user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.token).toBeDefined();
  });

  it('rejects invalid registration', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });

  it('prevents duplicate emails', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects invalid login', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects login without credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns profile for valid token', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
    const token = reg.body.token;
    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
  });

  it('requires auth token for /me', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token for /me', async () => {
    const res = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });
});

