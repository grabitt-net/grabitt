'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLooseTrpcClient } from '@/lib/trpc'

// Standalone "Advertise with us" enquiry — a modal-style form that feeds the
// admin Support Inbox (crm.submit type 'advertise'). It sits OUTSIDE the banner
// system on purpose: put this URL (/advertise-enquiry) in a banner's link/CTA
// field and clicking it opens this form. No auth required.
export default function AdvertiseEnquiryPage() {
  const router = useRouter()
  const [f, setF] = useState({ company: '', name: '', email: '', phone: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
  const close = () => router.push('/')

  const submit = async () => {
    if (!f.company.trim() || !f.email.trim()) { setErr('Please add your business name and email.'); return }
    setErr(''); setBusy(true)
    try {
      const parts = [f.message.trim(), f.phone.trim() ? `Phone: ${f.phone.trim()}` : ''].filter(Boolean)
      await createLooseTrpcClient().crm.submit.mutate({
        type: 'advertise',
        company: f.company.trim(),
        name: f.name.trim() || undefined,
        email: f.email.trim(),
        message: parts.join('\n\n') || 'Advertising enquiry (no message).',
      })
      setDone(true)
    } catch {
      setErr('Sorry, something went wrong. Please try again or email us directly.')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,12,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: 'linear-gradient(135deg,var(--orange),var(--orange2,#ff8a3d))', color: '#fff', padding: '18px 20px', borderTopLeftRadius: 18, borderTopRightRadius: 18, position: 'relative' }}>
          <button onClick={close} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
          <div style={{ fontFamily: 'var(--font-body,Comfortaa,sans-serif)', fontSize: 20, fontWeight: 800 }}>📣 Advertise with Grabitt</div>
          <div style={{ fontFamily: 'var(--font-nunito,sans-serif)', fontSize: 12.5, opacity: 0.95, marginTop: 4, lineHeight: 1.5 }}>Reach thousands of local buyers across the Canary Islands. Tell us a little about your business and we&apos;ll be in touch.</div>
        </div>

        {done ? (
          <div style={{ padding: '30px 22px', textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-body,Comfortaa,sans-serif)', fontSize: 18, fontWeight: 800, color: 'var(--dark,#1a1a1a)', margin: '8px 0 6px' }}>Thank you!</div>
            <div style={{ fontFamily: 'var(--font-nunito,sans-serif)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 18 }}>Your enquiry has reached our team. We usually reply within one business day.</div>
            <button onClick={close} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 22px', fontFamily: 'var(--font-nunito,sans-serif)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>Back to Grabitt</button>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            {err && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito,sans-serif)', fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
            <L>Business name *</L>
            <input value={f.company} onChange={e => set('company', e.target.value)} placeholder="Your business" style={inp} />
            <L>Your name</L>
            <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Contact name" style={inp} />
            <L>Email *</L>
            <input value={f.email} onChange={e => set('email', e.target.value)} type="email" placeholder="you@business.com" style={inp} />
            <L>Phone</L>
            <input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+34 600 000 000" style={inp} />
            <L>What would you like to advertise?</L>
            <textarea value={f.message} onChange={e => set('message', e.target.value)} rows={4} placeholder="Tell us about your business and what you're looking for…" style={{ ...inp, resize: 'vertical' }} />
            <button onClick={submit} disabled={busy} style={{ width: '100%', marginTop: 6, background: busy ? '#e6ddce' : 'linear-gradient(135deg,var(--orange),var(--orange2,#ff8a3d))', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'var(--font-nunito,sans-serif)', fontSize: 14, fontWeight: 900, cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Sending…' : 'Send enquiry'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito,sans-serif)', fontSize: 13, outline: 'none', background: '#fff', marginBottom: 12 }
function L({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontFamily: 'var(--font-nunito,sans-serif)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 5 }}>{children}</label>
}
