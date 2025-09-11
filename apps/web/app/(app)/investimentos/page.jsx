"use client";
import { useState, useEffect } from "react";
import {
  createInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
  convertCurrency,
} from "../../../lib/api";

export default function Page() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [displayCurrency, setDisplayCurrency] = useState("BRL");
  const [converted, setConverted] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [investments, setInvestments] = useState([]);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("Salvando...");
    try {
      await createInvestment({
        description,
        amount: Number(amount),
        currency,
        transactionId: transactionId || undefined,
      });
      setDescription("");
      setAmount("");
      setTransactionId("");
      const data = await getInvestments();
      setInvestments(data.investments);
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

  useEffect(() => {
    getInvestments()
      .then((data) => setInvestments(data.investments))
      .catch(() => {});
  }, []);

  function handleInvestmentChange(index, field, value) {
    setInvestments((prev) =>
      prev.map((inv, i) => (i === index ? { ...inv, [field]: value } : inv))
    );
  }

  async function saveInvestment(inv) {
    setMsg("Atualizando...");
    try {
      await updateInvestment(inv.id, {
        description: inv.description,
        amount: Number(inv.amount),
        currency: inv.currency,
        transactionId: inv.transactionId || undefined,
      });
      setMsg("Investimento atualizado");
    } catch (e) {
      setMsg("Erro ao atualizar");
    }
  }

  async function removeInvestment(id) {
    setMsg("Removendo...");
    try {
      await deleteInvestment(id);
      setInvestments((prev) => prev.filter((i) => i.id !== id));
      setMsg("Investimento removido");
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
      <hr />
      {investments.map((inv, idx) => (
        <div key={inv.id} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={inv.description}
            onChange={(e) =>
              handleInvestmentChange(idx, "description", e.target.value)
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
            value={inv.amount}
            onChange={(e) =>
              handleInvestmentChange(idx, "amount", e.target.value)
            }
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
          <select
            value={inv.currency}
            onChange={(e) =>
              handleInvestmentChange(idx, "currency", e.target.value)
            }
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
          <input
            value={inv.transactionId || ""}
            onChange={(e) =>
              handleInvestmentChange(idx, "transactionId", e.target.value)
            }
            placeholder="ID da transação"
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
          <button
            onClick={() => saveInvestment(inv)}
            style={{ padding: 6, borderRadius: 8, cursor: "pointer" }}
          >
            Atualizar
          </button>
          <button
            onClick={() => removeInvestment(inv.id)}
            style={{ padding: 6, borderRadius: 8, cursor: "pointer" }}
          >
            Remover
          </button>
        </div>
      ))}
    </section>
  );
}
