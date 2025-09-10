'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getPluggyLinkToken, getPluggyItems, syncPluggyItem } from '@/lib/api';

export default function Page() {
  const router = useRouter();
  const [items, setItems] = useState([]);

  const load = () => getPluggyItems().then((d) => setItems(d.items));

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.replace('/login');
      return;
    }
    load().catch(() => router.replace('/login'));
  }, [router]);

  const connect = async () => {
    try {
      const { linkToken } = await getPluggyLinkToken();
      window.open(`https://connect.pluggy.ai/?access_token=${linkToken}`, '_blank');
    } catch (e) {}
  };

  const sync = async (id) => {
    await syncPluggyItem(id);
    load();
  };

  return (
    <section style={{
      padding: 20, borderRadius: 20,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
      border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{marginTop:0}}>Integrações (Open Finance)</h2>
      <div style={{marginBottom:12}}>
        <button onClick={connect} style={{
          padding:'10px 14px', borderRadius:12, border:'none',
          background:'#1d4ed8', color:'#fff', fontWeight:700, cursor:'pointer'
        }}>
          Conectar ao Pluggy
        </button>
      </div>
      {items.length === 0 ? (
        <p>Nenhuma integração.</p>
      ) : (
        <ul style={{listStyle:'none', padding:0}}>
          {items.map((it) => (
            <li key={it.id} style={{marginBottom:8, display:'flex', gap:8, alignItems:'center'}}>
              <span>{it.connector} - {it.status}{it.error ? ` (${it.error})` : ''}</span>
              <button onClick={() => sync(it.id)} style={{
                padding:'4px 8px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)', cursor:'pointer'
              }}>
                Sincronizar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
