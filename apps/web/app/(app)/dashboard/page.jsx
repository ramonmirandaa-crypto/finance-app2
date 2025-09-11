'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    auth.getUser()
      .then(setUser)
      .catch((e) => {
        if (e.status === 401) router.replace('/login');
      });
  }, [router]);

  if (!user) return null;

  return (
    <main style={{minHeight:'100vh', padding:24}}>
      <div style={{
        padding: 20, borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
        border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
      }}>
        <h2 style={{marginTop:0}}>Painel</h2>
        <p>Bem-vindo, <strong>{user.name}</strong> ({user.email}).</p>
        <p>Em breve: saldos, cartões, investimentos, objetivos e Pluggy.</p>
      </div>
    </main>
  );
}
