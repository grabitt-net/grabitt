'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'

type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null }

// Homepage "Grabitt Guides" strip — editorial community content.
export default function CommunityStrip() {
  const [posts, setPosts] = useState<Post[]>([])
  useEffect(() => {
    createTrpcClient().community.list.query({ limit: 8 })
      .then((p: any[]) => setPosts(p as Post[]))
      .catch(() => {})
  }, [])
  if (posts.length === 0) return null
  return (
    <section style={{ padding: '16px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 14px 12px' }}>
        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 800, color: 'var(--dark)', margin: 0 }}>📰 Grabitt Guides</h2>
        <Link href="/community" style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: 'var(--orange)', textDecoration: 'none' }}>See all</Link>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 10, padding: '0 14px 4px' }}>
        {posts.map(p => (
          <Link key={p.id} href={`/community/${p.id}`} style={{ flex: '0 0 240px', textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
              <div style={{ height: 96, background: 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40 }}>{p.emoji}</span>}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{p.category}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 5 }}>{p.title}</div>
                <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#7a6c56', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.excerpt}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
