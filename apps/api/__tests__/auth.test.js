import request from 'supertest';
import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';

const mockPoolInstance = { query: jest.fn() };
const MockPool = jest.fn(() => mockPoolInstance);
await jest.unstable_mockModule('pg', () => ({ default: { Pool: MockPool }, Pool: MockPool }));

const { default: app } = await import('../index.js');
const pool = mockPoolInstance;

describe('Authentication routes', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('registers a user successfully', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: '1', name: 'Alice', email: 'alice@example.com', created_at: '2024-01-01' }]
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: '1', name: 'Alice', email: 'alice@example.com', created_at: '2024-01-01' });
    expect(res.body.token).toBeDefined();
  });

  test('rejects duplicate email', async () => {
    pool.query.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('login succeeds with valid credentials', async () => {
    const hash = await bcrypt.hash('password123', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: '1', name: 'Alice', email: 'alice@example.com', password_hash: hash }]
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.token).toBeDefined();
  });

  test('login fails with invalid credentials', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  test('login requires TOTP when enabled', async () => {
    const hash = await bcrypt.hash('password123', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: '1', name: 'Alice', email: 'alice@example.com', password_hash: hash, twofa_secret: 'ABC', twofa_enabled: true }]
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOTP_REQUIRED');
  });

  test('login succeeds with valid TOTP', async () => {
    const hash = await bcrypt.hash('password123', 10);
    const secret = speakeasy.generateSecret().base32;
    const totp = speakeasy.totp({ secret, encoding: 'base32' });
    pool.query.mockResolvedValueOnce({
      rows: [{ id: '1', name: 'Alice', email: 'alice@example.com', password_hash: hash, twofa_secret: secret, twofa_enabled: true }]
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'password123', totp });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.token).toBeDefined();
  });
});

describe('2FA endpoints', () => {
  const token = jwt.sign({ sub: '1', name: 'Alice', email: 'alice@example.com' }, 'devsecret');

  beforeEach(() => {
    pool.query.mockReset();
  });

  test('setup returns secret and qr', async () => {
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.secret).toBeDefined();
    expect(res.body.qr).toMatch(/^data:image/);
  });

  test('verify enables 2FA', async () => {
    const secret = speakeasy.generateSecret().base32;
    const code = speakeasy.totp({ secret, encoding: 'base32' });
    pool.query.mockResolvedValueOnce({ rows: [{ twofa_secret: secret }] });
    pool.query.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: code });

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
  });

  test('disables 2FA', async () => {
    pool.query.mockResolvedValueOnce({});
    const res = await request(app)
      .delete('/auth/2fa')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});
