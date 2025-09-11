"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "../../../lib/api";

export default function Page() {
  const [name, setName] = useState("");
  const [reports, setReports] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await apiFetch("/reports");
      setReports(data.reports || []);
    } catch {}
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("Gerando...");
    try {
      await apiFetch("/reports", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      setMsg("Relatório criado");
      load();
    } catch (e) {
      setMsg("Erro ao gerar");
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
      <h2 style={{ marginTop: 0 }}>Análise</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          placeholder="Nome do relatório"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
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
          Gerar
        </button>
        <p style={{ minHeight: 20, fontSize: 13 }}>{msg}</p>
      </form>
      <ul style={{ marginTop: 12 }}>
        {reports.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </section>
  );
}
