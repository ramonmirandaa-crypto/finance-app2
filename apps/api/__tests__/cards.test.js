import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const mockPoolInstance = { query: jest.fn() };
const MockPool = jest.fn(() => mockPoolInstance);
await jest.unstable_mockModule('pg', () => ({ default: { Pool: MockPool }, Pool: MockPool }));

const { default: app } = await import('../index.js');
const pool = mockPoolInstance;
const token = jwt.sign({ sub: '1', name: 'Alice', email: 'alice@example.com' }, 'devsecret');

describe('Cards routes', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/cards');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_MISSING');
  });

  test('lists cards', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'c1', number: '1234', expiration: '12/25', limit: 500 }]
    });

    const res = await request(app)
      .get('/cards')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(1);
  });

  test('creates card successfully', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 'c1', number: '1234', expiration: '12/25', limit: 500 }]
    });

    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ number: '4111111111111111', expiration: '12/25', limit: 500 });

    expect(res.status).toBe(201);
    expect(res.body.card.id).toBe('c1');
  });

  test('fails to create card with invalid body', async () => {
    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ number: '4111111111111111' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  test('returns not found for missing card', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/cards/unknown')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});
