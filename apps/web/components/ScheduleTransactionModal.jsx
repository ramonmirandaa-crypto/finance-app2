import { useState } from 'react';
import Modal from './Modal';
import { createScheduledTransaction } from '@/lib/api';

export default function ScheduleTransactionModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    type: '',
    amount: '',
    currency: '',
    date: '',
    executeAt: '',
    description: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createScheduledTransaction({
        accountId: form.accountId,
        categoryId: form.categoryId || undefined,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        date: form.date,
        executeAt: form.executeAt,
        description: form.description || undefined,
      });
      setForm({ accountId: '', categoryId: '', type: '', amount: '', currency: '', date: '', executeAt: '', description: '' });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Novo Agendamento</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input name="accountId" placeholder="Conta" value={form.accountId} onChange={handleChange} required />
        <input name="categoryId" placeholder="Categoria" value={form.categoryId} onChange={handleChange} />
        <input name="type" placeholder="Tipo" value={form.type} onChange={handleChange} required />
        <input name="amount" placeholder="Valor" type="number" value={form.amount} onChange={handleChange} required />
        <input name="currency" placeholder="Moeda" value={form.currency} onChange={handleChange} required />
        <input name="date" placeholder="Data" type="date" value={form.date} onChange={handleChange} required />
        <input name="executeAt" placeholder="Executar em" type="datetime-local" value={form.executeAt} onChange={handleChange} required />
        <input name="description" placeholder="Descrição" value={form.description} onChange={handleChange} />
        <button type="submit">Salvar</button>
      </form>
    </Modal>
  );
}
