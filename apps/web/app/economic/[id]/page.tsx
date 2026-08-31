'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { renderArticleBody } from '@/lib/hashtags'
import InfoPage from '@/components/marketplace/InfoPage'
import { createLooseTrpcClient } from '@/lib/trpc'

// A single Economic Living article — public reader.
type Post = { id: string; title: string; body: string; category: string; emoji: string; imageUrl: string | null; createdAt: string }

export default function EconomicArticlePage() {
  const id = String(useParams()?.id ?? '')
  const [post, setPost] = useState<Post | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  useEffect(() => {
    createLooseTrpcClient().community.byId.query({ id })
      .then((p: any) => { setPost(p as Post); setState('ready') })
      .catch(() => setState('notfound'))
  }, [id])

  return (
    <InfoPage title={post?.title || 'Economic Living'} topbarTitle="Economic Living" hero={post?.imageUrl || undefined}
      intro={post ? `${post.category} · ${new Date(post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : undefined}>
      {state === 'notfound' ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#888' }}>This article is no longer available. <Link href="/economic" style={{ color: 'var(--orange)', fontWeight: 800 }}>Back to Economic Living</Link></div>
      ) : state === 'loading' || !post ? (
        <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-ui)', color: '#aaa' }}>Loading…</div>
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {renderArticleBody(post.body)}
          <div style={{ marginTop: 28 }}><Link href="/economic" style={{ color: 'var(--orange)', fontFamily: 'var(--font-ui)', fontWeight: 800, textDecoration: 'none' }}>Back to Economic Living</Link></div>
        </div>
      )}
    </InfoPage>
  )
}
