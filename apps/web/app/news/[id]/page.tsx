'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'

// A single News article — public reader.
type Post = { id: string; title: string; body: string; category: string; emoji: string; imageUrl: string | null; createdAt: string }

export default function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [post, setPost] = useState<Post | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  useEffect(() => {
    createLooseTrpcClient().community.byId.query({ id })
      .then((p: any) => { setPost(p as Post); setState('ready') })
      .catch(() => setState('notfound'))
  }, [id])

  return (
    <InfoPage title={post?.title || 'News'} topbarTitle="News" hero={post?.imageUrl || undefined}
      intro={post ? `${post.category} · ${new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : undefined}>
      {state === 'notfound' ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#888' }}>This article is no longer available. <Link href="/news" style={{ color: 'var(--orange)', fontWeight: 800 }}>Back to News</Link></div>
      ) : state === 'loading' || !post ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>Loading…</div>
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15.5, lineHeight: 1.75, color: '#2a2a2a', whiteSpace: 'pre-wrap' }}>{post.body}</div>
          <div style={{ marginTop: 28 }}><Link href="/news" style={{ color: 'var(--orange)', fontFamily: 'var(--font-ui)', fontWeight: 800, textDecoration: 'none' }}>← Back to News</Link></div>
        </div>
      )}
    </InfoPage>
  )
}
