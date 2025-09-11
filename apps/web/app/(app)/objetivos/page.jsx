"use client";
import { useState, useEffect } from "react";
import {
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  convertCurrency,
} from "../../../lib/api";

export default function Page() {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [displayCurrency, setDisplayCurrency] = useState("BRL");
  const [converted, setConverted] = useState("");
  const [deadline, setDeadline] = useState("");
  const [goals, setGoals] = useState([]);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("Salvando...");
    try {
      await createGoal({
        name,
        target: Number(target),
        currency,
        deadline: deadline || undefined,
      });
      setName("");
      setTarget("");
      setDeadline("");
      const data = await getGoals();
      setGoals(data.goals);
      setMsg("Objetivo salvo");
    } catch (e) {
      setMsg("Erro ao salvar");
    }
  }

  useEffect(() => {
    if (!target) {
      setConverted("");
      return;
    }
    convertCurrency(Number(target), currency, displayCurrency)
      .then((v) => setConverted(v.toFixed(2)))
      .catch(() => setConverted(""));
  }, [target, currency, displayCurrency]);

  useEffect(() => {
    getGoals().then((data) => setGoals(data.goals)).catch(() => {});
  }, []);

  function handleGoalChange(index, field, value) {
    setGoals((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  }

  async function saveGoal(g) {
    setMsg("Atualizando...");
    try {
      await updateGoal(g.id, {
        name: g.name,
        target: Number(g.target),
        currency: g.currency,
        deadline: g.deadline,
      });
      setMsg("Objetivo atualizado");
    } catch (e) {
      setMsg("Erro ao atualizar");
    }
  }

  async function removeGoal(id) {
    setMsg("Removendo...");
    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setMsg("Objetivo removido");
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
      <h2 style={{ marginTop: 0 }}>Objetivos Financeiros</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          placeholder="Meta"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
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
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
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
      {goals.map((g, idx) => (
        <div key={g.id} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={g.name}
            onChange={(e) => handleGoalChange(idx, "name", e.target.value)}
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
          <input
            type="number"
            step="0.01"
            value={g.target}
            onChange={(e) => handleGoalChange(idx, "target", e.target.value)}
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
          <select
            value={g.currency}
            onChange={(e) => handleGoalChange(idx, "currency", e.target.value)}
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
            type="date"
            value={g.deadline || ""}
            onChange={(e) => handleGoalChange(idx, "deadline", e.target.value)}
            style={{
              padding: 6,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          />
          <button
            onClick={() => saveGoal(g)}
            style={{ padding: 6, borderRadius: 8, cursor: "pointer" }}
          >
            Atualizar
          </button>
          <button
            onClick={() => removeGoal(g.id)}
            style={{ padding: 6, borderRadius: 8, cursor: "pointer" }}
          >
            Remover
          </button>
        </div>
      ))}
    </section>
  );
}
