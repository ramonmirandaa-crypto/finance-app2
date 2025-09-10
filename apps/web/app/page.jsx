export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)'
    }}>
      <div style={{
        padding: '24px 28px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
        maxWidth: 640
      }}>
        <h1 style={{margin: 0, fontSize: 28, fontWeight: 700}}>Finance App</h1>
        <p style={{margin: '12px 0 0 0', lineHeight: 1.5}}>
          Frontend Next.js em execução. API esperada em: <strong>{apiUrl}</strong>.
        </p>
        <p style={{marginTop: 8}}>
          Estilo <em>“liquid glass”</em>, PT-BR. Em breve: login, dashboard, contas/cartões e Pluggy.
        </p>
      </div>
    </main>
  );
}
