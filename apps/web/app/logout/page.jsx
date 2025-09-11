'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    async function doLogout() {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch (e) {
        // ignore errors
      }
      auth.clearLocal();
      router.replace('/login');
    }
    doLogout();
  }, [router]);
  return null;
}
