'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('Entrando...');
    try {
      const body = { email, password: senha };
      if (needsTotp) body.totp = totp;
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      await auth.getUser(true);
      router.replace('/dashboard');
    } catch (e) {
      if (e?.data?.error === 'TOTP_REQUIRED') {
        setNeedsTotp(true);
        setMsg('Informe o código TOTP e tente novamente');
      } else {
        setMsg(e?.data?.error || 'Falha no login');
      }
    }
  }

  return (
    <main style={{display:'grid',placeItems:'center',minHeight:'100vh'}}>
      <form onSubmit={onSubmit} style={{
        width: 380, padding: 24, borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
        border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
      }}>
        <h2 style={{marginTop:0}}>Entrar</h2>
        <label>E-mail</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} required
          style={{width:'100%', padding:10, borderRadius:12, border:'1px solid #cbd5e1', marginBottom:12}}/>
        <label>Senha</label>
        <input value={senha} onChange={e=>setSenha(e.target.value)} type="password" required
          style={{width:'100%', padding:10, borderRadius:12, border:'1px solid #cbd5e1', marginBottom:12}}/>
        {needsTotp && (
          <>
            <label>Código TOTP</label>
            <input value={totp} onChange={e=>setTotp(e.target.value)} required
              style={{width:'100%', padding:10, borderRadius:12, border:'1px solid #cbd5e1', marginBottom:12}}/>
          </>
        )}
        <button type="submit" style={{
          width:'100%', padding:12, borderRadius:12, border:'none', cursor:'pointer',
          background:'#1d4ed8', color:'white', fontWeight:600
        }}>Entrar</button>
        <p style={{marginTop:12, fontSize:13, minHeight:20}}>{msg}</p>
        <p style={{marginTop:12, fontSize:13}}>Novo aqui? <a href="/register">Criar conta</a></p>
      </form>
    </main>
  );
}
