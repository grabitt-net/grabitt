'use client'
import { useEffect, useRef, useState } from 'react'

export type AddressPick = { address: string; city: string; lat: number; lng: number }

type NominatimResult = {
  display_name: string
  lat: string
  lon: string
  address?: Record<string, string>
}

// Address autocomplete backed by OpenStreetMap Nominatim (no API key, same
// stack as our Leaflet maps). Biased to the Canary Islands. On select it hands
// back the address, the resolved town/city, and lat/lng so the caller can fill
// the form and drop the map pin.
export default function AddressAutocomplete({
  value, onChange, onSelect, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (pick: AddressPick) => void
  placeholder?: string
}) {
  const [results, setResults] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const skipNext = useRef(false)

  // Debounced search.
  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return }
    const q = value.trim()
    if (q.length < 3) { setResults([]); return }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      setLoading(true)
      try {
        // Bias to the Canary Islands (viewbox ~ full archipelago) + Spain.
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=es&viewbox=-18.3,29.5,-13.2,27.4&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'en' } })
        const data = (await res.json()) as NominatimResult[]
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } catch { /* aborted / offline */ }
      finally { setLoading(false) }
    }, 450)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [value])

  // Close on outside click.
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const townFrom = (a?: Record<string, string>) =>
    a?.town || a?.city || a?.village || a?.municipality || a?.suburb || a?.county || ''

  const pick = (r: NominatimResult) => {
    const city = townFrom(r.address)
    skipNext.current = true // don't re-search from the value we're about to set
    onChange(r.display_name)
    onSelect({ address: r.display_name, city, lat: Number(r.lat), lng: Number(r.lon) })
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder ?? 'Start typing the address…'}
        style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff' }}
      />
      {loading && <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 11, color: '#aaa' }}>…</span>}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #e5dccd', borderRadius: 10, marginTop: 4, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => pick(r)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f4efe8', padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#444', cursor: 'pointer' }}>
              📍 {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
