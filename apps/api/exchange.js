const cache = new Map();
const TTL = 60 * 60 * 1000; // 1h
const API_URL = process.env.EXCHANGE_API_URL ||
  'https://api.exchangerate.host/latest';
const TIMEOUT = 5_000; // 5s

export async function getRate(base, target) {
  const key = `${base}_${target}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.ts < TTL) {
    return cached.rate;
  }

  const url = `${API_URL}?base=${base}&symbols=${target}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('rate fetch failed');
    const data = await res.json();
    const rate = data?.rates?.[target];
    if (typeof rate !== 'number') throw new Error('rate missing');
    cache.set(key, { rate, ts: now });
    return rate;
  } catch {
    if (cached) return cached.rate;
    return 1;
  } finally {
    clearTimeout(timer);
  }
}

export default { getRate };
