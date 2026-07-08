import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import BottomNav from '@/components/marketplace/BottomNav'
import SortSelect from '@/components/marketplace/SortSelect'

interface SearchParams { category?: string; q?: string; sort?: string }

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()

  // Fetch categories for filter bar
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .eq('is_active', true)
    .order('sort_order')

  // Build listings query
  let query = supabase
    .from('listings')
    .select(`
      id, title, price, currency, location, images, listing_type, condition, created_at,
      profiles!seller_id (full_name, grade),
      categories!category_id (name, slug, icon)
    `)
    .eq('status', 'active')

  if (params.category) {
    const cat = categories?.find(c => c.slug === params.category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  if (params.q) {
    query = query.ilike('title', `%${params.q}%`)
  }

  if (params.sort === 'price_asc') query = query.order('price', { ascending: true })
  else if (params.sort === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data: listings } = await query.limit(48)

  return (
    <main style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Header */}
      <header style={{
        background: 'var(--sand)', padding: '12px 14px',
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1.5px solid var(--sand2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Link href="/" style={{ textDecoration: 'none', fontSize: 22, fontFamily: 'var(--font-comfortaa)', fontWeight: 700 }}>
            <span style={{ color: 'var(--orange)' }}>G</span><span style={{ color: 'var(--dark)' }}>rabitt</span>
          </Link>
          <form method="GET" action="/listings" style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search listings…"
              style={{
                flex: 1, border: '1.5px solid #eee', borderRadius: 50,
                padding: '8px 14px', fontFamily: 'var(--font-nunito)',
                fontSize: 13, outline: 'none',
              }}
            />
            <button type="submit" style={{
              background: 'var(--orange)', color: '#fff', border: 'none',
              borderRadius: 50, padding: '8px 16px',
              fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}>Go</button>
          </form>
          <Link href="/listings/new" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'var(--orange)', color: '#fff', border: 'none',
              borderRadius: 50, padding: '8px 14px',
              fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>+ Sell</button>
          </Link>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          <Link href="/listings" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px', borderRadius: 50,
              fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800,
              background: !params.category ? 'var(--orange)' : '#fff',
              color: !params.category ? '#fff' : '#666',
              border: '1.5px solid #eee',
            }}>All</span>
          </Link>
          {categories?.map(cat => (
            <Link key={cat.slug} href={`/listings?category=${cat.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <span style={{
                display: 'inline-block', padding: '5px 14px', borderRadius: 50,
                fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800,
                background: params.category === cat.slug ? 'var(--orange)' : '#fff',
                color: params.category === cat.slug ? '#fff' : '#666',
                border: '1.5px solid #eee',
              }}>
                {cat.icon} {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </header>

      {/* Sort bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
      }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', fontWeight: 700 }}>
          {listings?.length ?? 0} listings
        </span>
        <form method="GET" action="/listings">
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <SortSelect defaultValue={params.sort} />
        </form>
      </div>

      {/* Listings grid */}
      {listings && listings.length > 0 ? (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10, padding: '0 12px',
        }}>
          {listings.map((listing: any) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 16,
                overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              }}>
                <div style={{
                  height: 130, background: 'var(--sand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48,
                }}>
                  {listing.categories?.icon ?? '📦'}
                </div>
                <div style={{ padding: '10px 10px 12px' }}>
                  <div style={{
                    fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800,
                    color: 'var(--dark)', lineHeight: 1.3, marginBottom: 4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {listing.title}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900,
                    color: 'var(--orange)', marginBottom: 4,
                  }}>
                    {listing.listing_type === 'free' ? 'Free' : `€${Number(listing.price).toLocaleString()}`}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: '#bbb' }}>{listing.location ?? 'Gran Canaria'}</span>
                    {listing.condition && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, color: 'var(--orange)',
                        background: 'var(--sand)', padding: '2px 6px', borderRadius: 50,
                        fontFamily: 'var(--font-nunito)', textTransform: 'capitalize',
                      }}>
                        {listing.condition.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          fontFamily: 'var(--font-nunito)', color: '#bbb',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>No listings found</div>
          <div style={{ fontSize: 13 }}>Be the first to post in this department!</div>
          <Link href="/listings/new" style={{ textDecoration: 'none' }}>
            <button style={{
              marginTop: 16, background: 'var(--orange)', color: '#fff', border: 'none',
              borderRadius: 50, padding: '12px 24px',
              fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
            }}>Post a Listing</button>
          </Link>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
