'use client';
import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '../lib/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getNotifications().then((data) => setNotifications(data.notifications || [])).catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.readAt).length;

  async function markRead(id) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 20
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'red',
            color: '#fff',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: 10
          }}>{unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 8,
          width: 260,
          maxHeight: 300,
          overflowY: 'auto',
          zIndex: 20
        }}>
          {notifications.length === 0 && (
            <div style={{ padding: 12, fontSize: 14 }}>Sem notificações</div>
          )}
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: 12, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: n.readAt ? 400 : 700, fontSize: 14 }}>{n.message}</div>
              {!n.readAt && (
                <button onClick={() => markRead(n.id)} style={{
                  marginTop: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: '#0070f3'
                }}>
                  Marcar como lida
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
