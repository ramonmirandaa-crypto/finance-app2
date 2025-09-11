'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  getPluggyItems,
  getPluggyAccounts,
  getPluggyTransactions,
  syncPluggyItem,
} from '@/lib/api';

export default function Page() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const loadAll = () =>
    Promise.all([
      getPluggyItems().then((d) => setItems(d.items)),
      getPluggyAccounts().then((d) => setAccounts(d.accounts)),
      getPluggyTransactions().then((d) => setTransactions(d.transactions)),
    ]);

  useEffect(() => {
    const init = async () => {
      try {
        await auth.getUser();
        await loadAll();
      } catch (e) {
        if (e.status === 401) router.replace('/login');
      }
    };
    init();
  }, [router]);

  const handleSync = async (id) => {
    await syncPluggyItem(id);
    await loadAll();
  };

  return (
    <section
      style={{
        padding: 20,
        borderRadius: 20,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Contas e Transações</h2>

      <h3>Itens</h3>
      {items.length === 0 ? (
        <p>Nenhum item conectado.</p>
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              {i.connector} - {i.status}
              <button style={{ marginLeft: 10 }} onClick={() => handleSync(i.id)}>
                Sincronizar
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>Contas</h3>
      {accounts.length === 0 ? (
        <p>Nenhuma conta encontrada.</p>
      ) : (
        <ul>
          {accounts.map((a) => (
            <li key={a.id}>
              {a.name} - {a.balance} {a.currency}
            </li>
          ))}
        </ul>
      )}

      <h3>Transações</h3>
      {transactions.length === 0 ? (
        <p>Nenhuma transação encontrada.</p>
      ) : (
        <ul>
          {transactions.map((t) => (
            <li key={t.id}>
              {t.description} - {t.amount} {t.currency}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
