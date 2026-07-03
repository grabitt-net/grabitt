'use client'
import { useEffect, useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import type { PanelId } from '@/context/PanelContext'
import { useNotifications } from '@/hooks/useNotifications'

// Mirrors the original HTML .icon-rail exactly: 7 buttons, evenly spread
// (flex:1 each, justify-content:space-between) — Alerts, Saved, Rewards,
// Login, Messages, Sell, Help. Do not add buttons here; secondary
// destinations live in the account menu, not the header rail.

export default function IconRail() {
  const { openPanel } = usePanel()
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') setUserId(localStorage.getItem('grabitt_uid'))
  }, [])

  const { unreadCount } = useNotifications(userId)
  const loggedIn = !!userId

  const items: { icon: string; label: string; panel: PanelId; badge?: number }[] = [
    { icon: '🔔', label: 'Alerts',   panel: 'alerts', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: '❤️', label: 'Saved',    panel: 'favourites' },
    { icon: '💶', label: 'Rewards',  panel: 'rewards' },
    { icon: loggedIn ? '👤' : '🚪', label: loggedIn ? 'Account' : 'Login', panel: 'login' },
    { icon: '💬', label: 'Messages', panel: 'messages' },
    { icon: '📦', label: 'Sell',     panel: 'sell' },
    { icon: '🆘', label: 'Help',     panel: 'help' },
  ]

  return (
    <div style={{ borderTop: '1px solid rgba(122,106,85,0.18)', marginTop: 6 }}>
      <div className="icon-rail-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 2, padding: '8px 8px 2px' }}>
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => openPanel(item.panel)}
            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '2px 0', position: 'relative' }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 800, color: '#7a6a55', lineHeight: 1.05, textAlign: 'center', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            {item.badge !== undefined && (
              <span style={{
                position: 'absolute', top: -3, right: '50%', transform: 'translateX(14px)',
                background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900,
                minWidth: 14, height: 14, borderRadius: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              }}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
