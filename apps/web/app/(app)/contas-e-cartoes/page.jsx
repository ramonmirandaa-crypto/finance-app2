'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCards } from '@/lib/api';

export default function Page() {
  const router = useRouter();
  const [cards, setCards] = useState([]);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.replace('/login');
      return;
    }
    getCards()
      .then((d) => setCards(d.cards))
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <section style={{
      padding: 20, borderRadius: 20,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
      border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{marginTop:0}}>Contas e Cartões</h2>
      {cards.length === 0 ? (
        <p>Nenhum cartão cadastrado.</p>
      ) : (
        <ul>
          {cards.map((c) => (
            <li key={c.id}>**** **** **** {c.number}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
