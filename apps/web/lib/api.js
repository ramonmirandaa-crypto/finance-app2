const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const csrfMatch = typeof document !== 'undefined'
    ? document.cookie
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('csrfToken='))
    : null;
  if (csrfMatch) headers['x-csrf-token'] = csrfMatch.slice('csrfToken='.length);
  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || 'REQUEST_FAILED');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function getMe() {
  return apiFetch('/me');
}

export async function getCards() {
  return apiFetch('/cards');
}

export async function getAccounts() {
  return apiFetch('/accounts');
}

export async function createAccount(data) {
  return apiFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createCard({ number, expiration, limit }) {
  return apiFetch('/cards', {
    method: 'POST',
    body: JSON.stringify({ number, expiration, limit }),
  });
}

export async function getPluggyLinkToken() {
  return apiFetch('/pluggy/link-token', { method: 'POST' });
}

export async function getPluggyItems() {
  return apiFetch('/pluggy/items');
}

export async function syncPluggyItem(id) {
  return apiFetch(`/pluggy/items/${id}/sync`, { method: 'POST' });
}

export async function getPluggyAccounts() {
  return apiFetch('/pluggy/accounts');
}

export async function getPluggyTransactions() {
  return apiFetch('/pluggy/transactions');
}

export async function getCategories() {
  return apiFetch('/categories');
}

export async function createCategory(data) {
  return apiFetch('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBudgets() {
  return apiFetch('/budgets');
}

export async function createBudget(data) {
  return apiFetch('/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getGoals() {
  return apiFetch('/goals');
}

export async function createGoal(data) {
  return apiFetch('/goals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getInvestments() {
  return apiFetch('/investments');
}

export async function createInvestment(data) {
  return apiFetch('/investments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReports() {
  return apiFetch('/reports');
}

export async function createReport(data) {
  return apiFetch('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function setup2fa() {
  return apiFetch('/auth/2fa/setup', { method: 'POST' });
}

export async function verify2fa(token) {
  return apiFetch('/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
