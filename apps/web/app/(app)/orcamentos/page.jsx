"use client";
import { useState, useEffect } from "react";
import {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  convertCurrency,
} from "../../../lib/api";

export default function Page() {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [displayCurrency, setDisplayCurrency] = useState("BRL");
  const [converted, setConverted] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("Salvando...");
    try {
      await createBudget({
        categoryId,
        amount: Number(amount),
        currency,
      });
      setCategoryId("");
      setAmount("");
      const data = await getBudgets();
      setBudgets(data.budgets);
      setMsg("Orçamento salvo");
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

  useEffect(() => {
    getBudgets().then((data) => setBudgets(data.budgets)).catch(() => {});
  }, []);

  function handleBudgetChange(index, field, value) {
    setBudgets((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  }

  async function saveBudget(b) {
    setMsg("Atualizando...");
    try {
      await updateBudget(b.id, {
        categoryId: b.categoryId,
        amount: Number(b.amount),
        currency: b.currency,
      });
      setMsg("Orçamento atualizado");
    } catch (e) {
      setMsg("Erro ao atualizar");
    }
  }

  async function removeBudget(id) {
    setMsg("Removendo...");
    try {
      await deleteBudget(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      setMsg("Orçamento removido");
    } catch (e) {
      setMsg("Erro ao remover");
    }
  }

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
      <h2 style={{ marginTop: 0 }}>Orçamentos</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          placeholder="ID da categoria"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
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
          placeholder="Limite"
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
      <hr />
      {budgets.map((b, idx) => (
        <div key={b.id} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={b.categoryId}
            onChange={(e) =>
              handleBudgetChange(idx, "categoryId", e.target.value)
            }
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
          <input
            type="number"
            step="0.01"
            value={b.amount}
            onChange={(e) => handleBudgetChange(idx, "amount", e.target.value)}
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
          <select
            value={b.currency}
            onChange={(e) => handleBudgetChange(idx, "currency", e.target.value)}
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <button
            onClick={() => saveBudget(b)}
            style={{ padding: 6, borderRadius: 8, cursor: "pointer" }}
          >
            Atualizar
          </button>
          <button
            onClick={() => removeBudget(b.id)}
            style={{ padding: 6, borderRadius: 8, cursor: "pointer" }}
          >
            Remover
          </button>
        </div>
      ))}
    </section>
  );
}
