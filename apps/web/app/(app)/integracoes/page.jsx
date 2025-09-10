export default function Page() {
  return (
    <section style={{
      padding: 20, borderRadius: 20,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
      border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
    }}>
      <h2 style={{marginTop:0}}>Integrações (Open Finance)</h2>
      <p>Conectar instituições via Pluggy, status de sincronização e erros (stub).</p>
      <div style={{marginTop:12, display:'flex', gap:8}}>
        <button style={{
          padding:'10px 14px', borderRadius:12, border:'none',
          background:'#1d4ed8', color:'#fff', fontWeight:700, cursor:'pointer'
        }}>
          Conectar ao Pluggy
        </button>
        <button style={{
          padding:'10px 14px', borderRadius:12, border:'1px solid rgba(0,0,0,0.1)',
          background:'#fff', cursor:'pointer'
        }}>
          Sincronizar Manualmente
        </button>
      </div>
    </section>
  );
}
