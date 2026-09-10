'use client'
import { useEffect, useRef, useState } from 'react'

export type AddressPick = { address: string; city: string; lat: number; lng: number }

// Address autocomplete backed by our /api/geocode proxy (server-side Nominatim,
// biased to the Canary Islands — reliable, no browser rate-limit issues). On
// select it hands back the address, resolved town/city and lat/lng so the caller
// can fill the form and drop the map pin.
export default function AddressAutocomplete({
  value, onChange, onSelect, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (pick: AddressPick) => void
  placeholder?: string
}) {
  const [results, setResults] = useState<AddressPick[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const skipNext = useRef(false)

  // Debounced search via our server proxy.
  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return }
    const q = value.trim()
    if (q.length < 3) { setResults([]); setOpen(false); return }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        const data = await res.json() as { results?: AddressPick[] }
        setResults(Array.isArray(data.results) ? data.results : [])
        setOpen(true)
      } catch { /* aborted / offline */ }
      finally { setLoading(false) }
    }, 350)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [value])

  // Close on outside click.
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const pick = (r: AddressPick) => {
    skipNext.current = true // don't re-search from the value we're about to set
    onChange(r.address)
    onSelect(r)
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
      {open && (results.length > 0 || (!loading && value.trim().length >= 3)) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #e5dccd', borderRadius: 10, marginTop: 4, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
          {results.length === 0
            ? <div style={{ padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#999' }}>No matches — keep typing, or drop the pin on the map below.</div>
            : results.map((r, i) => (
              <button key={i} type="button" onClick={() => pick(r)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f4efe8', padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#444', cursor: 'pointer' }}>
                📍 {r.address}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
