'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/auth';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    auth.clear();
    router.replace('/login');
  }, [router]);
  return null;
}
