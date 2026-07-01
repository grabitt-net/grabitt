'use client'
import { useEffect, useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import type { PanelId } from '@/context/PanelContext'
import { useNotifications } from '@/hooks/useNotifications'

const BASE_ITEMS: { icon: string; label: string; panel: PanelId; badgeKey?: 'alerts' | 'messages' }[] = [
  { icon: '🔔', label: 'Alerts',          panel: 'alerts',       badgeKey: 'alerts' },
  { icon: '📦', label: 'Sell',            panel: 'sell' },
  { icon: '💬', label: 'Messages',        panel: 'messages',     badgeKey: 'messages' },
  { icon: '💰', label: 'Offers',          panel: 'offers' },
  { icon: '🛒', label: 'Purchases',       panel: 'purchases' },
  { icon: '📋', label: 'My Listings',     panel: 'mylistings' },
  { icon: '🤞', label: 'Wishlist',        panel: 'wishlist' },
  { icon: '🎁', label: 'Gifts & Rewards', panel: 'rewards' },
  { icon: '➕', label: 'Invite Friends',  panel: 'invite' },
  { icon: '🔖', label: 'Saved Searches',  panel: 'savedSearches' },
  { icon: '👁',  label: 'Recently Viewed',panel: 'recentviewed' },
  { icon: '❤️', label: 'Favourites',      panel: 'favourites' },
  { icon: '📊', label: 'Sold Prices',     panel: 'soldprices' },
  { icon: '📣', label: 'Advertise',       panel: 'advertise' },
]

export default function IconRail() {
  const { openPanel } = usePanel()
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') setUserId(localStorage.getItem('grabitt_uid'))
  }, [])

  const { unreadCount, notifications } = useNotifications(userId)
  const unreadMessages = notifications.filter(n => n.kind === 'new_message' && !n.readAt).length

  const badge = (key?: 'alerts' | 'messages'): number | undefined => {
    if (!key) return undefined
    if (key === 'alerts') return unreadCount > 0 ? unreadCount : undefined
    if (key === 'messages') return unreadMessages > 0 ? unreadMessages : undefined
    return undefined
  }

  return (
    <div style={{ background: 'var(--sand)', borderBottom: '1.5px solid var(--sand2)', padding: '6px 0' }}>
      <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 0, padding: '0 4px' }}>
        {BASE_ITEMS.map(item => {
          const b = badge(item.badgeKey)
          return (
            <button
              key={item.label}
              onClick={() => openPanel(item.panel)}
              style={{ flex: '0 0 auto', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', minWidth: 54 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 800, color: '#7a6a55', lineHeight: 1.1, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
                {b !== undefined && (
                  <span style={{
                    position: 'absolute', top: -2, right: '50%', transform: 'translateX(14px)',
                    background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900,
                    minWidth: 14, height: 14, borderRadius: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                  }}>
                    {b > 99 ? '99+' : b}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
