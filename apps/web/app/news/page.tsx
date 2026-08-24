'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'

// News — Grabitt's blog. Public. Articles are created in the Executive Suite
// (News management) and stored as CommunityPost rows with section = "news".
type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null; createdAt: string }

export default function NewsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null)
  useEffect(() => {
    createLooseTrpcClient().community.list.query({ limit: 30, section: 'news' })
      .then(p => setPosts(p as Post[])).catch(() => setPosts([]))
  }, [])

  return (
    <InfoPage
      title="Grabitt News"
      topbarTitle="News"
      intro="The latest from Grabitt and the Canary Islands — updates, announcements, features and island happenings."
      pills={['Announcements', 'Island news', 'Features', 'Updates']}
    >
      {posts === null ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>Loading…</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>No news yet — check back soon.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {posts.map(p => (
            <Link key={p.id} href={`/news/${p.id}`} style={{ textDecoration: 'none' }}>
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
