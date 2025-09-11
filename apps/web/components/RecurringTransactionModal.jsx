import { useState } from 'react';
import Modal from './Modal';
import { createRecurring } from '@/lib/api';

export default function RecurringTransactionModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    type: '',
    amount: '',
    currency: '',
    intervalDays: '',
    nextOccurrence: '',
    description: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createRecurring({
        accountId: form.accountId,
        categoryId: form.categoryId || undefined,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        intervalDays: Number(form.intervalDays),
        nextOccurrence: form.nextOccurrence,
        description: form.description || undefined,
      });
      setForm({ accountId: '', categoryId: '', type: '', amount: '', currency: '', intervalDays: '', nextOccurrence: '', description: '' });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Nova Recorrência</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input name="accountId" placeholder="Conta" value={form.accountId} onChange={handleChange} required />
        <input name="categoryId" placeholder="Categoria" value={form.categoryId} onChange={handleChange} />
        <input name="type" placeholder="Tipo" value={form.type} onChange={handleChange} required />
        <input name="amount" placeholder="Valor" type="number" value={form.amount} onChange={handleChange} required />
        <input name="currency" placeholder="Moeda" value={form.currency} onChange={handleChange} required />
        <input name="intervalDays" placeholder="Intervalo (dias)" type="number" value={form.intervalDays} onChange={handleChange} required />
        <input name="nextOccurrence" placeholder="Próxima data" type="date" value={form.nextOccurrence} onChange={handleChange} required />
        <input name="description" placeholder="Descrição" value={form.description} onChange={handleChange} />
        <button type="submit">Salvar</button>
      </form>
    </Modal>
  );
}
