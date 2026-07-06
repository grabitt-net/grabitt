'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const filters = ['All', 'Active', 'Sellers', 'Buyers', 'New']

const gradeColors: Record<string, string> = {
  grabber: '#FF4500', dealer: '#f59e0b', trader: '#3b82f6', pro: '#7c3aed',
}

interface Props { members: any[]; focusUserId?: string | null }

export default function MembersView({ members: initial, focusUserId }: Props) {
  const [members, setMembers] = useState(initial)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState<any | null>(null)

  // Open a specific member's detail when navigated here (e.g. from Compliance).
  useEffect(() => {
    if (!focusUserId) return
    const m = members.find(x => x.id === focusUserId)
    if (m) setSelected(m)
  }, [focusUserId, members])
  const [chatMsg, setChatMsg] = useState('')
  const [chatHistory, setChatHistory] = useState<{ channel: string; text: string; time: string }[]>([])
  const [auditLog, setAuditLog] = useState<{ time: string; action: string }[]>([])
  const [showSuspend, setShowSuspend] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendDays, setSuspendDays] = useState('7')
  const [showBan, setShowBan] = useState(false)

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const filtered = members.filter(m => {
    const matchSearch = [m.full_name, m.email].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    if (!matchSearch) return false
    if (filter === 'Sellers') return m.is_seller
    if (filter === 'Buyers') return !m.is_seller
    if (filter === 'Active') return m.status === 'active'
    if (filter === 'New') return new Date(m.created_at) > thirtyDaysAgo
    return true
  })

  function openDetail(m: any) {
    setSelected(m)
    setChatHistory([])
    setSuspendReason('')
    setShowSuspend(false)
    setShowBan(false)
    setAuditLog(m.audit ?? [])
  }

  function addAudit(action: string) {
    const entry = { time: new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }), action }
    setAuditLog(prev => [entry, ...prev])
  }

  function sendMsg(channel: string) {
    if (!chatMsg.trim()) return
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    setChatHistory(prev => [...prev, { channel, text: chatMsg.trim(), time }])
    addAudit(`Message sent via ${channel}: "${chatMsg.trim()}"`)
    setChatMsg('')
  }

  async function suspend() {
    if (!suspendReason.trim()) return
    const supabase = createClient()
    const until = new Date(Date.now() + parseInt(suspendDays) * 86400000).toISOString()
    await supabase.from('users').update({ suspended_until: until, suspended_reason: suspendReason }).eq('id', selected.id)
    setMembers(ms => ms.map(m => m.id === selected.id ? { ...m, status: 'suspended' } : m))
    setSelected((s: any) => ({ ...s, status: 'suspended' }))
    addAudit(`Suspended for ${suspendDays} days — ${suspendReason}`)
    setShowSuspend(false)
    setSuspendReason('')
  }

  async function ban() {
    const supabase = createClient()
    await supabase.from('users').update({ status: 'banned' }).eq('id', selected.id)
    setMembers(ms => ms.map(m => m.id === selected.id ? { ...m, status: 'banned' } : m))
    setSelected((s: any) => ({ ...s, status: 'banned' }))
    addAudit('Account banned by admin')
    setShowBan(false)
  }

  async function markReview() {
    const supabase = createClient()
    await supabase.from('users').update({ status: 'under_review' }).eq('id', selected.id)
    setMembers(ms => ms.map(m => m.id === selected.id ? { ...m, status: 'under_review' } : m))
    setSelected((s: any) => ({ ...s, status: 'under_review' }))
    addAudit('Flagged for review by admin')
  }

  const statusColor: Record<string, string> = {
    active: '#16a34a', suspended: '#f97316', banned: '#ef4444', under_review: '#a855f7',
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Members</span>
          <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginLeft: 8 }}>{members.length} total</span>
        </h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
          style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 50, fontFamily: 'var(--font-ui)', fontSize: 12, width: 200, outline: 'none' }} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, background: filter === f ? '#FF4500' : '#fff', color: filter === f ? '#fff' : '#666', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {['Member', 'Email', 'Grade', 'Sales', 'Joined', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} onClick={() => openDetail(m)} style={{ borderBottom: '1px solid #f9f9f9', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FFF3EE')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13 }}>{m.full_name ?? 'Anonymous'}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>{m.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  {m.grade && <span style={{ color: gradeColors[m.grade] ?? '#aaa', fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 11, textTransform: 'capitalize' }}>{m.grade}</span>}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555' }}>{m.sales_count ?? 0}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, color: '#999' }}>
                  {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: `${statusColor[m.status ?? 'active']}18`, color: statusColor[m.status ?? 'active'], borderRadius: 50, padding: '3px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)' }}>
                    {m.status ?? 'active'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, color: '#FF4500', fontWeight: 800 }}>View →</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px 14px', textAlign: 'center', color: '#ccc', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No members found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Member detail side panel */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99996 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, width: 360, maxWidth: '95vw', height: '100vh', background: '#fff', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>

            {/* Header */}
            <div style={{ background: '#E8DDD5', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{selected.full_name ?? 'Member'}</div>
                <div style={{ fontSize: 11, color: gradeColors[selected.grade] ?? '#888', fontWeight: 800, textTransform: 'capitalize', marginTop: 2 }}>{selected.grade ?? 'grabber'}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            {/* Status bar */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: `${statusColor[selected.status ?? 'active']}18`, color: statusColor[selected.status ?? 'active'], borderRadius: 50, padding: '4px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800 }}>
                {selected.status ?? 'active'}
              </span>
              <span style={{ fontSize: 10, color: '#666', fontFamily: 'Nunito, sans-serif' }}>
                {selected.email_verified ? '✅ Email verified' : '⚠️ Unverified email'}
              </span>
            </div>

            <div style={{ padding: 16 }}>

              {/* Contact info */}
              <Section label="Contact Info">
                <InfoRow icon="📧" text={selected.email} />
                <InfoRow icon="📍" text={selected.location ?? 'Gran Canaria'} />
                <InfoRow icon="🪪" text={`ID: ${selected.id?.slice(0, 8)}`} />
              </Section>

              {/* Seller stats */}
              <Section label="Seller Stats">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[['💰', 'Sales', selected.sales_count ?? 0], ['⭐', 'Rating', selected.avg_rating ? Number(selected.avg_rating).toFixed(1) : '—'], ['💬', 'Reviews', selected.review_count ?? 0]].map(([icon, label, val]) => (
                    <div key={String(label)} style={{ background: '#f9f6f2', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 16, color: '#1a1a1a' }}>{val}</div>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9, color: '#888', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Loyalty & credits */}
              <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#FF4500', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Loyalty & Credits</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[['🪙', 'Credits', selected.credits ?? 0], ['🎁', 'Bonus', '—'], ['🏆', 'Grade', selected.grade ?? '—']].map(([icon, label, val]) => (
                    <div key={String(label)} style={{ background: '#fff', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16 }}>{icon}</div>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 14, color: '#FF4500' }}>{val}</div>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9, color: '#888', fontWeight: 800 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety & strikes */}
              <div style={{ background: '#fff8f0', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Safety & Strikes</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#1a1a1a' }}>
                  Strike count: <strong>{selected.strike_count ?? 0}</strong>
                </div>
                {selected.suspended_until && (
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#f97316', marginTop: 4 }}>
                    Suspended until: {new Date(selected.suspended_until).toLocaleDateString('en-GB')}
                    {selected.suspended_reason && ` — ${selected.suspended_reason}`}
                  </div>
                )}
              </div>

              {/* Conversation log */}
              <Section label="Conversation Log">
                <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 10, maxHeight: 150, overflowY: 'auto', marginBottom: 8 }}>
                  {chatHistory.length === 0
                    ? <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#bbb', textAlign: 'center' }}>No messages yet</div>
                    : chatHistory.map((h, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9, color: '#888', fontWeight: 800 }}>{h.channel.toUpperCase()} · {h.time}</span>
                        <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 11, color: '#333' }}>{h.text}</div>
                      </div>
                    ))}
                </div>
                <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)} rows={2} placeholder="Type message…"
                  style={{ width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '8px 12px', fontFamily: 'Comfortaa, sans-serif', fontSize: 11, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['💬', 'grabitt', '#FF4500'], ['📧', 'email', '#3b82f6'], ['📱', 'whatsapp', '#22c55e']].map(([icon, ch, bg]) => (
                    <button key={ch} onClick={() => sendMsg(ch)} style={{ background: bg, color: '#fff', border: 'none', borderRadius: 50, padding: '7px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                      {icon} {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Audit trail */}
              <Section label="Grabitt Actions">
                <div style={{ background: '#FFF3EE', borderRadius: 10, padding: 10, maxHeight: 150, overflowY: 'auto' }}>
                  {auditLog.length === 0
                    ? <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#bbb', textAlign: 'center' }}>No actions recorded</div>
                    : auditLog.map((a, i) => (
                      <div key={i} style={{ borderBottom: i < auditLog.length - 1 ? '1px solid #ffe8d8' : 'none', paddingBottom: 6, marginBottom: 6 }}>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#333' }}>{a.action}</div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>{a.time}</div>
                      </div>
                    ))}
                </div>
              </Section>

              {/* Admin actions */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Admin Actions</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ActionBtn color="#3b82f6" onClick={() => addAudit('Profile viewed for editing')}>✏️ Edit Profile</ActionBtn>
                  <ActionBtn color="#f97316" onClick={() => setShowSuspend(true)}>⏸ Suspend</ActionBtn>
                  <ActionBtn color="#a855f7" onClick={markReview}>🔍 Review</ActionBtn>
                  <ActionBtn color="#ef4444" onClick={() => setShowBan(true)}>🚫 Ban</ActionBtn>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Suspend overlay */}
      {showSuspend && (
        <div onClick={() => setShowSuspend(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 380, maxWidth: '95vw', overflow: 'hidden' }}>
            <div style={{ background: '#f97316', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>⏸ Suspend Member</div>
              <button onClick={() => setShowSuspend(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: '#fff', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#555', marginBottom: 14 }}>
                Suspend <strong>{selected?.full_name}</strong>? They won't be able to buy or sell until the suspension ends.
              </div>
              <select value={suspendDays} onChange={e => setSuspendDays(e.target.value)} style={{ width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: 10, fontFamily: 'Comfortaa, sans-serif', fontSize: 12, boxSizing: 'border-box', marginBottom: 10 }}>
                {[['3', '3 days'], ['7', '7 days'], ['14', '14 days'], ['30', '30 days'], ['90', '90 days']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension…" rows={3}
                style={{ width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '9px 12px', fontFamily: 'Comfortaa, sans-serif', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowSuspend(false)} style={{ background: '#f0f0f0', color: '#666', border: 'none', borderRadius: 50, padding: '10px 20px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button onClick={suspend} disabled={!suspendReason.trim()} style={{ background: !suspendReason.trim() ? '#ccc' : '#f97316', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 20px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Suspend</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ban confirm overlay */}
      {showBan && (
        <div onClick={() => setShowBan(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 360, maxWidth: '95vw', overflow: 'hidden' }}>
            <div style={{ background: '#ef4444', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>🚫 Ban Member</div>
              <button onClick={() => setShowBan(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: '#fff', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#555', marginBottom: 20 }}>
                Permanently ban <strong>{selected?.full_name}</strong>? This action cannot be easily undone and will immediately remove their access.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowBan(false)} style={{ background: '#f0f0f0', color: '#666', border: 'none', borderRadius: 50, padding: '10px 20px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button onClick={ban} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 20px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Yes, Ban Member</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', fontFamily: 'Comfortaa, sans-serif', fontSize: 12, color: '#555' }}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function ActionBtn({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: color, color: '#fff', border: 'none', borderRadius: 50, padding: '8px 16px', fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
      {children}
    </button>
  )
}
