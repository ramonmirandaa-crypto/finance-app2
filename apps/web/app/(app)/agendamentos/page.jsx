"use client";
import { useState, useEffect } from "react";
import { getScheduledTransactions, deleteScheduledTransaction } from "@/lib/api";
import ScheduleTransactionModal from "@/components/ScheduleTransactionModal";

export default function Page() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const data = await getScheduledTransactions();
      setItems(data.scheduledTransactions || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    setMsg("Removendo...");
    try {
      await deleteScheduledTransaction(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setMsg("Agendamento removido");
    } catch (e) {
      setMsg("Erro ao remover");
    }
  };

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
      <h2 style={{ marginTop: 0 }}>Agendamentos</h2>
      <button onClick={() => setOpen(true)}>Novo Agendamento</button>
      {items.length === 0 ? (
        <p>Nenhum agendamento.</p>
      ) : (
        <ul>
          {items.map((t) => (
            <li key={t.id}>
              {t.description || t.type} - {t.amount} {t.currency} - exec em {t.executeAt?.slice(0,16)}
              <button style={{ marginLeft: 8 }} onClick={() => handleDelete(t.id)}>
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
      <p style={{ minHeight: 20, fontSize: 13 }}>{msg}</p>
      <ScheduleTransactionModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={load}
      />
    </section>
  );
}
