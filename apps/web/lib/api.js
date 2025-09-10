import { auth } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path, options = {}) {
  const token = auth.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
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

export async function createCard(data) {
  return apiFetch('/cards', {
    method: 'POST',
    body: JSON.stringify(data),
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
