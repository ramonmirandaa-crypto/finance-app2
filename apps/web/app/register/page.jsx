'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('Criando conta...');
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: nome, email, password: senha })
      });
      auth.save();
      router.replace('/dashboard');
    } catch (e) {
      setMsg(e?.data?.error || 'Falha no registro');
    }
  }

  return (
    <main style={{display:'grid',placeItems:'center',minHeight:'100vh'}}>
      <form onSubmit={onSubmit} style={{
        width: 420, padding: 24, borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
        border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
      }}>
        <h2 style={{marginTop:0}}>Criar Conta</h2>
        <label>Nome</label>
        <input value={nome} onChange={e=>setNome(e.target.value)} required
          style={{width:'100%', padding:10, borderRadius:12, border:'1px solid #cbd5e1', marginBottom:12}}/>
        <label>E-mail</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} required
          style={{width:'100%', padding:10, borderRadius:12, border:'1px solid #cbd5e1', marginBottom:12}}/>
        <label>Senha</label>
        <input value={senha} onChange={e=>setSenha(e.target.value)} type="password" required
          style={{width:'100%', padding:10, borderRadius:12, border:'1px solid #cbd5e1', marginBottom:12}}/>
        <button type="submit" style={{
          width:'100%', padding:12, borderRadius:12, border:'none', cursor:'pointer',
          background:'#1d4ed8', color:'white', fontWeight:600
        }}>Criar</button>
        <p style={{marginTop:12, fontSize:13, minHeight:20}}>{msg}</p>
        <p style={{marginTop:12, fontSize:13}}>Já tem conta? <a href="/login">Entrar</a></p>
      </form>
    </main>
  );
}
