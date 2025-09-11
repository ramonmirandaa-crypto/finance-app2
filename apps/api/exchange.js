const cache = new Map();
const TTL = 60 * 60 * 1000; // 1h

export async function getRate(base, target) {
  const key = `${base}_${target}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.ts < TTL) {
    return cached.rate;
  }
  const url = `https://api.exchangerate.host/latest?base=${base}&symbols=${target}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('rate fetch failed');
  const data = await res.json();
  const rate = data?.rates?.[target];
  if (typeof rate !== 'number') throw new Error('rate missing');
  cache.set(key, { rate, ts: now });
  return rate;
}

export default { getRate };
