import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/marketplace/BottomNav'

const conditionLabel: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor',
}

const typeLabel: Record<string, string> = {
  sale: 'For Sale', rent: 'For Rent', service: 'Service', wanted: 'Wanted', free: 'Free',
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      profiles!seller_id (id, full_name, grade, seller_rating, seller_review_count, avatar_url, created_at),
      categories!category_id (name, slug, icon)
    `)
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === listing.seller_id
  const seller = listing.profiles as any
  const category = listing.categories as any

  const gradeEmoji: Record<string, string> = {
    grabber: '🟠', dealer: '🟡', trader: '🔵', pro: '⭐',
  }

  return (
    <main style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <header style={{
        background: 'var(--sand)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1.5px solid var(--sand2)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/listings" style={{ fontSize: 22, textDecoration: 'none', color: 'var(--dark)' }}>←</Link>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', flex: 1 }}>
          {category?.name ?? 'Listing'}
        </span>
        {isOwner && (
          <Link href={`/listings/${id}/edit`} style={{
            background: '#f0f0f0', color: '#555', borderRadius: 50,
            padding: '6px 14px', fontSize: 12, fontWeight: 800,
            fontFamily: 'var(--font-nunito)', textDecoration: 'none',
          }}>Edit</Link>
        )}
      </header>

      {/* Image placeholder */}
      <div style={{
        height: 240, background: 'var(--sand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 80,
      }}>
        {category?.icon ?? '📦'}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Title + price */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              background: 'var(--sand)', color: 'var(--orange)',
              borderRadius: 50, padding: '3px 10px',
              fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800,
            }}>
              {typeLabel[listing.listing_type] ?? listing.listing_type}
            </span>
            {listing.condition && (
              <span style={{
                background: '#f0f0f0', color: '#555',
                borderRadius: 50, padding: '3px 10px',
                fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800,
              }}>
                {conditionLabel[listing.condition]}
              </span>
            )}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-nunito)', fontSize: 18, fontWeight: 900,
            color: 'var(--dark)', lineHeight: 1.3, marginBottom: 8,
          }}>
            {listing.title}
          </h1>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 26, fontWeight: 900, color: 'var(--orange)' }}>
            {listing.listing_type === 'free' ? 'Free' : listing.price ? `€${Number(listing.price).toLocaleString()}` : 'Contact for price'}
          </div>
          {listing.location && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 6, fontFamily: 'var(--font-nunito)' }}>
              📍 {listing.location}
            </div>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={sectionTitle}>Description</div>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, fontFamily: 'var(--font-comfortaa)' }}>
              {listing.description}
            </p>
          </div>
        )}

        {/* Seller */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={sectionTitle}>Seller</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--orange)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-nunito)',
              flexShrink: 0,
            }}>
              {seller?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>
                {seller?.full_name ?? 'Grabitt User'}
                {seller?.grade && (
                  <span style={{ marginLeft: 6, fontSize: 12 }}>{gradeEmoji[seller.grade]}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'var(--font-nunito)' }}>
                {seller?.seller_rating
                  ? `⭐ ${seller.seller_rating} (${seller.seller_review_count} reviews)`
                  : 'New seller'}
              </div>
            </div>
          </div>
        </div>

        {/* Safety notice */}
        <div style={{
          background: '#f0fdf4', borderRadius: 14, padding: '12px 14px',
          border: '1px solid #c8e6c9',
        }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#2e7d32', marginBottom: 4 }}>
            🛡️ Grabitt Buyer Protection
          </div>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-nunito)', lineHeight: 1.5 }}>
            Pay through Grabitt and your money is held safely until you confirm delivery.
          </div>
        </div>
      </div>

      {/* Sticky buy bar */}
      {!isOwner && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #eee',
          padding: '12px 16px max(12px, env(safe-area-inset-bottom))',
          display: 'flex', gap: 10, zIndex: 99,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        }}>
          <Link href={`/messages?listing=${id}&seller=${listing.seller_id}`} style={{
            flex: 1, textDecoration: 'none',
          }}>
            <button style={{
              width: '100%', background: '#f0f0f0', color: 'var(--dark)',
              border: 'none', borderRadius: 14, padding: '14px 20px',
              fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: 'pointer',
            }}>
              💬 Message
            </button>
          </Link>
          {listing.listing_type !== 'wanted' && (
            <button style={{
              flex: 2, background: 'var(--orange)', color: '#fff',
              border: 'none', borderRadius: 14, padding: '14px 20px',
              fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255,69,0,0.35)',
            }}>
              {listing.listing_type === 'free' ? 'Claim for Free' : listing.listing_type === 'service' ? 'Book Now' : 'Buy Now'}
            </button>
          )}
        </div>
      )}

      {isOwner && <BottomNav />}
    </main>
  )
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800,
  color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
}
