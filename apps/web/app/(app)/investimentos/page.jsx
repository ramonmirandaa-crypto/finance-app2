"use client";
import { useState, useEffect } from "react";
import { apiFetch, convertCurrency } from "../../../lib/api";

export default function Page() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [displayCurrency, setDisplayCurrency] = useState("BRL");
  const [converted, setConverted] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("Salvando...");
    try {
      await apiFetch("/investments", {
        method: "POST",
        body: JSON.stringify({
          description,
          amount: Number(amount),
          currency,
          transactionId: transactionId || undefined,
        }),
      });
      setDescription("");
      setAmount("");
      setTransactionId("");
      setMsg("Investimento registrado");
    } catch (e) {
      setMsg("Erro ao salvar");
    }
  }

  useEffect(() => {
    if (!amount) {
      setConverted("");
      return;
    }
    convertCurrency(Number(amount), currency, displayCurrency)
      .then((v) => setConverted(v.toFixed(2)))
      .catch(() => setConverted(""));
  }, [amount, currency, displayCurrency]);

  return (
    <section
      style={{
        padding: 20,
        borderRadius: 20,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Investimentos</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="BRL">BRL</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <select
          value={displayCurrency}
          onChange={(e) => setDisplayCurrency(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="BRL">BRL</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        {converted && (
          <p style={{ fontSize: 13 }}>
            {`Equivale a ${converted} ${displayCurrency}`}
          </p>
        )}
        <input
          placeholder="ID da transação (opcional)"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
          }}
        />
        <button
          type="submit"
          style={{
            padding: 12,
            border: "none",
            borderRadius: 12,
            background: "#1d4ed8",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Salvar
        </button>
        <p style={{ minHeight: 20, fontSize: 13 }}>{msg}</p>
      </form>
    </section>
  );
}
