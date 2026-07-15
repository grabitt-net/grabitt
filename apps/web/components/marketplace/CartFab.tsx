'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePanel } from '@/context/PanelContext'
import { useGrabittUid } from '@/hooks/useGrabittUid'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

// Floating basket button — reads the server-side basket count. Appears only when
// the signed-in user has items in their basket. Refreshes when the cart panel
// closes so add/remove reflect immediately.
export default function CartFab() {
  const { openPanel, panel } = usePanel()
  const uid = useGrabittUid()
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!uid) { setCount(0); return }
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { setCount(0); return }
    try { setCount(await trpcAuthed().cart.count.query()) } catch { /* ignore */ }
  }, [uid])

  // Reload on mount, on login, and whenever the cart panel is not open (so the
  // badge updates after add/remove/checkout).
  useEffect(() => { load() }, [load, panel.id])

  if (count === 0) return null

  return (
    <button
      onClick={() => openPanel('cart')}
      aria-label={`Open basket, ${count} items`}
      style={{
        position: 'fixed', right: 16, bottom: 96, zIndex: 300,
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff',
        fontSize: 24, boxShadow: '0 6px 20px rgba(255,69,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      🛒
      <span style={{
        position: 'absolute', top: -2, right: -2, background: '#1a1a1a', color: '#fff',
        fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900,
        minWidth: 20, height: 20, borderRadius: 50, border: '2px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
      }}>{count > 99 ? '99+' : count}</span>
    </button>
  )
}
