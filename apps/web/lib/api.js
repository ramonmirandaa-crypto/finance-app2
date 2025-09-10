import { auth } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL;

if (!BASE) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
}

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
