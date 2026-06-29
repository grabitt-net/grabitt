import Link from 'next/link'

interface Props {
  title: string
  seeAllHref: string
}

const placeholderListings = [
  { id: '1', emoji: '🏄', title: 'Surfboard — Rip Curl 6ft', price: '€120', location: 'Las Palmas', badge: 'Hot', badgeType: 'hot', grad: 'linear-gradient(145deg,#FFF3EE,#FFE4D6)' },
  { id: '2', emoji: '🛵', title: 'Vespa Scooter 2021', price: '€2,400', location: 'Maspalomas', badge: 'New', badgeType: 'new', grad: 'linear-gradient(145deg,#EEF4FF,#D6E8FF)' },
  { id: '3', emoji: '🏠', title: 'Studio Flat — Playa del Inglés', price: '€650/mo', location: 'Playa del Inglés', badge: null, badgeType: null, grad: 'linear-gradient(145deg,#F0FDF4,#D6F5E3)' },
  { id: '4', emoji: '📷', title: 'Canon EOS R6 + 24-70mm', price: '€1,800', location: 'Telde', badge: 'Offer', badgeType: 'offer', grad: 'linear-gradient(145deg,#FEF9EE,#FFF0CC)' },
  { id: '5', emoji: '🎸', title: 'Fender Stratocaster', price: '€340', location: 'Las Palmas', badge: null, badgeType: null, grad: 'linear-gradient(145deg,#FDF0FF,#F0D6FF)' },
]

const badgeColors: Record<string, string> = {
  hot: 'var(--orange)',
  new: 'var(--sage)',
  offer: 'var(--ocean)',
}

export default function ListingsRow({ title, seeAllHref }: Props) {
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '20px 16px 10px',
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>
          {title}
        </span>
        <Link href={seeAllHref} style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>
          See all
        </Link>
      </div>

      <div style={{
        display: 'flex', gap: 10, padding: '0 12px',
        overflowX: 'auto', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {placeholderListings.map(listing => (
          <Link key={listing.id} href={`/listings/${listing.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', borderRadius: 18, overflow: 'hidden',
              minWidth: 150, maxWidth: 150, flexShrink: 0,
              boxShadow: '0 3px 14px rgba(0,0,0,0.08)', cursor: 'pointer',
            }}>
              <div style={{
                width: '100%', height: 120,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 44, background: listing.grad, position: 'relative',
              }}>
                {listing.emoji}
                {listing.badge && (
                  <span style={{
                    position: 'absolute', top: 8, left: 8,
                    background: badgeColors[listing.badgeType!] || 'var(--orange)',
                    color: '#fff', fontSize: 9, fontWeight: 800,
                    padding: '3px 8px', borderRadius: 50,
                    fontFamily: 'var(--font-nunito)',
                  }}>
                    {listing.badge}
                  </span>
                )}
                <span style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--sand)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 15,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)', cursor: 'pointer', zIndex: 5,
                }}>🤍</span>
              </div>
              <div style={{ padding: 10 }}>
                <div style={{
                  fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800,
                  color: 'var(--dark)', lineHeight: 1.3, marginBottom: 4,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {listing.title}
                </div>
                <div style={{
                  fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 16,
                  fontWeight: 700, color: 'var(--orange)', marginBottom: 4,
                }}>
                  {listing.price}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: '#bbb' }}>{listing.location}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
