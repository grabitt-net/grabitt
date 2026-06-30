'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props { listingId: string; sellerId: string }

export default function MessageButton({ listingId, sellerId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMessage() {
    setLoading(true)
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, seller_id: sellerId }),
    })
    if (res.status === 401) { router.push('/auth'); return }
    const data = await res.json()
    if (data.id) router.push(`/messages/${data.id}`)
    setLoading(false)
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
