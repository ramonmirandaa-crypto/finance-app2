"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { createLoan, getLoanPayments, createLoanPayment } from "@/lib/api";

export default function LoanDetailsModal({ open, onClose, loan, onSaved }) {
  const isNew = !loan;
  const [loanForm, setLoanForm] = useState({
    description: "",
    amount: "",
    currency: "BRL",
    interestRate: "",
    startDate: "",
    endDate: "",
  });
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paidAt: "" });

  useEffect(() => {
    if (loan && open) {
      setLoanForm({
        description: loan.description,
        amount: loan.amount,
        currency: loan.currency,
        interestRate: loan.interestRate,
        startDate: loan.startDate?.slice(0, 10) || "",
        endDate: loan.endDate?.slice(0, 10) || "",
      });
      getLoanPayments(loan.id)
        .then((data) => setPayments(data.payments))
        .catch(() => setPayments([]));
    } else if (open) {
      setLoanForm({
        description: "",
        amount: "",
        currency: "BRL",
        interestRate: "",
        startDate: "",
        endDate: "",
      });
      setPayments([]);
    }
  }, [loan, open]);

  const handleLoanChange = (e) => {
    setLoanForm({ ...loanForm, [e.target.name]: e.target.value });
  };

  const handlePaymentChange = (e) => {
    setPaymentForm({ ...paymentForm, [e.target.name]: e.target.value });
  };

  async function submitLoan(e) {
    e.preventDefault();
    try {
      await createLoan({
        description: loanForm.description,
        amount: Number(loanForm.amount),
        currency: loanForm.currency,
        interestRate: Number(loanForm.interestRate),
        startDate: loanForm.startDate,
        endDate: loanForm.endDate,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  }

  async function submitPayment(e) {
    e.preventDefault();
    try {
      await createLoanPayment(loan.id, {
        amount: Number(paymentForm.amount),
        paidAt: paymentForm.paidAt,
      });
      setPaymentForm({ amount: "", paidAt: "" });
      const data = await getLoanPayments(loan.id);
      setPayments(data.payments);
      onSaved?.();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      {isNew ? (
        <div>
          <h3>Novo Empréstimo</h3>
          <form onSubmit={submitLoan} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input name="description" placeholder="Descrição" value={loanForm.description} onChange={handleLoanChange} required />
            <input name="amount" type="number" placeholder="Valor" value={loanForm.amount} onChange={handleLoanChange} required />
            <input name="currency" placeholder="Moeda" value={loanForm.currency} onChange={handleLoanChange} required />
            <input name="interestRate" type="number" step="0.01" placeholder="Juros (%)" value={loanForm.interestRate} onChange={handleLoanChange} required />
            <input name="startDate" type="date" placeholder="Início" value={loanForm.startDate} onChange={handleLoanChange} required />
            <input name="endDate" type="date" placeholder="Fim" value={loanForm.endDate} onChange={handleLoanChange} required />
            <button type="submit">Salvar</button>
          </form>
        </div>
      ) : (
        <div>
          <h3>{loan.description}</h3>
          <p>
            {loan.amount} {loan.currency} - Juros {loan.interestRate}%
          </p>
          <ul>
            {payments.map((p) => (
              <li key={p.id}>
                {p.paidAt?.slice(0, 10)} - {p.amount}
              </li>
            ))}
          </ul>
          <form onSubmit={submitPayment} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input name="amount" type="number" placeholder="Valor pago" value={paymentForm.amount} onChange={handlePaymentChange} required />
            <input name="paidAt" type="date" placeholder="Data" value={paymentForm.paidAt} onChange={handlePaymentChange} required />
            <button type="submit">Registrar Pagamento</button>
          </form>
        </div>
      )}
    </Modal>
  );
}
