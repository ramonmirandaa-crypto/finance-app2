import { useState } from 'react';
import Modal from './Modal';
import { createTransaction } from '@/lib/api';

export default function TransactionModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    type: '',
    amount: '',
    currency: '',
    date: '',
    description: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTransaction({
        accountId: form.accountId,
        categoryId: form.categoryId || undefined,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        date: form.date,
        description: form.description || undefined,
      });
      setForm({ accountId: '', categoryId: '', type: '', amount: '', currency: '', date: '', description: '' });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Nova Transação</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input name="accountId" placeholder="Conta" value={form.accountId} onChange={handleChange} required />
        <input name="categoryId" placeholder="Categoria" value={form.categoryId} onChange={handleChange} />
        <input name="type" placeholder="Tipo" value={form.type} onChange={handleChange} required />
        <input name="amount" placeholder="Valor" type="number" value={form.amount} onChange={handleChange} required />
        <input name="currency" placeholder="Moeda" value={form.currency} onChange={handleChange} required />
        <input name="date" placeholder="Data" type="date" value={form.date} onChange={handleChange} required />
        <input name="description" placeholder="Descrição" value={form.description} onChange={handleChange} />
        <button type="submit">Salvar</button>
      </form>
    </Modal>
  );
}
