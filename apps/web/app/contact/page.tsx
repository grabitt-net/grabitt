'use client'
import { useState } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'
import Icon from '@/components/marketplace/Icon'

// Footer → Grabitt → Contact. Intro copy is Steve's, used exactly as written.
// Socials all use the handle grabitt_net.
const SOCIALS: { label: string; href: string }[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/grabitt_net' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@grabitt_net' },
  { label: 'X', href: 'https://x.com/grabitt_net' },
]

const field: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--line, #ece3d7)', borderRadius: 12, padding: '12px 14px',
  fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', background: '#fff', outline: 'none', boxSizing: 'border-box',
}

function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async () => {
    setStatus('sending'); setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setStatus('error'); setError(data.error || 'Something went wrong. Please try again.'); return }
      setStatus('sent'); setName(''); setEmail(''); setMessage('')
    } catch {
      setStatus('error'); setError('Could not send your message. Please try again later.')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ background: '#f0faf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', width: 34, height: 34, borderRadius: '50%', background: 'var(--success, #16a34a)', color: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Icon name="check" size={18} strokeWidth={3} />
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>Thanks — your message is on its way!</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginTop: 4 }}>We&apos;ll get back to you as soon as we can.</div>
      </div>
    )
  }

  const disabled = status === 'sending' || !name.trim() || !email.trim() || !message.trim()

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={field} />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" type="email" style={field} />
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" rows={6} style={{ ...field, resize: 'vertical' }} />
      {error && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#ef4444' }}>{error}</div>}
      <button
        onClick={submit}
        disabled={disabled}
        style={{
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: disabled ? '#bbb' : 'var(--orange)',
          background: '#fff', border: `2px solid ${disabled ? '#e0d8d0' : '#111'}`, borderRadius: 12, padding: '13px 16px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </div>
  )
}

function LinkTile({ href, external, icon, label, sub }: { href: string; external?: boolean; icon: 'lifebuoy' | 'message' | 'share'; label: string; sub: string }) {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--line, #ece3d7)', borderRadius: 14, padding: '14px 16px' }}>
      <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: 'var(--sand)', color: 'var(--orange)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} strokeWidth={2} />
      </span>
      <span>
        <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 14.5, fontWeight: 800, color: 'var(--dark)' }}>{label}</span>
        <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666' }}>{sub}</span>
      </span>
    </div>
  )
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
    : <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
}

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact Us"
      topbarTitle="Contact"
      intro="Want to reach out with ideas, questions, suggestions, or need a hand? There are plenty of ways to get us:"
      pills={['Live Chat', 'Email', 'Message Centre', 'Instagram · TikTok · X']}
    >
      <div style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
        <LinkTile href="/help" icon="lifebuoy" label="Live chat" sub="Click Help anywhere on the site to jump into our live chat." />
        <LinkTile href="/account?section=messages" icon="message" label="Message Centre" sub="Send us a message in your Message Centre." />
      </div>

      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(19px, 2.6vw, 24px)', fontWeight: 900, color: 'var(--dark)', margin: '0 0 12px' }}>Drop us an email</h2>
      <ContactForm />

      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(19px, 2.6vw, 24px)', fontWeight: 900, color: 'var(--dark)', margin: '26px 0 12px' }}>Come say hello</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {SOCIALS.map(s => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: '1 1 160px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--line, #ece3d7)', borderRadius: 14, padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>
              <Icon name="share" size={18} strokeWidth={2} /> {s.label}
            </div>
          </a>
        ))}
      </div>
    </InfoPage>
  )
}
