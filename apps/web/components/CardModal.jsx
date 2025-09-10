import { useState } from 'react';
import Modal from './Modal';
import { createCard } from '@/lib/api';

export default function CardModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ number: '', expiration: '', cvc: '', limit: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCard({
        number: form.number,
        expiration: form.expiration,
        cvc: form.cvc,
        limit: Number(form.limit),
      });
      setForm({ number: '', expiration: '', cvc: '', limit: '' });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Novo Cartão</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input name="number" placeholder="Número" value={form.number} onChange={handleChange} required />
        <input name="expiration" placeholder="Vencimento" value={form.expiration} onChange={handleChange} required />
        <input name="cvc" placeholder="CVC" value={form.cvc} onChange={handleChange} required />
        <input name="limit" placeholder="Limite" type="number" value={form.limit} onChange={handleChange} required />
        <button type="submit">Salvar</button>
      </form>
    </Modal>
  );
}
