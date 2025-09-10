'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/auth';

export default function AuthGuard({ children }) {
  const [ok, setOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = auth.get();
    if (!t) router.replace('/login');
    else setOk(true);
  }, [router]);

  if (!ok) return null;
  return children;
}
