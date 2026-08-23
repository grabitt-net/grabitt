'use client'
import { use, useEffect, useState } from 'react'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'

// Read-only view of an ENDED (sold) listing, opened from the Sold Prices tool.
// Shows only the item and its sold price — NO seller/buyer identity, contact,
// location or history (privacy requirement, item 7).
type Ended = { id: string; title: string; description: string | null; condition: string | null; department: string | null; images: string[]; soldPrice: number; soldAt: string | null }

export default function SoldListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<Ended | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    createLooseTrpcClient().listings.endedListing.query({ id })
      .then((d) => setData(d as Ended)).catch(() => setNotFound(true))
  }, [id])

  const euro = (n: number) => `€${n.toLocaleString()}`

  return (
    <InfoPage title="Sold listing" topbarTitle="Sold listing" intro="A completed sale — shown for reference only. Seller and buyer details are never shown here.">
      {notFound ? (
        <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-ui)', color: '#888' }}>This listing is no longer available.</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-ui)', color: '#888' }}>Loading…</div>
      ) : (
        <div style={{ maxWidth: 620, margin: '0 auto', background: '#fff', border: '1px solid #ece3d7', borderRadius: 20, padding: 'clamp(16px, 3vw, 26px)', boxShadow: '0 6px 24px rgba(30,43,85,0.06)' }}>
          {data.images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: data.images.length > 1 ? 'repeat(auto-fill, minmax(120px, 1fr))' : '1fr', gap: 8, marginBottom: 16 }}>
              {data.images.map((src, i) => <img key={i} src={src} alt="" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 280, display: 'block' }} />)}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 900, color: 'var(--dark)', margin: 0 }}>{data.title}</h2>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 900, color: 'var(--sage, #16a34a)', whiteSpace: 'nowrap' }}>SOLD {euro(data.soldPrice)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {data.department && <span style={pill}>{data.department}</span>}
            {data.condition && <span style={pill}>{data.condition}</span>}
            {data.soldAt && <span style={pill}>Sold {new Date(data.soldAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          </div>
          {data.description && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14.5, lineHeight: 1.7, color: '#2a2a2a', margin: 0, whiteSpace: 'pre-wrap' }}>{data.description}</p>}
        </div>
      )}
    </InfoPage>
  )
}

const pill: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', background: '#f9f6f2', border: '1px solid #efe7db', borderRadius: 999, padding: '5px 12px' }
