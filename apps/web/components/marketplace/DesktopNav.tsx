'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { usePanel } from '@/context/PanelContext'
import type { PanelId } from '@/context/PanelContext'
import { useNotifications } from '@/hooks/useNotifications'
import { useGrabittUid } from '@/hooks/useGrabittUid'
import Icon, { IconName } from './Icon'
import Logo from './Logo'
import { t } from '@/lib/i18n'

// Desktop-only top navigation (shown ≥820px via .desktop-nav in globals.css).
// A persistent horizontal bar — logo, wide search, primary "Sell" CTA, and
// icon+label account actions — instead of the phone icon-rail. Same panels,
// same data as mobile; just laid out for wide screens.
export default function DesktopNav() {
  const { openPanel } = usePanel()
  const router = useRouter()
  const isHome = usePathname() === '/'
  const [query, setQuery] = useState('')
  const userId = useGrabittUid()
  const { unreadCount } = useNotifications(userId)
  const loggedIn = !!userId

  const search = () => { if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`) }

  const actions: { icon: IconName; label: string; panel: PanelId; badge?: number }[] = [
    { icon: 'bell', label: 'Alerts', panel: 'alerts', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: 'heart', label: 'Saved', panel: 'favourites' },
    { icon: 'message', label: 'Messages', panel: 'messages' },
    { icon: loggedIn ? 'user' : 'login', label: loggedIn ? 'Account' : 'Login', panel: loggedIn ? 'profile' : 'login' },
    { icon: 'lifebuoy', label: 'Help', panel: 'help' },
  ]
  // labels above are translation keys; rendered via t() below

  return (
    <div className="desktop-nav" style={{ alignItems: 'center', gap: 20, padding: '12px 28px', maxWidth: 1120, margin: '0 auto' }}>
      {/* Logo — opens the Grabitt menu on the home page, links home elsewhere */}
      {isHome ? (
        <button onClick={() => openPanel('menu')} aria-label="Grabitt menu"
          style={{ cursor: 'pointer', textAlign: 'left', flexShrink: 0, padding: 0, background: 'none', border: 'none' }}>
          <Logo height={38} />
        </button>
      ) : (
        <Link href="/" style={{ cursor: 'pointer', textAlign: 'left', flexShrink: 0, padding: 0, textDecoration: 'none' }}>
          <Logo height={38} />
        </Link>
      )}

      {/* Search — grows to fill */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 50, padding: '9px 8px 9px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <span style={{ color: '#9a8b74', display: 'flex' }}><Icon name="search" size={18} /></span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search() }}
          placeholder={t('Search for anything on Grabitt…')}
          aria-label="Search listings"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', minWidth: 0 }}
        />
        <button onClick={search} style={{ flexShrink: 0, background: 'var(--dark, #1a1a1a)', color: '#fff', border: 'none', borderRadius: 50, padding: '8px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>{t('Search')}</button>
      </div>

      {/* Sell CTA */}
      <button onClick={() => openPanel('sell')} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
        <Icon name="plus" size={17} strokeWidth={2.4} /> {t('Sell')}
      </button>

      {/* Account actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {actions.map(a => (
          <button key={a.label} onClick={() => a.panel === 'profile' ? router.push('/account') : openPanel(a.panel)} title={a.label}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 8px', color: 'var(--dark)' }}>
            <Icon name={a.icon} size={21} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: '#7a6a55' }}>{t(a.label)}</span>
            {a.badge !== undefined && (
              <span style={{ position: 'absolute', top: 0, right: 2, background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900, minWidth: 14, height: 14, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {a.badge > 99 ? '99+' : a.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
