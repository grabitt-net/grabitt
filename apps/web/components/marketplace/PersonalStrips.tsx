'use client'
import { useEffect, useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { toPanelItem } from '@/lib/listingMap'
import { getViews, type RecentCard } from '@/lib/recentViews'

function StripCard({ item, onClick }: { item: any; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ flex: '0 0 150px', background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ width: '100%', paddingTop: '78%', background: '#f5f0e8', position: 'relative' }}>
        {item.image ? <img src={item.image} alt={item.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{item.emoji ?? '🛍️'}</div>}
      </div>
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{item.title}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{item.price}</div>
        {item.location && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#9a8b74', marginTop: 4 }}>📍 {item.location}</div>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: '16px 0 0' }}>
      <div style={{ padding: '0 14px 12px' }}>
        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 10, padding: '0 14px 4px' }}>{children}</div>
    </section>
  )
}

export function RecommendedStrip() {
  const { openPanel } = usePanel()
  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) return
      try { const rows: any[] = await (trpcAuthed() as any).listings.recommended.query(); setItems(rows.map(toPanelItem)) } catch { /* ignore */ }
    })()
  }, [])
  if (items.length === 0) return null
  return <Section title="✨ Recommended for you">{items.map(it => <StripCard key={it.id} item={it} onClick={() => openPanel('listing', it)} />)}</Section>
}

export function RecentlyViewedStrip() {
  const { openPanel } = usePanel()
  const [items, setItems] = useState<RecentCard[]>([])
  useEffect(() => { setItems(getViews()) }, [])
  if (items.length === 0) return null
  return <Section title="🕘 Recently viewed">{items.map(it => <StripCard key={it.id} item={it} onClick={() => openPanel('listing', { ...it })} />)}</Section>
}
