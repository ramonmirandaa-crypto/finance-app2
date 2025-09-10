'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLink({ href, label, icon = null }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: 12,
        textDecoration: 'none',
        color: active ? '#0f172a' : '#334155',
        background: active
          ? 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.45))'
          : 'transparent',
        border: active ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
        boxShadow: active ? '0 6px 16px rgba(0,0,0,0.08)' : 'none'
      }}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span style={{ fontWeight: active ? 700 : 500 }}>{label}</span>
    </Link>
  );
}
