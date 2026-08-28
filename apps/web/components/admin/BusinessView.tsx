'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast, confirmDialog } from '@/lib/ui'
import { makeCrmApi } from '@/lib/admin-api'

// The business verification review queue. Applications arrive with the seller's
// registered details and documents; a reviewer opens each document, then
// approves (which grants the badge and unlocks the storefront and multibuy) or
// rejects with a reason the applicant will see.

type Application = {
  userId: string; status: string
  legalName: string | null; taxId: string | null; website: string | null
  socials: { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; x?: string } | null
  submittedAt: string | null
  hasRegistration: boolean; hasModelo036: boolean; hasProofOfAddress: boolean
  user: { id: string; displayName: string; email: string; businessName: string | null; createdAt: string }
}

const TABS: [string, string][] = [
  ['businesses', 'Businesses'],
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
]

type BizMember = {
  id: string; displayName: string; email: string; businessName: string | null; verified: boolean
  tierLabel: string; feePct: number; rating: number | null; salesTotal: number; sales90d: number
  next: { label: string; needSales: number; needRating: number } | null
}

export default function BusinessView({ execToken, onOpenMember }: {
  execToken: string
  onOpenMember?: (userId: string) => void
}) {
  const [tab, setTab] = useState('businesses')
  const [rows, setRows] = useState<Application[] | null>(null)
  const [bizMembers, setBizMembers] = useState<BizMember[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setErr('')
    try {
      if (tab === 'businesses') {
        setBizMembers(null)
        setBizMembers(await makeCrmApi(execToken).businessMembers() as BizMember[])
      } else {
        setRows(null)
        setRows(await makeCrmApi(execToken).businessVerifications(tab) as Application[])
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load')
      if (tab === 'businesses') setBizMembers([]); else setRows([])
    }
  }, [execToken, tab])

  useEffect(() => { load() }, [load])

  const decide = async (a: Application, decision: 'approved' | 'rejected') => {
    let reason: string | undefined
    if (decision === 'rejected') {
      const r = window.prompt('Reason for rejection (shown to the applicant):')
      if (r === null) return
      if (!r.trim()) { toast('A reason is required to reject.'); return }
      reason = r.trim()
    } else if (!(await confirmDialog({ message: `Approve ${a.legalName || a.user.displayName}? This grants the business badge, storefront and multibuy.`, confirmLabel: 'Approve' }))) {
      return
    }
    setBusy(a.userId)
    try {
      await makeCrmApi(execToken).reviewBusiness(a.userId, decision, reason)
      setRows(rs => (rs ?? []).filter(x => x.userId !== a.userId))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not record the decision.')
    } finally { setBusy(null) }
  }

  const docLink = (userId: string, kind: string) => `/api/verification-doc?userId=${userId}&kind=${kind}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{tab === 'businesses' ? 'Business accounts' : 'Business verification'}</h2>
        {tab === 'businesses' && (
          <button onClick={() => setShowAdd(true)} style={{ border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'var(--orange)', color: '#fff' }}>+ Add business</button>
        )}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: tab === id ? '#1a1a1a' : '#fff', color: tab === id ? '#fff' : '#555' }}>{label}</button>
          ))}
        </div>
      </div>

      {showAdd && <AddBusinessModal execToken={execToken} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); setTab('businesses'); load() }} />}

      {err && <div style={{ background: '#fff5f5', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, marginBottom: 12 }}>{err}</div>}

      {tab === 'businesses' ? (
        !bizMembers ? <div style={{ padding: 30, color: '#999', fontSize: 13 }}>Loading…</div>
        : bizMembers.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>No business accounts yet.</div>
        : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Nunito, sans-serif', fontSize: 12.5 }}>
              <thead><tr style={{ textAlign: 'left', color: '#999', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {['Business', 'Level', 'Feedback', 'Sales (90d / total)', 'Progress to next', ''].map(h => <th key={h} style={{ padding: '10px 14px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {bizMembers.map(b => {
                  const salesPct = b.next ? Math.min(100, Math.round((b.sales90d / Math.max(1, b.next.needSales)) * 100)) : 100
                  const ratingOk = b.next ? (b.rating ?? 0) >= b.next.needRating : true
                  return (
                    <tr key={b.id} style={{ borderTop: '1px solid #f5f0e8' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#1a1a1a' }}>{b.businessName || <span style={{ color: '#c0392b' }}>No business name</span>}</div>
                        <div style={{ color: '#999', fontSize: 11 }}>{b.displayName} · {b.email}{b.verified ? ' · ✓ verified' : ''}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontWeight: 800, color: '#1e2b55' }}>{b.tierLabel}</span><div style={{ color: '#999', fontSize: 11 }}>{b.feePct}% fee</div></td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#1a1a1a' }}>{b.rating != null && b.rating > 0 ? `★ ${b.rating.toFixed(1)}` : '★ —'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#1a1a1a' }}>{b.sales90d} <span style={{ color: '#bbb', fontWeight: 600 }}>/ {b.salesTotal}</span></td>
                      <td style={{ padding: '10px 14px', minWidth: 170 }}>
                        {b.next ? (
                          <div>
                            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>To {b.next.label}: sales {b.sales90d}/{b.next.needSales} · ★ {ratingOk ? '✓' : `${(b.rating ?? 0).toFixed(1)}/${b.next.needRating}`}</div>
                            <div style={{ height: 6, background: '#eef2f8', borderRadius: 50, overflow: 'hidden' }}><div style={{ width: `${salesPct}%`, height: '100%', background: salesPct >= 100 && ratingOk ? '#16a34a' : 'var(--orange)' }} /></div>
                          </div>
                        ) : <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 11 }}>Top level ✓</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}><button onClick={() => onOpenMember?.(b.id)} style={{ background: '#eef4ff', color: '#2563eb', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Open</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : !rows ? <div style={{ padding: 30, color: '#999', fontSize: 13 }}>Loading…</div>
      : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>Nothing {tab}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(a => (
            <div key={a.userId} style={{ border: '1px solid #eee', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>{a.legalName || a.user.businessName || a.user.displayName}</div>
                  <button onClick={() => onOpenMember?.(a.user.id)} style={{ background: 'none', border: 'none', padding: 0, color: '#1B6CA8', fontSize: 12, cursor: onOpenMember ? 'pointer' : 'default' }}>
                    {a.user.displayName} · {a.user.email}
                  </button>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 12, color: '#555' }}>
                    {a.taxId && <span>🧾 {a.taxId}</span>}
                    {a.website && <a href={a.website.startsWith('http') ? a.website : `https://${a.website}`} target="_blank" rel="noreferrer" style={{ color: '#1B6CA8' }}>🌐 Website</a>}
                    {a.submittedAt && <span style={{ color: '#999' }}>Submitted {new Date(a.submittedAt).toLocaleDateString()}</span>}
                  </div>
                  {a.socials && Object.values(a.socials).some(Boolean) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 11.5, color: '#888' }}>
                      {a.socials.instagram && <span>IG: {a.socials.instagram}</span>}
                      {a.socials.facebook && <span>FB: {a.socials.facebook}</span>}
                      {a.socials.tiktok && <span>TT: {a.socials.tiktok}</span>}
                      {a.socials.linkedin && <span>LI: {a.socials.linkedin}</span>}
                      {a.socials.x && <span>X: {a.socials.x}</span>}
                    </div>
                  )}
                </div>

                {tab === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => decide(a, 'approved')} disabled={busy === a.userId} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>{busy === a.userId ? '…' : 'Approve'}</button>
                    <button onClick={() => decide(a, 'rejected')} disabled={busy === a.userId} style={{ background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Reject</button>
                  </div>
                )}
              </div>

              {/* Documents — open in a new tab via a short-lived signed URL. */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <DocChip label="Registration" present={a.hasRegistration} href={docLink(a.userId, 'registration')} />
                <DocChip label="Modelo 036/037" present={a.hasModelo036} href={docLink(a.userId, 'modelo036')} />
                <DocChip label="Proof of address" present={a.hasProofOfAddress} href={docLink(a.userId, 'proof')} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Create a brand-new business account (invites the person + seeds a business
// User row). Grade defaults to Dealer (the Business tier); admins can bump it.
function AddBusinessModal({ execToken, onClose, onCreated }: { execToken: string; onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [grade, setGrade] = useState('dealer')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!email.trim() || !displayName.trim()) { setErr('Email and contact name are required.'); return }
    setBusy(true); setErr('')
    try {
      await makeCrmApi(execToken).memberAuthAction({
        action: 'create_member',
        email: email.trim(), displayName: displayName.trim(),
        grade, isBusiness: true,
        ...(businessName.trim() && { businessName: businessName.trim() }),
      })
      toast('✓ Business account created — an invite email was sent.')
      onCreated()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not create the account.') } finally { setBusy(false) }
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 11px', fontFamily: 'Nunito, sans-serif', fontSize: 13, marginBottom: 10, outline: 'none' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99997, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 440 }}>
        <h3 style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 17, fontWeight: 700, margin: '0 0 14px' }}>Add a business account</h3>
        {err && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 11px', fontSize: 12, marginBottom: 12 }}>{err}</div>}
        <label style={lbl}>Business name</label>
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Estates" style={inp} />
        <label style={lbl}>Contact name</label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Doe" style={inp} />
        <label style={lbl}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="owner@acme.com" style={inp} />
        <label style={lbl}>Starting level</label>
        <select value={grade} onChange={e => setGrade(e.target.value)} style={inp}>
          <option value="dealer">Business (Dealer)</option>
          <option value="trader">Business Plus (Trader)</option>
          <option value="pro">Business Pro (Pro)</option>
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={onClose} style={{ border: '1.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ border: 'none', background: 'var(--orange)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Creating…' : 'Create business'}</button>
        </div>
      </div>
    </div>
  )
}

function DocChip({ label, present, href }: { label: string; present: boolean; href: string }) {
  if (!present) return <span style={{ background: '#f5f5f5', color: '#bbb', borderRadius: 50, padding: '5px 12px', fontSize: 11.5, fontWeight: 700 }}>{label}: none</span>
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ background: '#eef6ff', color: '#1B6CA8', borderRadius: 50, padding: '5px 12px', fontSize: 11.5, fontWeight: 800, textDecoration: 'none' }}>
      📄 {label} ↗
    </a>
  )
}
