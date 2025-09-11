'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/auth';

export default function AuthGuard({ children }) {
  const [ok, setOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    auth.getUser()
      .then(() => setOk(true))
      .catch((e) => {
        if (e.status === 401) router.replace('/login');
      });
  }, [router]);

  if (!ok) return null;
  return children;
}
