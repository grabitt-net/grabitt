'use client'
import { useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import { useGrabittUid } from '@/hooks/useGrabittUid'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { t } from '@/lib/i18n'

// The basket button that sits on a listing card, so a buyer can add an item
// without opening the listing first. Mirrors the server's own rules: jobs,
// property and Grab It Now items are never basketed (they're apply / instant
// buy), and you can't basket your own listing — in those cases we render
// nothing rather than a button that would only fail.
export default function AddToCartButton({
  listingId, department, sellerId, isGrabItNow, size = 'md',
}: {
  listingId: string
  department?: string
  sellerId?: string
  isGrabItNow?: boolean
  size?: 'sm' | 'md'
}) {
  const { openPanel } = usePanel()
  const uid = useGrabittUid()
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)
  const [err, setErr] = useState('')

  const basketable = department !== 'jobs' && department !== 'property' && !isGrabItNow
  const isOwn = !!uid && !!sellerId && uid === sellerId
  if (!basketable || isOwn) return null

  const add = async (e: React.MouseEvent) => {
    // The whole card is a link/click target — keep the click here.
    e.preventDefault(); e.stopPropagation()
    if (busy) return
    setErr(''); setBusy(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { openPanel('login'); return }
      await trpcAuthed().cart.addItem.mutate({ listingId })
      setAdded(true)
      openPanel('cart', { added: true })
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : t('Could not add to basket'))
    } finally { setBusy(false) }
  }

  const pad = size === 'sm' ? '6px 8px' : '7px 10px'
  const font = size === 'sm' ? 10.5 : 11.5

  return (
    <>
      <button
        onClick={add}
        disabled={busy}
        aria-label={t('Add to basket')}
        style={{
          width: '100%', marginTop: 8, border: 'none', borderRadius: 50, padding: pad,
          background: added ? '#e8f5e9' : 'linear-gradient(135deg,var(--orange),var(--orange2))',
          color: added ? '#16a34a' : '#fff',
          fontFamily: 'var(--font-ui)', fontSize: font, fontWeight: 900,
          cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {added ? `✓ ${t('In basket')}` : `🛒 ${t('Add to basket')}`}
      </button>
      {err && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#c0392b', marginTop: 4, textAlign: 'center' }}>{err}</div>}
    </>
  )
}
