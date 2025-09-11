const BASE = process.env.NEXT_PUBLIC_API_URL;

// All authentication tokens are managed via httpOnly cookies. Endpoints such as
// login/register no longer include a token in their JSON responses.
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

export async function getExchangeRate(base, target) {
  return apiFetch(`/exchange/${base}/${target}`);
}

export async function convertCurrency(amount, base, target) {
  if (base === target) return amount;
  const { rate } = await getExchangeRate(base, target);
  return amount * rate;
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

export async function getTransactions() {
  return apiFetch('/transactions');
}

export async function createTransaction(data) {
  return apiFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id, data) {
  return apiFetch(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id) {
  return apiFetch(`/transactions/${id}`, { method: 'DELETE' });
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

export async function updateBudget(id, data) {
  return apiFetch(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBudget(id) {
  return apiFetch(`/budgets/${id}`, { method: 'DELETE' });
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

export async function updateGoal(id, data) {
  return apiFetch(`/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(id) {
  return apiFetch(`/goals/${id}`, { method: 'DELETE' });
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

export async function updateInvestment(id, data) {
  return apiFetch(`/investments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInvestment(id) {
  return apiFetch(`/investments/${id}`, { method: 'DELETE' });
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

export async function getLoans() {
  return apiFetch('/loans');
}

export async function createLoan(data) {
  return apiFetch('/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getLoanPayments(id) {
  return apiFetch(`/loans/${id}/payments`);
}

export async function createLoanPayment(id, data) {
  return apiFetch(`/loans/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getRecurrings() {
  return apiFetch('/recurrings');
}

export async function createRecurring(data) {
  return apiFetch('/recurrings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRecurring(id, data) {
  return apiFetch(`/recurrings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRecurring(id) {
  return apiFetch(`/recurrings/${id}`, { method: 'DELETE' });
}

export async function getSubscriptions() {
  return apiFetch('/subscriptions');
}

export async function createSubscription(data) {
  return apiFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubscription(id, data) {
  return apiFetch(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSubscription(id) {
  return apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
}

export async function getScheduledTransactions() {
  return apiFetch('/scheduled-transactions');
}

export async function createScheduledTransaction(data) {
  return apiFetch('/scheduled-transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteScheduledTransaction(id) {
  return apiFetch(`/scheduled-transactions/${id}`, { method: 'DELETE' });
}

export async function getNotifications() {
  return apiFetch('/notifications');
}

export async function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' });
}
