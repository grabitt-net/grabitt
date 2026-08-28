'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'
import { DEPT_LABEL, deptEmoji, type DbListing } from '@/lib/listingMap'

// Unified #hashtag discovery: everything tagged with #<slug> — marketplace items
// and News/Guide articles — on one page. Hashtags in item descriptions and news
// bodies link here.
type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null; createdAt: string }

export default function TagPage() {
  const slug = decodeURIComponent(String(useParams()?.slug ?? '')).toLowerCase()
  const [items, setItems] = useState<DbListing[] | null>(null)
  const [posts, setPosts] = useState<Post[] | null>(null)

  useEffect(() => {
    if (!slug) return
    const c = createLooseTrpcClient()
    c.listings.search.query({ query: slug, page: 1, limit: 24 } as never)
      .then((r: any) => setItems((r?.items ?? []) as DbListing[])).catch(() => setItems([]))
    c.community.byTag.query({ tag: slug })
      .then((p: any) => setPosts((p ?? []) as Post[])).catch(() => setPosts([]))
  }, [slug])

  const loading = items === null || posts === null
  const nItems = items?.length ?? 0
  const nPosts = posts?.length ?? 0

  return (
    <InfoPage title={`#${slug}`} topbarTitle={`#${slug}`}
      intro="Everything tagged this way — items for sale and stories from around the islands.">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>Loading…</div>
      ) : nItems === 0 && nPosts === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#888' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Nothing tagged #{slug} yet</div>
          <div style={{ marginTop: 14 }}><Link href="/" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>Browse Grabitt →</Link></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {nItems > 0 && (
            <section>
              <SectionTitle>🛍️ Items · {nItems}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {items!.map(l => {
                  const img = l.images?.[0]
                  const emoji = deptEmoji(l.department)
                  return (
                    <Link key={l.id} href={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
                      <div className="product-card" style={card}>
                        <div style={{ width: '100%', paddingTop: '72%', position: 'relative', background: 'var(--sand)' }}>
                          {img
                            ? <img loading="lazy" decoding="async" src={img} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>{emoji}</div>}
                        </div>
                        <div style={{ padding: '10px 11px 12px' }}>
                          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
                          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--orange)', margin: '3px 0' }}>€{Number(l.price ?? 0).toLocaleString()}</div>
                          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: 'var(--ink-2)' }}>{l.location ?? 'Canary Islands'} · {DEPT_LABEL[l.department] ?? l.department}</div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {nPosts > 0 && (
            <section>
              <SectionTitle>📰 News &amp; Guides · {nPosts}</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {posts!.map(p => (
                  <Link key={p.id} href={`/news/${p.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #eee4d6', borderRadius: 14, padding: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--sand)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.emoji || '📰')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{p.title}</div>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.excerpt}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </InfoPage>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', marginBottom: 12 }}>{children}</div>
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #eee4d6', borderRadius: 14, overflow: 'hidden' }
