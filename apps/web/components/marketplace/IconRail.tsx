'use client'
import { useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import type { PanelId } from '@/context/PanelContext'
import { useNotifications } from '@/hooks/useNotifications'
import { useGrabittUid } from '@/hooks/useGrabittUid'
import Icon, { IconName } from './Icon'
import { t } from '@/lib/i18n'

// Mirrors the original HTML .icon-rail exactly: 7 buttons, evenly spread
// (flex:1 each, justify-content:space-between) — Alerts, Saved, Rewards,
// Login, Messages, Sell, Help. Do not add buttons here; secondary
// destinations live in the account menu, not the header rail.

export default function IconRail() {
  const { openPanel } = usePanel()
  const router = useRouter()
  const userId = useGrabittUid()

  const { unreadCount } = useNotifications(userId)
  const loggedIn = !!userId

  // A few rail buttons are real pages, not panels — Messages goes to the full
  // Messages centre (threads, Grabitt Team, Alerts) rather than a cut-down panel.
  const items: { icon: IconName; label: string; panel: PanelId; href?: string; badge?: number; highlight?: boolean }[] = [
    { icon: 'bell',    label: 'Alerts',   panel: 'alerts', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: 'heart',   label: 'Saved',    panel: 'favourites' },
    { icon: loggedIn ? 'user' : 'login', label: loggedIn ? 'Account' : 'Login', panel: loggedIn ? 'profile' : 'login' },
    { icon: 'message', label: 'Messages', panel: 'messages', href: '/messages' },
    { icon: 'package', label: 'Sell',     panel: 'sell', highlight: true },
    { icon: 'lifebuoy', label: 'Help',    panel: 'help' },
  ]

  return (
    <div style={{ borderTop: '1px solid rgba(122,106,85,0.18)', marginTop: 6 }}>
      <div className="icon-rail-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 2, padding: '8px 8px 2px' }}>
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => item.href ? router.push(item.href) : item.panel === 'profile' ? router.push('/account') : openPanel(item.panel)}
            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '2px 0', position: 'relative' }}
          >
            <span style={item.highlight
              ? { lineHeight: 1, color: '#fff', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(255,69,0,0.35)', marginTop: -4 }
              : { lineHeight: 1, color: 'var(--dark)' }}>
              <Icon name={item.icon} size={item.highlight ? 18 : 20} />
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: item.highlight ? 900 : 800, color: item.highlight ? 'var(--orange)' : '#7a6a55', lineHeight: 1.05, textAlign: 'center', whiteSpace: 'nowrap' }}>
              {t(item.label)}
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
