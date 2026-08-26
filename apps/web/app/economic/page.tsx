'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'

// Economic Living — a news-style section (like /news). Articles are created in
// the Executive Suite (Economic Living management) and stored as CommunityPost
// rows with section = "economic".
type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null; createdAt: string }

const CATS = ['All', 'Money Saving', 'Smart Buying', 'Island Life', 'Budgeting', 'Guides']

export default function EconomicPage() {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [cat, setCat] = useState('All')
  useEffect(() => {
    createLooseTrpcClient().community.list.query({ limit: 30, section: 'economic' })
      .then(p => setPosts(p as Post[])).catch(() => setPosts([]))
  }, [])

  const shown = posts && cat !== 'All' ? posts.filter(p => p.category === cat) : posts

  return (
    <InfoPage
      title="Economic Living"
      topbarTitle="Economic Living"
      intro="Smart, money-saving living on the Canary Islands — tips, guides and ideas to help you spend less and get more."
    >
      {/* Clickable category filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
        {CATS.map(c => {
          const on = cat === c
          return (
            <button key={c} onClick={() => setCat(c)} style={{
              border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? 'var(--orange)' : '#fff', color: on ? '#fff' : 'var(--dark)',
              borderRadius: 999, padding: '7px 15px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
            }}>{c}</button>
          )
        })}
      </div>

      {shown === null ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>Loading…</div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>{cat === 'All' ? 'No articles yet — check back soon.' : `No ${cat} articles yet.`}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {shown.map(p => (
            <Link key={p.id} href={`/economic/${p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(30,43,85,0.05)', height: '100%' }}>
                <div style={{ height: 130, background: 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48 }}>{p.emoji}</span>}
                </div>
                <div style={{ padding: '13px 15px 15px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{p.category} · {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#555', lineHeight: 1.5 }}>{p.excerpt}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </InfoPage>
  )
}
