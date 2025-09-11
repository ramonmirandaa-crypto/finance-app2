"use client";
import { useState, useEffect } from 'react';
import Modal from './Modal';
import { createSubscription, updateSubscription } from '@/lib/api';

export default function SubscriptionModal({ open, onClose, onSaved, subscription }) {
  const isEdit = !!subscription;
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    service: '',
    amount: '',
    currency: '',
    nextBillingDate: '',
  });

  useEffect(() => {
    if (subscription && open) {
      setForm({
        accountId: subscription.accountId,
        categoryId: subscription.categoryId || '',
        service: subscription.service,
        amount: subscription.amount,
        currency: subscription.currency,
        nextBillingDate: subscription.nextBillingDate?.slice(0, 10) || '',
      });
    } else if (open) {
      setForm({
        accountId: '',
        categoryId: '',
        service: '',
        amount: '',
        currency: 'BRL',
        nextBillingDate: '',
      });
    }
  }, [subscription, open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        accountId: form.accountId,
        categoryId: form.categoryId || undefined,
        service: form.service,
        amount: Number(form.amount),
        currency: form.currency,
        nextBillingDate: form.nextBillingDate,
      };
      if (isEdit) {
        await updateSubscription(subscription.id, data);
      } else {
        await createSubscription(data);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>{isEdit ? 'Editar Assinatura' : 'Nova Assinatura'}</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input name="accountId" placeholder="Conta" value={form.accountId} onChange={handleChange} required />
        <input name="categoryId" placeholder="Categoria" value={form.categoryId} onChange={handleChange} />
        <input name="service" placeholder="Serviço" value={form.service} onChange={handleChange} required />
        <input name="amount" placeholder="Valor" type="number" value={form.amount} onChange={handleChange} required />
        <input name="currency" placeholder="Moeda" value={form.currency} onChange={handleChange} required />
        <input name="nextBillingDate" placeholder="Próxima cobrança" type="date" value={form.nextBillingDate} onChange={handleChange} required />
        <button type="submit">Salvar</button>
      </form>
    </Modal>
  );
}
