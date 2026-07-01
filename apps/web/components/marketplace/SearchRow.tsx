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
  let bestDist = Infinity
  GC_TOWNS.forEach(t => {
    const d = (lat - t.lat) ** 2 + (lng - t.lng) ** 2
    if (d < bestDist) { bestDist = d; best = t }
  })
  return best.name
}

export default function SearchRow() {
  const [query, setQuery] = useState('')
  const { openPanel } = usePanel()

  const handleSearch = () => {
    if (query.trim()) openPanel('search', { q: query.trim() })
  }

  const handleNearMe = () => {
    if (!navigator.geolocation) {
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
    <div style={{ padding: '10px 14px', background: 'var(--sand)', borderBottom: '1.5px solid var(--sand2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 50, padding: '8px 6px 8px 14px', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          placeholder="Search Gran Canaria..."
          style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', background: 'transparent', minWidth: 0 }}
        />
        <button
          onClick={handleNearMe}
          style={{ flexShrink: 0, background: '#FFF3EE', color: 'var(--orange)', border: 'none', borderRadius: 50, padding: '6px 10px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          📍 Near Me
        </button>
      </div>
    </div>
  )
}
