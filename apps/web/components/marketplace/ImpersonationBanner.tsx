'use client'
import { useEffect, useState } from 'react'

// Shown across the app while an admin is impersonating a member, so it's always
// obvious and one click gets back to the admin panel.
export default function ImpersonationBanner() {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    try { setName(localStorage.getItem('grabitt_impersonating')) } catch {}
  }, [])
  if (!name) return null

  const exit = () => {
    try {
      localStorage.removeItem('grabitt_impersonating')
      localStorage.removeItem('grabitt_jwt')
      localStorage.removeItem('grabitt_uid')
    } catch {}
    // Back to the admin panel — the admin's own session (Supabase) is intact and
    // re-mints their consumer token as normal.
    window.location.href = '/admin'
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#1e2b55', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}>
      <span>🕵️ Viewing as <strong>{name}</strong> (admin impersonation)</span>
      <button onClick={exit} style={{ background: '#fff', color: '#1e2b55', border: 'none', borderRadius: 999, padding: '5px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Exit</button>
    </div>
  )
}
