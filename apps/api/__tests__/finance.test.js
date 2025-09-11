import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const mockPoolInstance = { query: jest.fn() };
const MockPool = jest.fn(() => mockPoolInstance);
await jest.unstable_mockModule('pg', () => ({ default: { Pool: MockPool }, Pool: MockPool }));

const { app } = await import('../index.js');
const pool = mockPoolInstance;
const token = jwt.sign({ sub: '1', name: 'Alice', email: 'alice@example.com' }, 'devsecret');
const csrf = 'test-csrf';

describe('Finance modules', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('creates category', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Food' }] });
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf)
      .send({ name: 'Food' });
    expect(res.status).toBe(201);
    expect(res.body.category.id).toBe('c1');
  });

  test('creates budget', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'b1', categoryId: 'c1', amount: 100, currency: 'USD' }] });
    const res = await request(app)
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf)
      .send({ categoryId: '00000000-0000-0000-0000-000000000000', amount: 100, currency: 'USD' });
    expect(res.status).toBe(201);
    expect(res.body.budget.id).toBe('b1');
  });

  test('creates goal', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'g1', name: 'Save', target: 1000, currency: 'BRL' }] });
    const res = await request(app)
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf)
      .send({ name: 'Save', target: 1000, currency: 'BRL' });
    expect(res.status).toBe(201);
    expect(res.body.goal.id).toBe('g1');
  });

  test('creates investment', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'i1', description: 'Stock', amount: 50, currency: 'USD' }] });
    const res = await request(app)
      .post('/investments')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf)
      .send({ description: 'Stock', amount: 50, currency: 'USD' });
    expect(res.status).toBe(201);
    expect(res.body.investment.id).toBe('i1');
  });

  test('creates report', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'r1', name: 'Report', data: {} }] });
    const res = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf)
      .send({ name: 'Report' });
    expect(res.status).toBe(201);
    expect(res.body.report.id).toBe('r1');
  });
});
