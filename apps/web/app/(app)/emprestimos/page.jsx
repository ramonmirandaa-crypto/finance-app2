"use client";
import { useState, useEffect } from "react";
import { getLoans } from "@/lib/api";
import LoanDetailsModal from "./LoanDetailsModal";

export default function Page() {
  const [loans, setLoans] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchLoans = () => {
    getLoans().then((d) => setLoans(d.loans)).catch(() => {});
  };

  useEffect(() => {
    fetchLoans();
  }, []);

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
      <h2 style={{ marginTop: 0 }}>Empréstimos</h2>
      <button
        onClick={() => {
          setSelected(null);
          setOpen(true);
        }}
        style={{ marginBottom: 10 }}
      >
        Novo Empréstimo
      </button>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {loans.map((l) => (
          <li
            key={l.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span>
              {l.description} - {l.amount} {l.currency}
            </span>
            <button
              onClick={() => {
                setSelected(l);
                setOpen(true);
              }}
            >
              Detalhes
            </button>
          </li>
        ))}
      </ul>
      <LoanDetailsModal
        open={open}
        onClose={() => setOpen(false)}
        loan={selected}
        onSaved={fetchLoans}
      />
    </section>
  );
}
