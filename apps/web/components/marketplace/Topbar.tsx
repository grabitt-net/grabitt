'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import IconRail from './IconRail'
import DesktopNav from './DesktopNav'
import Icon from './Icon'
import Logo from './Logo'
import BackButton from './BackButton'
import { t } from '@/lib/i18n'

// Mirrors the HTML .topbar: a single sticky header containing row1
// (logo + tagline on the left, search + 📍Near on the right) and the
// 7-button icon rail beneath it. There is no separate search row and no
// "Member" button in the header — login lives in the rail.

const GC_TOWNS = [
  { name: 'Las Palmas', lat: 28.1235, lng: -15.4363 },
  { name: 'Maspalomas', lat: 27.7606, lng: -15.5860 },
  { name: 'Playa del Inglés', lat: 27.7560, lng: -15.5730 },
  { name: 'Telde', lat: 27.9985, lng: -15.4197 },
  { name: 'Arguineguín', lat: 27.7600, lng: -15.6850 },
  { name: 'Puerto Rico', lat: 27.7900, lng: -15.7100 },
  { name: 'Mogán', lat: 27.8870, lng: -15.7230 },
  { name: 'Vecindario', lat: 27.8160, lng: -15.4470 },
  { name: 'Gáldar', lat: 28.1440, lng: -15.6510 },
  { name: 'Arucas', lat: 28.1190, lng: -15.5230 },
]

function nearestTown(lat: number, lng: number) {
  let best = GC_TOWNS[0]
  let bestDist = Infinity
  GC_TOWNS.forEach(t => {
    const d = (lat - t.lat) ** 2 + (lng - t.lng) ** 2
    if (d < bestDist) { bestDist = d; best = t }
  })
  return best.name
}

export default function Topbar({ title, back, backFallback }: { title?: string; back?: boolean; backFallback?: string } = {}) {
  const { openPanel } = usePanel()
  const router = useRouter()
  const [query, setQuery] = useState('')
  // On the home page the logo opens the Grabitt menu (as in the V20 prototype).
  // Everywhere else it stays a link home — that's the only way back from a
  // deep page, so it must not be replaced by a menu.
  const isHome = usePathname() === '/'
  // Persistent back on every page except home (where the logo opens the menu).
  // A page can still force it off by passing back={false}, or set a smarter
  // fallback route via backFallback for when there's no history to pop.
  const showBack = back ?? !isHome

  const handleSearch = () => {
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  // On the home page the logo now scrolls down to the footer menu (replacing the
  // old pop-up menu panel).
  const scrollToFooter = () => {
    if (typeof document === 'undefined') return
    const f = document.querySelector('footer')
    if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const handleNearMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      openPanel('near', { town: 'Gran Canaria' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => openPanel('near', { town: nearestTown(pos.coords.latitude, pos.coords.longitude) }),
      () => openPanel('near', { town: 'Las Palmas' }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    )
  }

  return (
    <header style={{
      background: 'var(--sand)',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      borderBottom: '1.5px solid var(--sand2)',
    }}>
      {/* Desktop (≥820px): persistent horizontal nav bar */}
      <DesktopNav title={title} back={showBack} backFallback={backFallback} />

      {/* Mobile/tablet (<820px): logo + search + icon rail */}
      <div className="mobile-chrome">
      {/* Row 1 — logo + search + Near */}
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 14px 0' }}>
        {showBack && <BackButton fallback={backFallback} />}
        {isHome ? (
          <button onClick={scrollToFooter} aria-label="Go to menu"
            style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>
            <Logo height={30} />
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: title ? 14 : 9, fontWeight: 700, color: title ? 'var(--dark)' : '#7a6a55', marginTop: 2, whiteSpace: 'nowrap', textAlign: title ? 'center' : 'left' }}>
              {title || t('Your local, Everything')}
            </div>
          </button>
        ) : (
          <Link href="/" style={{ flexShrink: 0, cursor: 'pointer', textDecoration: 'none' }}>
            <Logo height={30} />
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: title ? 14 : 9, fontWeight: 700, color: title ? 'var(--dark)' : '#7a6a55', marginTop: 2, whiteSpace: 'nowrap', textAlign: title ? 'center' : 'left' }}>
              {title || t('Your local, Everything')}
            </div>
          </Link>
        )}

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginLeft: 8, minWidth: 0, maxWidth: '62%' }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: 50, display: 'flex', alignItems: 'center', padding: '7px 5px 7px 11px', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 0 }}>
            <span style={{ flexShrink: 0, color: '#1a1a1a', display: 'flex' }}><Icon name="search" size={15} /></span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder={t('Search...')}
              style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--dark)', background: 'transparent', minWidth: 0 }}
            />
            <button
              onClick={e => { e.stopPropagation(); handleNearMe() }}
              title="Show items near me"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, background: '#FFF3EE', color: 'var(--orange)', border: 'none', borderRadius: 50, padding: '5px 9px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Icon name="mapPin" size={12} strokeWidth={2.2} /> {t('Near')}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2 — 7-button icon rail */}
      <IconRail />
      </div>
    </header>
  )
}
