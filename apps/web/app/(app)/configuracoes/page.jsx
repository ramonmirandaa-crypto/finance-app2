'use client';
import { useState } from 'react';
import { setup2fa, verify2fa } from '@/lib/api';

export default function ConfiguracoesPage() {
  const [qr, setQr] = useState('');
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');

  const start = async () => {
    try {
      const { qrcode } = await setup2fa();
      setQr(qrcode);
      setMsg('');
    } catch {
      setMsg('Falha ao gerar QR code');
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    try {
      await verify2fa(token);
      setMsg('2FA habilitado!');
    } catch {
      setMsg('Código inválido');
    }
  };

  return (
    <section style={{
      padding:20, borderRadius:20,
      background:'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
      border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 10px 30px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{marginTop:0}}>Configurações</h2>
      {qr ? (
        <form onSubmit={onVerify} style={{display:'flex', flexDirection:'column', gap:12, maxWidth:260}}>
          <img src={qr} alt="QR Code" style={{width:200, height:200, alignSelf:'center'}} />
          <input value={token} onChange={e=>setToken(e.target.value)} required placeholder="Token"
            style={{padding:10, borderRadius:12, border:'1px solid #cbd5e1'}}/>
          <button type="submit" style={{
            padding:'10px 14px', borderRadius:12, border:'none', cursor:'pointer',
            background:'#1d4ed8', color:'#fff', fontWeight:700
          }}>Verificar</button>
          {msg && <p style={{fontSize:13}}>{msg}</p>}
        </form>
      ) : (
        <button onClick={start} style={{
          padding:'10px 14px', borderRadius:12, border:'none', cursor:'pointer',
          background:'#1d4ed8', color:'#fff', fontWeight:700
        }}>Gerar QR Code</button>
      )}
    </section>
  );
}
