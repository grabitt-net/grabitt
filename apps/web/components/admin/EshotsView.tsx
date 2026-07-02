'use client'
import { useState } from 'react'

const TEMPLATE_CATEGORIES = ['Welcome', 'Promo', 'Newsletter', 'Re-engage', 'Grade upgrade', 'Seasonal', 'Event', 'Survey', 'Farewell']

const TEMPLATES = [
  { id: 't1', name: 'Welcome to Grabitt', category: 'Welcome', subject: 'Welcome to Gran Canaria\'s marketplace 🌴', lastUsed: '15 Jun' },
  { id: 't2', name: 'Summer Deals Launch', category: 'Promo', subject: '☀️ Summer deals are LIVE — grab them now!', lastUsed: '1 Jul' },
  { id: 't3', name: 'Re-engage Inactive', category: 'Re-engage', subject: 'We miss you! Here\'s what\'s new on Grabitt', lastUsed: '20 Jun' },
  { id: 't4', name: 'Grade Upgrade: Dealer', category: 'Grade upgrade', subject: '🟡 Congratulations — you\'re now a Dealer!', lastUsed: '28 Jun' },
]

const CAMPAIGNS = [
  { id: 'c1', name: 'July Newsletter', template: 'Summer Deals Launch', status: 'sent', recipients: 312, opens: 187, clicks: 63, sentAt: '1 Jul 2026' },
  { id: 'c2', name: 'Re-engage June batch', template: 'Re-engage Inactive', status: 'sent', recipients: 48, opens: 22, clicks: 9, sentAt: '20 Jun 2026' },
  { id: 'c3', name: 'August promo', template: '', status: 'draft', recipients: 0, opens: 0, clicks: 0, sentAt: '' },
]

export default function EshotsView() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'compose'>('campaigns')
  const [selectedCat, setSelectedCat] = useState('All')
  const [composeName, setComposeName] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const shownTemplates = selectedCat === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.category === selectedCat)

  async function sendCampaign() {
    if (!composeName.trim() || !composeSubject.trim() || !composeBody.trim()) return
    setSending(true)
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    setSent(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>E-shots</span>
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['campaigns', 'templates', 'compose'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, background: activeTab === tab ? 'var(--orange)' : '#fff', color: activeTab === tab ? '#fff' : '#666', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textTransform: 'capitalize' }}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === 'campaigns' && (
        <>
          {CAMPAIGNS.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{c.template || 'No template'} {c.sentAt && `· Sent ${c.sentAt}`}</div>
                </div>
                <span style={{ background: c.status === 'sent' ? '#d1fae5' : '#f5f0e8', color: c.status === 'sent' ? '#065f46' : '#888', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50, textTransform: 'uppercase' }}>{c.status}</span>
              </div>
              {c.status === 'sent' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[['📤', 'Sent', c.recipients], ['👁', 'Opens', c.opens], ['🖱', 'Clicks', c.clicks]].map(([icon, label, val]) => (
                    <div key={String(label)} style={{ background: '#f9f6f2', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>{val}</div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#888', fontWeight: 800 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
              {c.status === 'draft' && (
                <button onClick={() => setActiveTab('compose')} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '7px 16px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, cursor: 'pointer', marginTop: 4 }}>Edit & Send →</button>
              )}
            </div>
          ))}
        </>
      )}

      {activeTab === 'templates' && (
        <>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16, paddingBottom: 4 }}>
            {['All', ...TEMPLATE_CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setSelectedCat(cat)} style={{ background: selectedCat === cat ? 'var(--orange)' : '#fff', color: selectedCat === cat ? '#fff' : '#666', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>{cat}</button>
            ))}
          </div>
          {shownTemplates.map(t => (
            <div key={t.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)', marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{t.subject}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', marginTop: 3 }}>Category: {t.category} · Last used: {t.lastUsed}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ background: '#f5f0e8', color: '#555', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => { setActiveTab('compose'); setComposeSubject(t.subject) }} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Use</button>
              </div>
            </div>
          ))}
          <button style={{ width: '100%', background: '#f5f0e8', color: '#555', border: '2px dashed #e0d8d0', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}>+ New Template</button>
        </>
      )}

      {activeTab === 'compose' && !sent && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Campaign name</div>
          <input value={composeName} onChange={e => setComposeName(e.target.value)} placeholder="e.g. August Newsletter" style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Subject line</div>
          <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="e.g. ☀️ August deals are LIVE!" style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Email body</div>
          <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder="Write your email content here…" rows={8} style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />
          <button onClick={sendCampaign} disabled={sending || !composeName.trim() || !composeSubject.trim() || !composeBody.trim()} style={{ width: '100%', background: sending || !composeName.trim() || !composeSubject.trim() || !composeBody.trim() ? '#ccc' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
            {sending ? '📤 Sending…' : '📧 Send Campaign'}
          </button>
        </div>
      )}

      {activeTab === 'compose' && sent && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Campaign sent!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 20 }}>"{composeName}" is on its way to your subscribers.</div>
          <button onClick={() => { setSent(false); setActiveTab('campaigns') }} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>View Campaigns</button>
        </div>
      )}
    </div>
  )
}
