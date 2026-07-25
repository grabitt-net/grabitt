'use client'
import { useCallback, useEffect, useState } from 'react'
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
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
]

export default function BusinessView({ execToken, onOpenMember }: {
  execToken: string
  onOpenMember?: (userId: string) => void
}) {
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState<Application[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setRows(null); setErr('')
    try {
      setRows(await makeCrmApi(execToken).businessVerifications(tab) as Application[])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load applications')
      setRows([])
    }
  }, [execToken, tab])

  useEffect(() => { load() }, [load])

  const decide = async (a: Application, decision: 'approved' | 'rejected') => {
    let reason: string | undefined
    if (decision === 'rejected') {
      const r = window.prompt('Reason for rejection (shown to the applicant):')
      if (r === null) return
      if (!r.trim()) { alert('A reason is required to reject.'); return }
      reason = r.trim()
    } else if (!window.confirm(`Approve ${a.legalName || a.user.displayName}? This grants the business badge, storefront and multibuy.`)) {
      return
    }
    setBusy(a.userId)
    try {
      await makeCrmApi(execToken).reviewBusiness(a.userId, decision, reason)
      setRows(rs => (rs ?? []).filter(x => x.userId !== a.userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not record the decision.')
    } finally { setBusy(null) }
  }

  const docLink = (userId: string, kind: string) => `/api/verification-doc?userId=${userId}&kind=${kind}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Business verification</h2>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: tab === id ? '#1a1a1a' : '#fff', color: tab === id ? '#fff' : '#555' }}>{label}</button>
          ))}
        </div>
      </div>

      {err && <div style={{ background: '#fff5f5', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, marginBottom: 12 }}>{err}</div>}

      {!rows ? <div style={{ padding: 30, color: '#999', fontSize: 13 }}>Loading…</div>
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

function DocChip({ label, present, href }: { label: string; present: boolean; href: string }) {
  if (!present) return <span style={{ background: '#f5f5f5', color: '#bbb', borderRadius: 50, padding: '5px 12px', fontSize: 11.5, fontWeight: 700 }}>{label}: none</span>
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ background: '#eef6ff', color: '#1B6CA8', borderRadius: 50, padding: '5px 12px', fontSize: 11.5, fontWeight: 800, textDecoration: 'none' }}>
      📄 {label} ↗
    </a>
  )
}
