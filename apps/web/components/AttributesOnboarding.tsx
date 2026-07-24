'use client'
import { useCallback, useEffect, useState } from 'react'
import { getAuthToken, trpcAuthed } from '@/lib/authToken'
import AttributesCard from '@/components/marketplace/AttributesCard'

const SKIP_KEY = 'grabitt_attrs_prompted'

// Asked once, shortly after a member joins: what are you into, what do you do,
// what can you do. It drives personalised alerts, job matching and marketing
// segmentation, so capturing it at onboarding is worth far more than hoping
// people find it in their account later.
//
// Deliberately skippable. This isn't consent — marketing still requires the
// separate marketing consent — and a wall between someone and the marketplace
// on day one costs more than the data is worth.
export default function AttributesOnboarding() {
  const [show, setShow] = useState(false)

  const check = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(SKIP_KEY)) return
    if (!getAuthToken()) return
    try {
      const me = await trpcAuthed().users.me.query() as unknown as {
        interests?: string[]; hobbies?: string[]; skills?: string[]
        gdprAcceptedAt?: string | null; withdrawalWaiverAcceptedAt?: string | null
      }
      // Wait until the consent gates are behind them — never stack modals.
      if (!me.gdprAcceptedAt || !me.withdrawalWaiverAcceptedAt) return
      const empty = !(me.interests?.length || me.hobbies?.length || me.skills?.length)
      if (empty) setShow(true)
    } catch { /* not signed in yet */ }
  }, [])

  useEffect(() => {
    let stop = false
    const poll = async () => {
      for (let i = 0; i < 8 && !stop; i++) {
        if (getAuthToken()) { await check(); return }
        await new Promise(r => setTimeout(r, 700))
      }
    }
    poll()
    const h = () => { check() }
    window.addEventListener('grabitt-auth', h)
    return () => { stop = true; window.removeEventListener('grabitt-auth', h) }
  }, [check])

  const dismiss = () => {
    localStorage.setItem(SKIP_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--cream, #f5f2ec)', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '88dvh', overflowY: 'auto', padding: 18 }}>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 19, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
          👋 Welcome to Grabitt
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#666', lineHeight: 1.55, marginBottom: 14 }}>
          Tell us a little about yourself so we can show you the right listings, alert you to the right deals and match you to the right jobs. You can change any of this later in your account.
        </div>

        <AttributesCard onSaved={dismiss} compact />

        <button onClick={dismiss} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#888', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: 10 }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
