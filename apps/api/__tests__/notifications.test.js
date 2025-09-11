import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const mockPoolInstance = { query: jest.fn() };
const MockPool = jest.fn(() => mockPoolInstance);
await jest.unstable_mockModule('pg', () => ({ default: { Pool: MockPool }, Pool: MockPool }));

const { default: app } = await import('../index.js');
const pool = mockPoolInstance;

const token = jwt.sign({ sub: 'user-id' }, 'devsecret');
const csrf = 'csrf123';

describe('Notifications', () => {
  beforeEach(() => pool.query.mockReset());

  it('lists notifications', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: '1', type: 'budget_exceeded', message: 'Orçamento excedido', read_at: null }] });
    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf);
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      `SELECT id, type, message, read_at AS "readAt" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      ['user-id']
    );
    expect(res.body.notifications).toHaveLength(1);
  });

  it('marks notification as read', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app)
      .post('/notifications/1/read')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `csrfToken=${csrf}`)
      .set('x-csrf-token', csrf);
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
      ['1', 'user-id']
    );
  });
});
