'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const railItems = [
  { icon: '🔔', label: 'Alerts', href: '/profile', badge: true },
  { icon: '❤️', label: 'Saved', href: '/profile' },
  { icon: '💶', label: 'Rewards', href: '/profile' },
  { icon: '🚪', label: 'Login', href: '/auth' },
  { icon: '💬', label: 'Messages', href: '/messages' },
  { icon: '📦', label: 'Sell', href: '/listings/new' },
  { icon: '🆘', label: 'Help', href: '/' },
]

export default function Topbar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  return (
    <header style={{
      background: 'var(--sand)',
      padding: '10px 14px 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1.5px solid var(--sand2)',
    }}>
      {/* Row 1: Logo + Search */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>
            <span style={{ color: 'var(--orange)' }}>Grab</span>
            <span style={{ color: 'var(--dark)' }}>itt</span>
            <span style={{ color: 'var(--orange)' }}>!</span>
          </div>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 9, color: '#7a6a55', fontWeight: 700, marginTop: 1, whiteSpace: 'nowrap' }}>
            Your local everything
          </div>
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 50, padding: '7px 5px 7px 11px', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', minWidth: 0 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && router.push(`/listings?q=${encodeURIComponent(query)}`)}
            placeholder="Search..."
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'var(--dark)', background: 'transparent', minWidth: 0 }}
          />
          <button
            onClick={() => router.push('/listings')}
            style={{ flexShrink: 0, background: '#FFF3EE', color: 'var(--orange)', border: 'none', borderRadius: 50, padding: '5px 8px', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            📍 Near
          </button>
        </div>
      </div>

      {/* Icon Rail */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2, padding: '6px 0 6px', borderTop: '1px solid rgba(122,106,85,0.18)' }}>
        {railItems.map(item => (
          <Link key={item.label} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '2px 0', position: 'relative', cursor: 'pointer' }}>
              <span style={{ fontSize: 19, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 8, fontWeight: 800, color: '#7a6a55', lineHeight: 1.05, textAlign: 'center', whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.badge && (
                <span style={{ position: 'absolute', top: -3, right: '50%', transform: 'translateX(14px)', background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900, minWidth: 14, height: 14, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>0</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </header>
  )
}
