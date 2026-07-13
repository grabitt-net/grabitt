'use client'
import { useState } from 'react'
import { createTrpcClient } from '@/lib/trpc'
import type { PanelId } from '@/context/PanelContext'

// Real interactive actions for the footer info panels (replacing the prototype's
// JS-only buttons). Submissions post to the public crm.submit endpoint so the
// exec team receives them as CRM leads.
type SubmitType = 'suggestion' | 'economic_tip' | 'free_listings' | 'contact'

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #eee', borderRadius: 12, padding: '11px 12px', fontFamily: 'var(--font-comfortaa)', fontSize: 12, outline: 'none' }
const primaryBtn = (color = '#FF4500'): React.CSSProperties => ({ width: '100%', background: color, color: '#fff', border: 'none', borderRadius: 50, padding: 13, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer', marginTop: 10 })

function Done({ text }: { text: string }) {
  return <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14, textAlign: 'center', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>{text}</div>
}

function MessageForm({ type, placeholder, buttonText, color, done, withEmail }: {
  type: SubmitType; placeholder: string; buttonText: string; color?: string; done: string; withEmail?: boolean
}) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const send = async () => {
    if (!message.trim()) return
    setState('sending')
    try {
      await createTrpcClient().crm.submit.mutate({ type, message: message.trim(), ...(email.trim() && { email: email.trim() }) })
      setState('done')
    } catch { setState('idle') }
  }
  if (state === 'done') return <Done text={done} />
  return (
    <div>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={placeholder} style={{ ...inp, minHeight: 84, resize: 'vertical' }} />
      {withEmail && <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Your email (optional, so we can reply)" style={{ ...inp, marginTop: 8 }} />}
      <button onClick={send} disabled={state === 'sending' || !message.trim()} style={{ ...primaryBtn(color), opacity: state === 'sending' || !message.trim() ? 0.6 : 1 }}>
        {state === 'sending' ? 'Sending…' : buttonText}
      </button>
    </div>
  )
}

function BoostForm() {
  const [kind, setKind] = useState<'charity' | 'business'>('charity')
  const [name, setName] = useState('')
  const [reg, setReg] = useState('')
  const [about, setAbout] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const send = async () => {
    if (!name.trim()) return
    setState('sending')
    try {
      await createTrpcClient().crm.submit.mutate({
        type: 'free_listings', name: name.trim(), company: name.trim(),
        message: `${kind === 'charity' ? 'Charity' : 'New business'}${reg.trim() ? ` · Reg ${reg.trim()}` : ''}\n${about.trim()}`,
      })
      setState('done')
    } catch { setState('idle') }
  }
  if (state === 'done') return <Done text="❤️ Application sent — we'll review within 48 hours and message you." />
  const seg = (v: 'charity' | 'business', label: string) => (
    <button onClick={() => setKind(v)} style={{ flex: 1, background: kind === v ? '#16a34a' : '#f0f0f0', color: kind === v ? '#fff' : '#555', border: 'none', borderRadius: 50, padding: 10, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{label}</button>
  )
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', fontFamily: 'var(--font-nunito)', textTransform: 'uppercase', marginBottom: 6 }}>I am a…</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>{seg('charity', '❤️ Charity')}{seg('business', '🌱 New business')}</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Organisation / business name" style={inp} />
      <input value={reg} onChange={e => setReg(e.target.value)} placeholder="Registration or charity number (if any)" style={{ ...inp, marginTop: 8 }} />
      <textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="Tell us about your cause / business…" style={{ ...inp, marginTop: 8, minHeight: 70, resize: 'vertical' }} />
      <button onClick={send} disabled={state === 'sending' || !name.trim()} style={{ ...primaryBtn('#16a34a'), opacity: state === 'sending' || !name.trim() ? 0.6 : 1 }}>{state === 'sending' ? 'Sending…' : 'Submit Application'}</button>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#777', fontFamily: 'var(--font-comfortaa)', marginTop: 8 }}>We aim to review within 48 hours.</div>
    </div>
  )
}

export default function FooterPanelActions({ panelKey, onOpen }: { panelKey: string; onOpen: (id: PanelId, data?: Record<string, unknown>) => void }) {
  if (panelKey === 'suggest') {
    return <div style={{ marginTop: 6 }}><MessageForm type="suggestion" placeholder="Your idea…" buttonText="Send Suggestion →" done="💡 Suggestion sent — thank you!" withEmail /></div>
  }
  if (panelKey === 'economic') {
    return <div style={{ marginTop: 10 }}><MessageForm type="economic_tip" placeholder="Your money-saving tip…" buttonText="💬 Send a money-saving tip" color="#16a34a" done="💡 Thanks! Your tip has been sent for review." /></div>
  }
  if (panelKey === 'pricing') {
    return <div style={{ marginTop: 12, borderTop: '1px solid #f0ebe4', paddingTop: 14 }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>❤️ Apply for free listings</div>
      <BoostForm />
    </div>
  }
  if (panelKey === 'help') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
        <button onClick={() => onOpen('footer', { key: 'contact' })} style={{ background: '#FF4500', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>✉️ Ask Us</button>
        <button onClick={() => onOpen('myDisputes')} style={{ background: '#fff', color: '#FF4500', border: '1.5px solid #FF4500', borderRadius: 12, padding: 12, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>🛡️ Disputes</button>
      </div>
    )
  }
  if (panelKey === 'contact') {
    return <div style={{ marginTop: 12, borderTop: '1px solid #f0ebe4', paddingTop: 14 }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>Send us a message</div>
      <MessageForm type="contact" placeholder="How can we help?" buttonText="Send Message →" done="✅ Message sent — we'll be in touch." withEmail />
    </div>
  }
  return null
}
