import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const mockPoolInstance = { query: jest.fn() };
const MockPool = jest.fn(() => mockPoolInstance);
await jest.unstable_mockModule('pg', () => ({ default: { Pool: MockPool }, Pool: MockPool }));

const { default: app } = await import('../index.js');
const pool = mockPoolInstance;
const token = jwt.sign({ sub: '1', name: 'Alice', email: 'alice@example.com' }, 'devsecret');

describe('Pluggy routes', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('generates link token', async () => {
    const res = await request(app)
      .post('/pluggy/link-token')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.linkToken).toBeDefined();
  });

  test('saves item', async () => {
    pool.query.mockResolvedValueOnce({});
    pool.query.mockResolvedValueOnce({});
    const res = await request(app)
      .post('/pluggy/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemId: 'it1' });
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('lists items', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'it1', connector: 'Mock Bank', status: 'UPDATED', error: null },
      ],
    });
    const res = await request(app)
      .get('/pluggy/items')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  test('sync item', async () => {
    pool.query.mockResolvedValueOnce({});
    const res = await request(app)
      .post('/pluggy/items/it1/sync')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(202);
  });

  test('webhook requires itemId', async () => {
    const res = await request(app).post('/pluggy/webhook').send({});
    expect(res.status).toBe(400);
  });

  test('webhook saves item', async () => {
    pool.query.mockResolvedValue({});
    const res = await request(app)
      .post('/pluggy/webhook')
      .send({ itemId: 'it1' });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
