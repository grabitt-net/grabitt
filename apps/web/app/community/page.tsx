'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import SiteHeader from '@/components/marketplace/SiteHeader'
import EconomicLiving from '@/components/marketplace/EconomicLiving'

type Post = { id: string; title: string; excerpt: string; category: string; emoji: string; imageUrl: string | null }

export default function CommunityIndexPage() {
  const [posts, setPosts] = useState<Post[]>([])
  useEffect(() => {
    createTrpcClient().community.list.query({ limit: 30 }).then((p: any[]) => setPosts(p as Post[])).catch(() => {})
  }, [])
  return (
    <main style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <SiteHeader />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>
        <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 26, fontWeight: 900, color: 'var(--dark)', margin: '0 0 6px' }}>📰 Grabitt Guides</h1>
        <p style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 13.5, color: '#7a6c56', margin: '0 0 20px' }}>Island tips, selling advice and the Gran Canaria second-hand economy.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {posts.map(p => (
            <Link key={p.id} href={`/community/${p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
                <div style={{ height: 120, background: 'linear-gradient(135deg,#e8dfd0,#f5f0e8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 48 }}>{p.emoji}</span>}
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{p.category}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#7a6c56', lineHeight: 1.5 }}>{p.excerpt}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <EconomicLiving />
      </div>
    </main>
  )
}
