import { jest } from '@jest/globals';

const hour = 60 * 60 * 1000;

describe('exchange service', () => {
  afterEach(() => {
    delete global.fetch;
    delete process.env.EXCHANGE_API_URL;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('uses env url and returns rate', async () => {
    process.env.EXCHANGE_API_URL = 'https://example.com/latest';
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ rates: { BRL: 4.5 } })
    }));
    const { getRate } = await import('../exchange.js');
    const rate = await getRate('USD', 'BRL');
    expect(rate).toBe(4.5);
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/latest?base=USD&symbols=BRL', expect.any(Object));
    nowSpy.mockRestore();
  });

  test('returns cached rate on failure', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { BRL: 4.5 } })
      })
      .mockRejectedValueOnce(new Error('network'));
    const { getRate } = await import('../exchange.js');
    await getRate('USD', 'BRL');
    nowSpy.mockReturnValue(hour + 1000); // after TTL
    const rate = await getRate('USD', 'BRL');
    expect(rate).toBe(4.5);
    nowSpy.mockRestore();
  });

  test('returns fallback when no cache', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    const { getRate } = await import('../exchange.js');
    const rate = await getRate('USD', 'EUR');
    expect(rate).toBe(1);
  });
});
