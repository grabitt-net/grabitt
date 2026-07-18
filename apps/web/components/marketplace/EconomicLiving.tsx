'use client'
import { useState } from 'react'
import { createTrpcClient } from '@/lib/trpc'

// Economic Living — money-saving guide shown at the foot of Grabitt Guides,
// with a community tip submission. Tips land in the CRM pipeline (crm.submit
// type 'economic_tip') for the team to review and feature.

const TIPS: [string, string, string][] = [
  ['🔄', 'Buy second-hand first', 'Check Grabitt before buying new — furniture, tech and tools are often half price and barely used.'],
  ['⚡', 'Grab It Now bargains', 'Watch the ⚡ Grab It Now deals for end-of-day food and clearance items at big discounts.'],
  ['🤝', "Sell what you don't use", "That clutter is someone's treasure. Listing is free — turn unused items into cash."],
  ['🌱', 'Grow & share', 'Swap home-grown veg, herbs and plants with neighbours instead of buying.'],
  ['💡', 'Cut energy bills', 'LED bulbs, air-dry laundry in the GC sun, and run appliances on cooler hours.'],
  ['🛒', 'Buy in bulk & split', 'Team up with neighbours on bulk food/household buys and share the savings.'],
  ['🔧', "Repair, don't replace", 'Find a Handy Help tradesperson to fix it for a fraction of buying new.'],
]

export default function EconomicLiving() {
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  const send = async () => {
    if (!tip.trim()) { setError('Please write a tip first.'); return }
    setState('sending'); setError('')
    try {
      await createTrpcClient().crm.submit.mutate({
        type: 'economic_tip',
        message: tip.trim(),
        ...(name.trim() && { name: name.trim() }),
        ...(email.trim() && { email: email.trim() }),
      })
      setState('sent'); setTip('')
    } catch {
      setError('Could not send your tip. Please try again.'); setState('idle')
    }
  }

  return (
    <section style={{ marginTop: 36 }}>
      {/* Header banner */}
      <div style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: '#fff' }}>💡 Economic Living</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, marginTop: 3 }}>
          Smart ways to save, reuse and live well for less on the island. Got a tip? Share it below.
        </div>
      </div>

      {/* Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 8, marginBottom: 14 }}>
        {TIPS.map(([emoji, title, text]) => (
          <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, background: '#fff', border: '1px solid #d6f0e0', borderLeft: '3px solid #22c55e', borderRadius: 12, padding: '11px 12px', boxShadow: '0 1px 5px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark)' }}>{title}</div>
              <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#555', lineHeight: 1.5, marginTop: 2 }}>{text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggest a tip */}
      {state === 'sent' ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: '#16a34a' }}>💡 Thanks! Your tip has been sent for review</div>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#4a7c59', marginTop: 4 }}>Good tips get featured in Economic Living.</div>
          <button onClick={() => setState('idle')} style={{ background: 'none', border: 'none', color: '#16a34a', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}>Send another →</button>
        </div>
      ) : !open ? (
        <button onClick={() => setOpen(true)} style={btn}>💬 Suggest a money-saving tip</button>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #d6f0e0', borderRadius: 14, padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#555', lineHeight: 1.6, marginBottom: 10 }}>
            Share a money-saving idea with the Grabitt community. Good tips get featured!
          </div>
          <textarea value={tip} onChange={e => { setTip(e.target.value); setError('') }} placeholder="Your money-saving tip…"
            style={{ width: '100%', minHeight: 90, border: '1.5px solid #eee', borderRadius: 12, padding: 12, fontFamily: 'var(--font-comfortaa)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" style={field} />
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email (optional)" style={field} />
          </div>
          {error && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#ef4444', marginTop: 8 }}>{error}</div>}
          <button onClick={send} disabled={state === 'sending'} style={{ ...btn, marginTop: 10, opacity: state === 'sending' ? 0.7 : 1 }}>
            {state === 'sending' ? 'Sending…' : 'Send Tip →'}
          </button>
          <button onClick={() => { setOpen(false); setError('') }} style={{ width: '100%', background: 'none', border: 'none', color: '#888', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
        </div>
      )}
    </section>
  )
}

const btn: React.CSSProperties = {
  width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 50,
  padding: 13, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
}
const field: React.CSSProperties = {
  flex: 1, minWidth: 0, border: '1.5px solid #eee', borderRadius: 10, padding: '10px 11px',
  fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, outline: 'none', boxSizing: 'border-box',
}
