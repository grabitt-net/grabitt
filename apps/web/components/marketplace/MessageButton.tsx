'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

interface Props { listingId: string; sellerId: string }

export default function MessageButton({ listingId, sellerId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMessage() {
    setLoading(true)
    try {
      // Ensure we hold an app JWT (mint from the Supabase session if needed).
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth'); return }

      const thread = await trpcAuthed().messages.thread.mutate({ listingId, sellerId })
      if (thread?.id) router.push(`/messages/${thread.id}`)
    } catch {
      router.push('/auth')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMessage}
      disabled={loading}
      style={{
        flex: 1, background: '#f0f0f0', color: 'var(--dark)',
        border: 'none', borderRadius: 14, padding: '14px 20px',
        fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900,
        cursor: 'pointer', opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? '…' : '💬 Message'}
    </button>
  )
}
