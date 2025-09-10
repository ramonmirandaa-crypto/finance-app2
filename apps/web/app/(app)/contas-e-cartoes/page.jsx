'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAccounts, getCards } from '@/lib/api';
import AccountModal from '@/components/AccountModal';
import CardModal from '@/components/CardModal';

export default function Page() {
  const router = useRouter();
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const loadAccounts = () =>
    getAccounts().then((d) => setAccounts(d.accounts));

  const loadCards = () =>
    getCards().then((d) => setCards(d.cards));

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.replace('/login');
      return;
    }
    Promise.all([loadAccounts(), loadCards()]).catch(() => router.replace('/login'));
  }, [router]);

  return (
    <section style={{
      padding: 20,
      borderRadius: 20,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{ marginTop: 0 }}>Contas e Cartões</h2>
      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <button onClick={() => setTab('accounts')} disabled={tab === 'accounts'}>
          Contas
        </button>
        <button onClick={() => setTab('cards')} disabled={tab === 'cards'}>
          Cartões
        </button>
      </div>

      {tab === 'accounts' && (
        <div>
          <button onClick={() => setShowAccountModal(true)}>Nova Conta</button>
          {accounts.length === 0 ? (
            <p>Nenhuma conta cadastrada.</p>
          ) : (
            <ul>
              {accounts.map((a) => (
                <li key={a.id}>
                  {a.agency} - ****{a.number.slice(-4)}
                </li>
              ))}
            </ul>
          )}
          <AccountModal
            open={showAccountModal}
            onClose={() => setShowAccountModal(false)}
            onCreated={loadAccounts}
          />
        </div>
      )}

      {tab === 'cards' && (
        <div>
          <button onClick={() => setShowCardModal(true)}>Novo Cartão</button>
          {cards.length === 0 ? (
            <p>Nenhum cartão cadastrado.</p>
          ) : (
            <ul>
              {cards.map((c) => (
                <li key={c.id}>**** **** **** {c.number}</li>
              ))}
            </ul>
          )}
          <CardModal
            open={showCardModal}
            onClose={() => setShowCardModal(false)}
            onCreated={loadCards}
          />
        </div>
      )}
    </section>
  );
}
