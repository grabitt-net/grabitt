'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'
import { t } from '@/lib/i18n'

// Consistent site header for standalone pages (jobs, property, listing detail,
// forms). The homepage uses the richer Topbar (search + panels); this gives the
// same brand + a persistent way back home and across the main sections so those
// pages aren't dead-ends.
const NAV: [string, string][] = [
  ['Home', '/'],
  ['Jobs', '/jobs'],
  ['Property', '/property'],
  ['Messages', '/messages'],
  ['Account', '/account'],
]

export default function SiteHeader() {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header style={{ background: 'var(--sand)', position: 'sticky', top: 0, zIndex: 200, borderBottom: '1.5px solid var(--sand2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', maxWidth: 1120, margin: '0 auto' }}>
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }} aria-label="Grabitt home">
          <Logo height={26} />
        </Link>
        <nav style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', marginLeft: 'auto' }}>
          {NAV.map(([label, href]) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  flexShrink: 0, textDecoration: 'none', borderRadius: 50, padding: '6px 12px',
                  fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap',
                  background: active ? 'var(--orange)' : 'transparent',
                  color: active ? '#fff' : '#6b5d49',
                }}
              >
                {t(label)}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
