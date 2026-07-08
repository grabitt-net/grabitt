'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

interface Props { listingId: string; sellerId: string; label?: string; primary?: boolean; flex?: number }

export default function MessageButton({ listingId, sellerId, label = '💬 Message', primary = false, flex = 1 }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleMessage() {
    setError('')
    setLoading(true)
    try {
      // Ensure we hold an app JWT (mint from the Supabase session if needed).
      // Only signed-out users get sent to log in — real errors are surfaced.
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push(`/auth?next=/listings/${listingId}`); return }

      const thread = await trpcAuthed().messages.thread.mutate({ listingId, sellerId })
      if (thread?.id) router.push(`/messages/${thread.id}`)
      else setError('Could not open the conversation. Please try again.')
    } catch (e: any) {
      const msg: string = e?.message ?? ''
      // An auth/permission failure means the session lapsed — re-authenticate.
      if (/UNAUTHORIZED|FORBIDDEN|jwt|token/i.test(msg)) {
        router.push(`/auth?next=/listings/${listingId}`)
      } else if (/yourself/i.test(msg)) {
        setError("This is your own listing — you can't message yourself.")
      } else {
        setError('Could not start the chat. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={handleMessage}
        disabled={loading}
        style={{
          background: primary ? 'var(--orange)' : '#f0f0f0', color: primary ? '#fff' : 'var(--dark)',
          border: 'none', borderRadius: 14, padding: '14px 20px',
          fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900,
          cursor: 'pointer', opacity: loading ? 0.7 : 1,
          boxShadow: primary ? '0 4px 14px rgba(255,69,0,0.35)' : 'none',
        }}
      >
        {loading ? '…' : label}
      </button>
      {error && <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#c0392b', textAlign: 'center' }}>{error}</span>}
    </div>
  )
}
