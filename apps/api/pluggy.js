const BASE_URL = process.env.PLUGGY_BASE_URL || "https://api.pluggy.ai";

const clientId = process.env.PLUGGY_CLIENT_ID;
const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

let accessTokenCache = null;
const stored = {
  connectTokens: [],
  itemIds: [],
  accountIds: [],
};

async function getAccessToken() {
  if (accessTokenCache) return accessTokenCache;
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const data = await res.json();
  accessTokenCache = data.accessToken || data.access_token;
  return accessTokenCache;
}

export async function createConnectToken() {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/connect_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (data.connectToken) stored.connectTokens.push(data.connectToken);
  return data;
}

export async function fetchAccounts(itemId) {
  const token = await getAccessToken();
  stored.itemIds.push(itemId);
  const res = await fetch(`${BASE_URL}/items/${itemId}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (Array.isArray(data.results)) {
    stored.accountIds.push(...data.results.map((acc) => acc.id));
  }
  return data.results || [];
}

export async function fetchTransactions(accountId) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.results || [];
}

export { stored };

