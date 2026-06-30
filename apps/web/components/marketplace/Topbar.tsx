'use client'
import { useState } from 'react'
import { usePanel } from '@/context/PanelContext'

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
  let bestD = Infinity
  GC_TOWNS.forEach(t => {
    const d = (lat - t.lat) ** 2 + (lng - t.lng) ** 2
    if (d < bestD) { bestD = d; best = t }
  })
  return best.name
}

export default function Topbar() {
  const [query, setQuery] = useState('')
  const { openPanel } = usePanel()

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      openPanel('near', { town: 'Gran Canaria' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const town = nearestTown(pos.coords.latitude, pos.coords.longitude)
        openPanel('near', { town })
      },
      () => openPanel('near', { town: 'Las Palmas' }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    )
  }

  const railItems = [
    { icon: '🔔', label: 'Alerts', action: () => openPanel('alerts'), badge: 8 },
    { icon: '❤️', label: 'Saved', action: () => openPanel('saved') },
    { icon: '💶', label: 'Rewards', action: () => openPanel('rewards') },
    { icon: '🚪', label: 'Login', action: () => openPanel('login') },
    { icon: '💬', label: 'Messages', action: () => openPanel('messages') },
    { icon: '📦', label: 'Sell', action: () => openPanel('sell') },
    { icon: '🆘', label: 'Help', action: () => openPanel('help') },
  ]

  return (
    <header style={{
      background: 'var(--sand)', padding: '10px 14px 0',
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1.5px solid var(--sand2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div onClick={() => openPanel('menu')} style={{ flexShrink: 0, cursor: 'pointer' }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>
            <span style={{ color: 'var(--orange)' }}>Grab</span>
            <span style={{ color: 'var(--dark)' }}>itt</span>
            <span style={{ color: 'var(--orange)' }}>!</span>
          </div>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 9, color: '#7a6a55', fontWeight: 700, marginTop: 1, whiteSpace: 'nowrap' }}>
            Your local everything
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 50, padding: '7px 5px 7px 11px', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', minWidth: 0 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) window.location.href = `/listings?q=${encodeURIComponent(query)}` }}
            placeholder="Search..."
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-nunito)', fontSize: 13, color: 'var(--dark)', background: 'transparent', minWidth: 0 }}
          />
          <button
            onClick={handleNearMe}
            style={{ flexShrink: 0, background: '#FFF3EE', color: 'var(--orange)', border: 'none', borderRadius: 50, padding: '5px 8px', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            📍 Near
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2, padding: '6px 0 6px', borderTop: '1px solid rgba(122,106,85,0.18)' }}>
        {railItems.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '2px 0', position: 'relative' }}>
              <span style={{ fontSize: 19, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 8, fontWeight: 800, color: '#7a6a55', lineHeight: 1.05, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span style={{ position: 'absolute', top: -3, right: '50%', transform: 'translateX(14px)', background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900, minWidth: 14, height: 14, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {item.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </header>
  )
}
