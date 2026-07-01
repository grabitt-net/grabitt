'use client'

export interface Listing {
  ref: string
  emoji?: string
  photoUrl?: string
  title: string
  price: string
  location: string
  category: string
  condition?: string
  isNew?: boolean
  isFeatured?: boolean
  hasOffer?: boolean
  isSold?: boolean
}

interface ListingCardProps {
  listing: Listing
  onClick?: () => void
  onSave?: () => void
  saved?: boolean
}

export function ListingCard({ listing, onClick, onSave, saved = false }: ListingCardProps) {
  const { emoji, photoUrl, title, price, location, condition, isNew, isFeatured, hasOffer, isSold } = listing

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e8e0d5',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '72%', background: '#f5f0e8' }}>
        {photoUrl ? (
          <img src={photoUrl} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 }}>
            {emoji || '🛍️'}
          </div>
        )}

        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {isNew && <span style={{ background: 'var(--sage)', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 6px', borderRadius: 50 }}>NEW</span>}
          {isFeatured && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 6px', borderRadius: 50 }}>👀 FEATURED</span>}
          {hasOffer && <span style={{ background: 'var(--ocean)', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 6px', borderRadius: 50 }}>OFFER</span>}
          {isSold && <span style={{ background: '#999', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 6px', borderRadius: 50 }}>SOLD</span>}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onSave?.() }}
          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {saved ? '❤️' : '🤍'}
        </button>
      </div>

      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 700, color: 'var(--orange)', marginBottom: 5 }}>
          {price}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#666' }}>📍 {location}</span>
          {condition && (
            <span style={{ background: '#f5f0e8', color: '#7a6a55', fontSize: 8, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '1px 5px', borderRadius: 50 }}>{condition}</span>
          )}
        </div>
      </div>
    </div>
  )
}
