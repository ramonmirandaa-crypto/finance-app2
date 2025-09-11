'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTransactions, getRecurrings } from '@/lib/api';
import TransactionModal from '@/components/TransactionModal';
import RecurringTransactionModal from '@/components/RecurringTransactionModal';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [recurrings, setRecurrings] = useState([]);
  const [open, setOpen] = useState(false);
  const [openRecurring, setOpenRecurring] = useState(false);

  useEffect(() => {
    auth
      .getUser()
      .then((u) => {
        setUser(u);
        return Promise.all([getTransactions(), getRecurrings()]);
      })
      .then(([t, r]) => {
        setTransactions(t.transactions);
        setRecurrings(r.recurrings);
      })
      .catch((e) => {
        if (e.status === 401) router.replace('/login');
      });
  }, [router]);

  const refresh = () =>
    Promise.all([getTransactions(), getRecurrings()]).then(([t, r]) => {
      setTransactions(t.transactions);
      setRecurrings(r.recurrings);
    });

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
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => setOpen(true)}>Nova Transação</button>
          <button onClick={() => setOpenRecurring(true)}>Nova Recorrência</button>
        </div>
        <ul>
          {transactions.map((t) => (
            <li key={t.id}>
              {t.description || t.type} - {t.amount} {t.currency}
            </li>
          ))}
        </ul>
        <h4>Recorrências</h4>
        <ul>
          {recurrings.map((r) => (
            <li key={r.id}>
              {r.description || r.type} - {r.amount} {r.currency} a cada {r.intervalDays} dias
            </li>
          ))}
        </ul>
      </div>
      <TransactionModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={refresh}
      />
      <RecurringTransactionModal
        open={openRecurring}
        onClose={() => setOpenRecurring(false)}
        onCreated={refresh}
      />
    </main>
  );
}
