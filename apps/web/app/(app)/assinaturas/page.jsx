"use client";
import { useState, useEffect } from "react";
import { getSubscriptions, deleteSubscription } from "@/lib/api";
import SubscriptionModal from "@/components/SubscriptionModal";

export default function Page() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data.subscriptions || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (sub) => {
    setEditing(sub);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    setMsg("Removendo...");
    try {
      await deleteSubscription(id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      setMsg("Assinatura removida");
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
      <h2 style={{ marginTop: 0 }}>Assinaturas</h2>
      <button onClick={handleCreate}>Nova Assinatura</button>
      {subscriptions.length === 0 ? (
        <p>Nenhuma assinatura cadastrada.</p>
      ) : (
        <ul>
          {subscriptions.map((s) => (
            <li key={s.id}>
              {s.service} - {s.amount} {s.currency} - próxima {s.nextBillingDate?.slice(0, 10)}
              <button style={{ marginLeft: 8 }} onClick={() => handleEdit(s)}>
                Editar
              </button>
              <button style={{ marginLeft: 4 }} onClick={() => handleDelete(s.id)}>
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
      <p style={{ minHeight: 20, fontSize: 13 }}>{msg}</p>
      <SubscriptionModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={load}
        subscription={editing}
      />
    </section>
  );
}
