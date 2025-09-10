'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import Topbar from '@/components/Topbar';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  const user = auth.getUser();

  return (
    <div style={{display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100dvh'}}>
      <Sidebar />
      <div style={{display:'flex', flexDirection:'column', minHeight:'100dvh'}}>
        <Topbar user={user} />
        <div style={{padding: 24}}>
          {children}
        </div>
      </div>
    </div>
  );
}
