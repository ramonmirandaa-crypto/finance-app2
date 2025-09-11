'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMe, setup2FA, verify2FA, disable2FA } from '@/lib/api';

export default function Page() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [qr, setQr] = useState(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.replace('/login');
      return;
    }
    getMe()
      .then((d) => setEnabled(Boolean(d.user?.twofa_enabled)))
      .catch(() => router.replace('/login'));
  }, [router]);

  const startSetup = async () => {
    const d = await setup2FA();
    setQr(d.qr);
    setMsg('');
  };

  const onVerify = async (e) => {
    e.preventDefault();
    try {
      await verify2FA(code);
      setEnabled(true);
      setQr(null);
      setCode('');
      setMsg('2FA ativado');
    } catch (e) {
      setMsg('Código inválido');
    }
  };

  const onDisable = async () => {
    await disable2FA();
    setEnabled(false);
    setQr(null);
    setCode('');
  };

  return (
    <section style={{
      padding: 20, borderRadius: 20,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
      border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{marginTop:0}}>Configurações de 2FA</h2>
      {enabled ? (
        <div>
          <p>2FA está ativado.</p>
          <button onClick={onDisable} style={{
            padding:'8px 12px', border:'none', borderRadius:8, cursor:'pointer',
            background:'#dc2626', color:'#fff'
          }}>Desativar</button>
        </div>
      ) : (
        <div>
          {qr ? (
            <form onSubmit={onVerify}>
              <img src={qr} alt="QR Code" style={{marginBottom:12}}/>
              <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Código" required
                style={{width:'100%', padding:10, borderRadius:12, border:'1px solid #cbd5e1', marginBottom:12}}/>
              <button type="submit" style={{
                padding:'8px 12px', border:'none', borderRadius:8, cursor:'pointer',
                background:'#1d4ed8', color:'#fff'
              }}>Verificar</button>
            </form>
          ) : (
            <button onClick={startSetup} style={{
              padding:'8px 12px', border:'none', borderRadius:8, cursor:'pointer',
              background:'#1d4ed8', color:'#fff'
            }}>Ativar 2FA</button>
          )}
          {msg && <p style={{marginTop:12}}>{msg}</p>}
        </div>
      )}
    </section>
  );
}

