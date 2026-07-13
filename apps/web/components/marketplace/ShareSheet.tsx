'use client'
import { useState } from 'react'

// Social share sheet — replicates the v3/v20 prototype's openSharePanel: an
// intro line, a copy-link box, a native "Share via…" button and the list of
// social platforms. Rendered as a centered modal overlay.
type Platform = { name: string; icon: string; color: string; bg: string; href: (url: string, text: string) => string }

const PLATFORMS: Platform[] = [
  { name: 'Facebook',    icon: '📘', color: '#1877f2', bg: '#e8f0fe', href: (u, t) => `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` },
  { name: 'WhatsApp',    icon: '📱', color: '#22c55e', bg: '#f0fdf4', href: (_u, t) => `https://wa.me/?text=${t}` },
  { name: 'Twitter / X', icon: '🐦', color: '#1a1a1a', bg: '#f8f9fa', href: (_u, t) => `https://twitter.com/intent/tweet?text=${t}` },
  { name: 'Telegram',    icon: '✈️', color: '#229ED9', bg: '#e7f5fb', href: (u, t) => `https://t.me/share/url?url=${u}&text=${t}` },
  { name: 'Email',       icon: '📧', color: '#FF4500', bg: '#FFF3EE', href: (_u, t) => `mailto:?subject=${encodeURIComponent('Check this out on Grabitt')}&body=${t}` },
  { name: 'Instagram',   icon: '📸', color: '#e1306c', bg: '#fdf2f8', href: () => 'https://www.instagram.com/' },
  { name: 'TikTok',      icon: '🎵', color: '#1a1a1a', bg: '#f0f0f0', href: () => 'https://www.tiktok.com/' },
]

export default function ShareSheet({ title, price, emoji, url, onClose }: {
  title: string
  price?: string
  emoji?: string
  url: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const rawText = `Look what I found on Grabitt! ${emoji ?? ''} ${title}${price ? ` — ${price}` : ''} ${url}`
  const text = encodeURIComponent(rawText)
  const encUrl = encodeURIComponent(url)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked — the input is selectable as a fallback */ }
  }

  const nativeShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, text: rawText, url }).catch(() => {})
    } else {
      copy()
    }
  }

  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ background: '#fff', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 16px 10px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>📤 Share this listing</span>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 16px 20px' }}>
          <div style={{ background: '#FFF3EE', borderRadius: 12, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#FF4500', fontFamily: 'var(--font-comfortaa)' }}>
            Look what I found on Grabitt! {emoji ?? ''} <strong>{title}</strong>{price ? ` for ${price}` : ''}
          </div>

          {/* Copy-link box */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <input readOnly value={url} onFocus={e => e.currentTarget.select()} style={{ flex: 1, minWidth: 0, border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#555', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={copy} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>

          {/* Native device share */}
          <button onClick={nativeShare} style={{ width: '100%', background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: 13, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer', marginBottom: 12 }}>📲 Share via…</button>

          {/* Social platforms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PLATFORMS.map(p => (
              <a key={p.name} href={p.href(encUrl, text)} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, background: p.bg, borderRadius: 12, padding: 12, textDecoration: 'none' }}>
                <span style={{ fontSize: 22 }}>{p.icon}</span>
                <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: p.color }}>Share on {p.name}</span>
                <span style={{ marginLeft: 'auto', color: p.color }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
