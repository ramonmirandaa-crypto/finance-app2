'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function Page() {
  const [connectors, setConnectors] = useState([]);
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const { connectors } = await apiFetch('/pluggy/connectors');
      setConnectors(connectors || []);
      const { items } = await apiFetch('/pluggy/items');
      setItems(items || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function connect() {
    try {
      const { accessToken } = await apiFetch('/pluggy/link-token', { method: 'POST' });
      alert(`Link token: ${accessToken}`);
    } catch (e) {
      console.error(e);
    }
  }

  async function sync(id) {
    try {
      await apiFetch(`/pluggy/items/${id}/sync`, { method: 'POST' });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <section style={{
      padding: 20,
      borderRadius: 20,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{ marginTop: 0 }}>Integrações (Open Finance)</h2>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={connect}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: 'none',
            background: '#1d4ed8',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Conectar ao Pluggy
        </button>
      </div>
      <h3>Connectores</h3>
      <ul>
        {connectors.map(c => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <h3>Itens Conectados</h3>
      <ul>
        {items.map(item => (
          <li key={item.id} style={{ marginBottom: 8 }}>
            {item.connector_id} - {item.status}
            <button
              onClick={() => sync(item.id)}
              style={{ marginLeft: 8 }}
            >
              Sincronizar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

