import { useState } from 'react';
import Modal from './Modal';
import { createAccount } from '@/lib/api';

export default function AccountModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ agency: '', number: '', digit: '', manager: '', phone: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAccount({
        agency: form.agency,
        number: `${form.number}${form.digit}`,
        manager: form.manager,
        phone: form.phone,
      });
      setForm({ agency: '', number: '', digit: '', manager: '', phone: '' });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Nova Conta</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input name="agency" placeholder="Agência" value={form.agency} onChange={handleChange} required />
        <input name="number" placeholder="Número" value={form.number} onChange={handleChange} required />
        <input name="digit" placeholder="Dígito" value={form.digit} onChange={handleChange} required />
        <input name="manager" placeholder="Gerente" value={form.manager} onChange={handleChange} />
        <input name="phone" placeholder="Telefone" value={form.phone} onChange={handleChange} />
        <button type="submit">Salvar</button>
      </form>
    </Modal>
  );
}
