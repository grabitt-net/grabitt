'use client'
import { useEffect, useState } from 'react'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import { createLooseTrpcClient } from '@/lib/trpc'
import { trpcAuthed } from '@/lib/authToken'
import { toast } from '@/lib/ui'
import Topbar from '@/components/marketplace/Topbar'
import QuickActions from '@/components/marketplace/QuickActions'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHostLazy'

// Handy Help — dedicated classified browse page. Personal posts a request free;
// a business pays €2.99 to respond. Poster contact hidden until they accept.
// Each post is valid 30 days with a live countdown. (Also the respond success
// URL: /handy?responded=1.)
type HandyRow = { id: string; title: string; description: string | null; image: string | null; location: string | null; price: number; expiresAt: string }

function countdown(expiresAt: string): { label: string; urgent: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return { label: 'Expired', urgent: true }
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  if (days >= 1) return { label: `Expires in ${days}d ${hours}h`, urgent: days < 3 }
  return { label: `Expires in ${hours}h`, urgent: true }
}

export default function HandyPage() {
  return <PanelProvider><Inner /></PanelProvider>
}

function Inner() {
  const { openPanel } = usePanel()
  const [rows, setRows] = useState<HandyRow[] | null>(null)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    createLooseTrpcClient().handy.feed.query({ page: 1 }).then(d => setRows(d as HandyRow[])).catch(() => setRows([]))
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('responded')) {
      setNote('✓ Your response was sent. The poster will share their contact if they accept.')
    }
  }, [])

  const submit = async (id: string) => {
    if (message.trim().length < 3) return
    setBusy(true); setNote('')
    try {
      const res = await (trpcAuthed() as any).handy.respond.mutate({ listingId: id, message: message.trim() }) as { paid: boolean; checkoutUrl?: string }
      if (res.paid && res.checkoutUrl) { window.location.href = res.checkoutUrl; return }
      setNote('✓ Sent! The poster will share their contact if they accept.'); setRespondingTo(null); setMessage('')
    } catch (e) { toast((e as Error).message || 'Could not send'); } finally { setBusy(false) }
  }

  return (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Handy Help" />
      <QuickActions />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>🔧 Handy Help</h1>
            <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#555', margin: '6px 0 0', lineHeight: 1.5 }}>Need a hand? Post a request free. Businesses can respond — poster details stay private until you accept.</p>
          </div>
          <button onClick={() => openPanel('createListing', { category: 'Handy Help' })} style={{ background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 18px', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Post a request</button>
        </div>

        {note && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '11px 13px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: '#16a34a', marginBottom: 14 }}>{note}</div>}

        {rows === null ? (
          <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#aaa' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, fontFamily: 'var(--font-nunito)', color: '#aaa' }}>No open requests right now. Be the first to post!</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map(r => {
              const cd = countdown(r.expiresAt)
              return (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 14, boxShadow: '0 1px 4px rgba(30,43,85,0.05)' }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 12, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{r.image ? <img src={r.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🔧'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{r.title}</div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#666', lineHeight: 1.5, marginTop: 2 }}>{r.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
                        {r.location && <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#888' }}>📍 {r.location}</span>}
                        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: cd.urgent ? '#b45309' : '#16a34a', background: cd.urgent ? '#fff7ed' : '#f0fdf4', borderRadius: 50, padding: '3px 10px' }}>⏳ {cd.label}</span>
                      </div>
                    </div>
                  </div>
                  {respondingTo === r.id ? (
                    <div style={{ marginTop: 12 }}>
                      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Your proposal — how you can help, availability, rough price…" style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => submit(r.id)} disabled={busy || message.trim().length < 3} style={{ flex: 1, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>{busy ? 'Sending…' : 'Send proposal'}</button>
                        <button onClick={() => { setRespondingTo(null); setMessage('') }} style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 10, padding: '11px 16px', fontFamily: 'var(--font-nunito)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                      </div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', marginTop: 6 }}>Businesses are charged €2.99 to respond. Personal accounts respond free.</div>
                    </div>
                  ) : (
                    <button onClick={() => { setRespondingTo(r.id); setMessage(''); setNote('') }} style={{ width: '100%', marginTop: 12, background: '#fff', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 10, padding: 10, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Respond</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Footer />
      <PanelHost />
    </main>
  )
}
