'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePanel } from '@/context/PanelContext'
import IconRail from './IconRail'
import DesktopNav from './DesktopNav'
import Icon from './Icon'
import Logo from './Logo'
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

export default function Topbar() {
  const { openPanel } = usePanel()
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    if (query.trim()) openPanel('search', { q: query.trim() })
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
      {/* Desktop/tablet (≥500px): persistent horizontal nav bar */}
      <DesktopNav />

      {/* Phone (<500px): logo + search + icon rail */}
      <div className="mobile-chrome">
      {/* Row 1 — logo + search + Near */}
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 14px 0' }}>
        <Link href="/" style={{ flexShrink: 0, cursor: 'pointer', textDecoration: 'none' }}>
          <Logo height={30} />
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: '#7a6a55', fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>
            {t('Your local everything')}
          </div>
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginLeft: 8, minWidth: 0, maxWidth: '62%' }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: 50, display: 'flex', alignItems: 'center', padding: '7px 5px 7px 11px', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 0 }}>
            <span style={{ flexShrink: 0, color: '#9a8b74', display: 'flex' }}><Icon name="search" size={15} /></span>
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
