'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCrmApi } from './AdminApp'

type Channel = 'grabitt' | 'email' | 'whatsapp'

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: string; color: string; placeholder: string }> = {
  grabitt:  { label: 'Grabitt',  icon: '💬', color: 'var(--orange)', placeholder: 'Message via Grabitt (in-app notification)…' },
  email:    { label: 'Email',    icon: '📧', color: '#3b82f6',      placeholder: 'Write an email…' },
  whatsapp: { label: 'WhatsApp', icon: '🟢', color: '#25d366',      placeholder: 'WhatsApp message…' },
}

interface Member { id: string; displayName: string; email: string; phone?: string | null }

export default function CrmMessagesView() {
  const api = useCrmApi()
  const [channel, setChannel] = useState<Channel>('grabitt')
  const [members, setMembers] = useState<Member[]>([])
  const [recipientId, setRecipientId] = useState('')
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<{ id: string; contact: string; channel: string; subject: string; createdAt: string }[]>([])

  const cfg = CHANNEL_CONFIG[channel]

  const loadHistory = useCallback(() => {
    api.recentAdminMessages(15).then(setHistory).catch(() => setHistory([]))
  }, [api])

  useEffect(() => {
    api.members().then(m => setMembers(m ?? [])).catch(() => setMembers([]))
    loadHistory()
  }, [api, loadHistory])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members.slice(0, 50)
    return members.filter(m => m.displayName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)).slice(0, 50)
  }, [members, search])

  const recipient = members.find(m => m.id === recipientId)

  async function send() {
    if (!message.trim() || !recipientId) return
    setError('')
    if (channel === 'whatsapp' && !recipient?.phone) { setError('This member has no phone number on file.'); return }
    setSending(true)
    try {
      await api.messageMember({ userId: recipientId, channel, subject: subject.trim() || undefined, message: message.trim() })
      setSent(true); setMessage(''); setSubject('')
      setTimeout(() => setSent(false), 3000)
      loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        <span style={{ color: 'var(--orange)' }}>Message</span> a member
      </h2>

      {/* Channel selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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

        {/* Recipient */}
        {recipient ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9f6f2', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{recipient.displayName}</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{channel === 'whatsapp' ? (recipient.phone ?? 'no phone') : recipient.email}</span>
            <button onClick={() => { setRecipientId(''); setSearch('') }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800 }}>Change</button>
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members by name or email…" style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            {search.trim() && (
              <div style={{ border: '1px solid #f0ebe4', borderRadius: 10, marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 12, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb' }}>No members found</div>
                ) : filtered.map(m => (
                  <div key={m.id} onClick={() => { setRecipientId(m.id); setSearch('') }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f7f4ef' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{m.displayName}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{m.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {channel === 'email' && (
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject…" style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
        )}
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={cfg.placeholder} rows={4} style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }} />

        {error && <div style={{ background: '#fff5f5', color: '#ef4444', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, marginBottom: 10 }}>⚠️ {error}</div>}

        <button
          onClick={send}
          disabled={sending || !message.trim() || !recipientId}
          style={{ width: '100%', background: sending || !message.trim() || !recipientId ? '#ccc' : cfg.color, color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 13, cursor: sending || !message.trim() || !recipientId ? 'not-allowed' : 'pointer' }}
        >
          {sent ? '✅ Sent!' : sending ? 'Sending…' : `Send via ${cfg.label}`}
        </button>
      </div>

      {/* History */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recently sent</div>
        {history.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb', textAlign: 'center', padding: '16px 0' }}>No messages sent yet</div>
        ) : history.map(h => {
          const hcfg = CHANNEL_CONFIG[(h.channel as Channel)] ?? CHANNEL_CONFIG.grabitt
          return (
            <div key={h.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, background: `${hcfg.color}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{hcfg.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{h.contact}</span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: hcfg.color, background: `${hcfg.color}18`, padding: '1px 6px', borderRadius: 50 }}>{hcfg.label}</span>
                </div>
                {h.subject && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', fontStyle: 'italic', marginTop: 2 }}>{h.subject}</div>}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{new Date(h.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
