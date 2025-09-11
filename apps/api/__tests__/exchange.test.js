import request from 'supertest';
import { jest } from '@jest/globals';

const mockGetRate = jest.fn().mockResolvedValue(4.5);
await jest.unstable_mockModule('../exchange.js', () => ({ getRate: mockGetRate }));

const { default: app } = await import('../index.js');

describe('Exchange rates', () => {
  test('returns rate', async () => {
    const res = await request(app).get('/exchange/USD/BRL');
    expect(res.status).toBe(200);
    expect(res.body.rate).toBe(4.5);
    expect(mockGetRate).toHaveBeenCalledWith('USD', 'BRL');
  });

  test('handles error', async () => {
    mockGetRate.mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).get('/exchange/USD/BRL');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('EXCHANGE_FAILED');
  });
});
