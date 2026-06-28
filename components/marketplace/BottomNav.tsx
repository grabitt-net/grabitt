'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { icon: '🏠', label: 'Home', href: '/' },
  { icon: '🔍', label: 'Search', href: '/listings' },
  { icon: '➕', label: 'Sell', href: '/listings/new', primary: true },
  { icon: '💬', label: 'Messages', href: '/messages' },
  { icon: '👤', label: 'Profile', href: '/profile' },
]

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#fff', borderTop: '1px solid #eee',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
      {navItems.map(item => {
        const isActive = path === item.href
        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '2px 0',
            }}>
              {item.primary ? (
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--orange)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, boxShadow: '0 4px 12px rgba(255,69,0,0.4)',
                  marginTop: -12,
                }}>
                  {item.icon}
                </div>
              ) : (
                <span style={{ fontSize: 19, lineHeight: 1 }}>{item.icon}</span>
              )}
              <span style={{
                fontFamily: 'var(--font-nunito)', fontSize: 8, fontWeight: 800,
                color: isActive ? 'var(--orange)' : '#7a6a55',
                lineHeight: 1.05, textAlign: 'center',
              }}>
                {item.label}
              </span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
