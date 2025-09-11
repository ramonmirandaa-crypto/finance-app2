'use client';
import NavLink from './NavLink';

export default function Sidebar() {
  return (
    <aside style={{
      width: 260,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'sticky',
      top: 0,
      height: '100dvh',
      overflowY: 'auto',
      background: 'rgba(255,255,255,0.45)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderRight: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{fontWeight: 800, fontSize: 18, marginBottom: 8}}>Navegação</div>
      <NavLink href="/dashboard" label="Dashboard" />
      <NavLink href="/contas-e-cartoes" label="Contas e Cartões" />
      <NavLink href="/investimentos" label="Investimentos" />
      <NavLink href="/objetivos" label="Objetivos" />
      <NavLink href="/orcamentos" label="Orçamentos" />
      <NavLink href="/analise" label="Análise" />
      <NavLink href="/categorias" label="Categorias" />
      <NavLink href="/integracoes" label="Integrações" />
      <NavLink href="/configuracoes" label="Configurações" />
    </aside>
  );
}
