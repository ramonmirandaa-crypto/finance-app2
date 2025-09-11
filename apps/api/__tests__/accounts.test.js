import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const mockPoolInstance = { query: jest.fn() };
const MockPool = jest.fn(() => mockPoolInstance);
await jest.unstable_mockModule('pg', () => ({ default: { Pool: MockPool }, Pool: MockPool }));

const { default: app } = await import('../index.js');
const pool = mockPoolInstance;
const token = jwt.sign({ sub: '1', name: 'Alice', email: 'alice@example.com' }, 'devsecret');
const csrf = 'test-csrf';

describe('Accounts routes', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/accounts');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_MISSING');
  });

  test('lists accounts', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'a1', agency: '001', number: '1234', manager: 'Bob', phone: '9999' }]
    });

    const res = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf);

    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(1);
  });

  test('creates account successfully', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'a1', agency: '001', number: '1234', manager: 'Bob', phone: '9999' }]
    });

    const res = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf)
      .send({ agency: '001', number: '1234', manager: 'Bob', phone: '9999' });

    expect(res.status).toBe(201);
    expect(res.body.account.id).toBe('a1');
  });

  test('fails to create account with invalid body', async () => {
    const res = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf)
      .send({ agency: '001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  test('returns not found for missing account', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/accounts/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});
