'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAccounts, getCards } from '@/lib/api';
import AccountModal from '@/components/AccountModal';
import CardModal from '@/components/CardModal';

export default function Page() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCards = async () => {
    try {
      const data = await getCards();
      setCards(data.cards || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await auth.getUser();
        await Promise.all([loadAccounts(), loadCards()]);
      } catch (e) {
        if (e.status === 401) router.replace('/login');
      }
    };
    init();
  }, [router]);

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
      <h2 style={{ marginTop: 0 }}>Contas e Cartões</h2>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Contas</h3>
          <button onClick={() => setAccountOpen(true)}>Nova Conta</button>
        </div>
        {accounts.length === 0 ? (
          <p>Nenhuma conta cadastrada.</p>
        ) : (
          <ul>
            {accounts.map((a) => (
              <li key={a.id}>
                Agência {a.agency} - Conta {a.number}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Cartões</h3>
          <button onClick={() => setCardOpen(true)}>Novo Cartão</button>
        </div>
        {cards.length === 0 ? (
          <p>Nenhum cartão cadastrado.</p>
        ) : (
          <ul>
            {cards.map((c) => (
              <li key={c.id}>
                Cartão {c.number} - Vencimento {c.expiration} - Limite {c.limit}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onCreated={loadAccounts}
      />
      <CardModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        onCreated={loadCards}
      />
    </section>
  );
}

