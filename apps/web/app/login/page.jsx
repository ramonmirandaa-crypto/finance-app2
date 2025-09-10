'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('Entrando...');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: senha })
      });
      auth.save(data.token);
      router.replace('/dashboard');
    } catch (e) {
      setMsg(e?.data?.error || 'Falha no login');
    }
  }

  return (
    <main className={styles.main}>
      <form onSubmit={onSubmit} className={styles.form}>
        <h2 className={styles.title}>Entrar</h2>
        <label>E-mail</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />
        <label>Senha</label>
        <input
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          type="password"
          required
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          Entrar
        </button>
        <p className={styles.message}>{msg}</p>
        <p className={styles.signup}>
          Novo aqui? <a href="/register">Criar conta</a>
        </p>
      </form>
    </main>
  );
}
