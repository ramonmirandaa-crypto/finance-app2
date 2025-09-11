'use client';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { auth } from '../lib/auth';

export default function Topbar({ user }) {
  const router = useRouter();

  async function sair() {
    await apiFetch('/auth/logout', { method: 'POST' });
    auth.clear();
    router.replace('/login');
  }

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      position: 'sticky',
      top: 0,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      background: 'rgba(255,255,255,0.55)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      zIndex: 10
    }}>
      <div style={{fontWeight: 700}}>Finance App</div>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <span style={{fontSize:14, opacity:0.8}}>
          {user?.name ? `Olá, ${user.name}` : ''}
        </span>
        <button onClick={sair} style={{
          padding:'8px 12px',
          borderRadius:10,
          border:'1px solid rgba(0,0,0,0.1)',
          background:'#fff',
          cursor:'pointer',
          fontWeight:600
        }}>
          Sair
        </button>
      </div>
    </header>
  );
}
