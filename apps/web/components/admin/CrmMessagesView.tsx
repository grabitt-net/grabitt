'use client'
import { useState } from 'react'
import { useCrmApi } from './AdminApp'

type Channel = 'grabitt' | 'email' | 'whatsapp'

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: string; color: string; placeholder: string }> = {
  grabitt:  { label: 'Grabitt Chat', icon: '💬', color: 'var(--orange)', placeholder: 'Message via Grabitt…' },
  email:    { label: 'Email',        icon: '📧', color: '#3b82f6',      placeholder: 'Write an email…' },
  whatsapp: { label: 'WhatsApp',     icon: '🟢', color: '#25d366',      placeholder: 'WhatsApp message…' },
}

const MOCK_HISTORY = [
  { contact: 'Dave W.', channel: 'email' as Channel, text: 'Hi Dave, following up on the storefront renewal…', sent: '2h ago', opened: true },
  { contact: 'María G.', channel: 'whatsapp' as Channel, text: 'Hola María, ¿te gustaría una cuenta business?', sent: '1d ago', opened: false },
  { contact: 'Klaus B.', channel: 'grabitt' as Channel, text: 'Your featured listing expires in 3 days.', sent: '2d ago', opened: true },
]

export default function CrmMessagesView() {
  const api = useCrmApi()
  const [channel, setChannel] = useState<Channel>('grabitt')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const cfg = CHANNEL_CONFIG[channel]

  async function send() {
    if (!message.trim() || !recipient.trim()) return
    setSending(true)
    await new Promise(r => setTimeout(r, 800))
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    setMessage('')
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        <span style={{ color: 'var(--orange)' }}>Chats</span> & Messages
      </h2>

      {/* Channel selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(Object.keys(CHANNEL_CONFIG) as Channel[]).map(ch => {
          const c = CHANNEL_CONFIG[ch]
          return (
            <button key={ch} onClick={() => setChannel(ch)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 12, border: `2px solid ${channel === ch ? c.color : '#e5e7eb'}`, background: channel === ch ? `${c.color}18` : '#fff', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: channel === ch ? c.color : '#555' }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Compose */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {cfg.icon} Send via {cfg.label}
        </div>
        <input
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="Recipient name or email…"
          style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
        />
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={cfg.placeholder}
          rows={4}
          style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: '#f5f0e8', color: '#555', border: 'none', borderRadius: 10, padding: '9px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>📎 Attach</button>
          <button style={{ background: '#f5f0e8', color: '#555', border: 'none', borderRadius: 10, padding: '9px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>🏷️ Template</button>
          <button
            onClick={send}
            disabled={sending || !message.trim() || !recipient.trim()}
            style={{ flex: 1, background: sending || !message.trim() || !recipient.trim() ? '#ccc' : cfg.color, color: '#fff', border: 'none', borderRadius: 10, padding: 9, fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 13, cursor: sending || !message.trim() ? 'not-allowed' : 'pointer' }}
          >
            {sent ? '✅ Sent!' : sending ? 'Sending…' : `Send via ${cfg.label}`}
          </button>
        </div>
      </div>

      {/* History */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent messages</div>
        {MOCK_HISTORY.map((h, i) => {
          const hcfg = CHANNEL_CONFIG[h.channel]
          return (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, background: `${hcfg.color}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{hcfg.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{h.contact}</span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: hcfg.color, background: `${hcfg.color}18`, padding: '1px 6px', borderRadius: 50 }}>{hcfg.label}</span>
                  {h.opened && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#888' }}>👁 Opened</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', fontStyle: 'italic' }}>{h.text}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{h.sent}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
