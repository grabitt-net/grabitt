'use client'
import { useState } from 'react'
import { useCrmApi } from './AdminApp'

const filters = ['open', 'under_review', 'resolved_buyer', 'resolved_seller', 'all']

const statusColor: Record<string, string> = {
  open: '#ef4444', under_review: '#f59e0b',
  resolved_buyer: '#16a34a', resolved_seller: '#16a34a', escalated: '#7c3aed',
}

interface Props { disputes: any[]; onUpdate: (disputes: any[]) => void }

export default function DisputesView({ disputes: initial, onUpdate }: Props) {
  const api = useCrmApi()
  const [disputes, setDisputes] = useState(initial)
  const [filter, setFilter] = useState('open')
  const [selected, setSelected] = useState<any | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

  function openDetail(d: any) {
    setSelected(d)
    setNotes(d.resolution ?? '')
  }

  async function rule(outcome: string) {
    if (!selected) return
    setSaving(true)
    try {
      await api.resolveDispute(selected.id, notes, outcome)
      const next = disputes.map(d => d.id === selected.id ? { ...d, status: outcome, resolution: notes } : d)
      setDisputes(next)
      onUpdate(next)
      setSelected((s: any) => ({ ...s, status: outcome, resolution: notes }))
    } finally {
      setSaving(false)
    }
  }

  const isOpen = selected && (selected.status === 'open' || selected.status === 'under_review')

  return (
    <div>
      {/* Header + filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>Disputes</span>
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 10,
              background: filter === f ? 'var(--orange)' : '#fff',
              color: filter === f ? '#fff' : '#666',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textTransform: 'capitalize',
            }}>{f.replace(/_/g, ' ')}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚖️</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, color: '#aaa' }}>No {filter.replace(/_/g, ' ')} disputes</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(d => (
            <div key={d.id} onClick={() => openDetail(d)} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', cursor: 'pointer', borderLeft: `4px solid ${statusColor[d.status] ?? '#ccc'}` }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFF3EE')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: `${statusColor[d.status] ?? '#888'}22`, color: statusColor[d.status] ?? '#888', borderRadius: 50, padding: '2px 10px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)' }}>
                    {d.status?.replace(/_/g, ' ') ?? 'open'}
                  </span>
                  {d.transaction?.amount && (
                    <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 13, color: 'var(--orange)' }}>
                      €{Number(d.transaction.amount).toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
                  {d.reason ?? d.transaction?.listing?.title ?? 'Dispute'}
                </div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-ui)' }}>
                  {d.raisedBy?.displayName ?? d.raisedBy?.email ?? 'Unknown'}
                  {' · '}{new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {' · '}<span style={{ color: 'var(--orange)', fontWeight: 800 }}>View →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispute detail side panel */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99996 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, width: 400, maxWidth: '95vw', height: '100vh', background: '#fff', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>

            {/* Header */}
            <div style={{ background: '#E8DDD5', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>⚖️ Dispute Detail</div>
                <div style={{ fontSize: 10, color: '#888', fontFamily: 'Nunito, sans-serif', marginTop: 2 }}>
                  <span style={{ background: `${statusColor[selected.status] ?? '#888'}22`, color: statusColor[selected.status] ?? '#888', borderRadius: 50, padding: '2px 8px', fontWeight: 800 }}>
                    {selected.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            <div style={{ padding: 16 }}>

              {/* Transaction info */}
              <PanelSection label="Transaction">
                <InfoItem label="Title" value={selected.transaction?.listing?.title ?? selected.reason ?? '—'} />
                <InfoItem label="Amount" value={selected.transaction?.amount ? `€${Number(selected.transaction.amount).toFixed(2)}` : '—'} />
                <InfoItem label="Date" value={new Date(selected.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })} />
                <InfoItem label="Ref" value={selected.id?.slice(0, 8).toUpperCase()} />
              </PanelSection>

              {/* Parties */}
              <PanelSection label="Parties">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <PartyBox role="Buyer" name={selected.raisedBy?.displayName ?? selected.raisedBy?.email ?? 'Unknown'} color="#f97316" />
                  <PartyBox role="Seller" name={selected.transaction?.seller?.displayName ?? selected.transaction?.seller?.email ?? 'Unknown'} color="#3b82f6" />
                </div>
              </PanelSection>

              {/* Buyer case — the written reason, plus any photos attached.
                  evidence is an array of private storage paths, so each opens
                  through /api/dispute-evidence rather than a public URL. */}
              <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🛒 Buyer&apos;s Case</div>
                <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 12, color: '#333', lineHeight: 1.5 }}>
                  {selected.reason ?? 'No statement provided'}
                </div>
                {Array.isArray(selected.evidence) && selected.evidence.length > 0 && (
                  <>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9.5, fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: 0.6, margin: '10px 0 5px' }}>
                      Evidence ({selected.evidence.length})
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selected.evidence.map((_: string, i: number) => (
                        <a key={i} href={`/api/dispute-evidence?disputeId=${selected.id}&i=${i}`} target="_blank" rel="noreferrer"
                          style={{ width: 60, height: 60, borderRadius: 8, border: '1px solid #ffd4c0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, textDecoration: 'none' }}>
                          📷
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Seller case */}
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🏷 Seller's Case</div>
                <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 12, color: '#333', lineHeight: 1.5 }}>
                  {selected.sellerEvidence ?? 'No statement provided'}
                </div>
              </div>

              {/* Funds status */}
              <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>💳 Stripe Funds</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Nunito, sans-serif', fontSize: 12 }}>
                  <span style={{ color: '#555' }}>Status:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>In Escrow</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Nunito, sans-serif', fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: '#555' }}>Amount:</span>
                  <span style={{ fontWeight: 800 }}>{selected.transaction?.amount ? `€${Number(selected.transaction.amount).toFixed(2)}` : '—'}</span>
                </div>
              </div>

              {/* Buyer audit trail */}
              <PanelSection label="Buyer Audit Trail">
                <div style={{ background: '#f9f6f2', borderRadius: 10, padding: 10, maxHeight: 100, overflowY: 'auto' }}>
                  {(selected.buyerAudit ?? []).length === 0
                    ? <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#bbb', textAlign: 'center' }}>No audit entries</div>
                    : (selected.buyerAudit ?? []).map((a: any, i: number) => (
                      <div key={i} style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#555', marginBottom: 4 }}>{a.action} <span style={{ color: '#bbb' }}>· {a.time}</span></div>
                    ))}
                </div>
              </PanelSection>

              {/* Seller audit trail */}
              <PanelSection label="Seller Audit Trail">
                <div style={{ background: '#f9f6f2', borderRadius: 10, padding: 10, maxHeight: 100, overflowY: 'auto' }}>
                  {(selected.sellerAudit ?? []).length === 0
                    ? <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#bbb', textAlign: 'center' }}>No audit entries</div>
                    : (selected.sellerAudit ?? []).map((a: any, i: number) => (
                      <div key={i} style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#555', marginBottom: 4 }}>{a.action} <span style={{ color: '#bbb' }}>· {a.time}</span></div>
                    ))}
                </div>
              </PanelSection>

              {/* Appeal */}
              {selected.appealed && (
                <div style={{ background: '#faf5ff', borderRadius: 12, padding: 12, marginBottom: 14, border: '1.5px solid #e9d5ff' }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>⚡ Appeal Filed</div>
                  <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 12, color: '#333' }}>{selected.appealReason ?? 'No appeal statement'}</div>
                </div>
              )}

              {/* Internal notes */}
              <PanelSection label="Grabitt Internal Notes">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add resolution notes…" rows={3}
                  style={{ width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '9px 12px', fontFamily: 'Comfortaa, sans-serif', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </PanelSection>

              {/* Ruling buttons */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Ruling</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <RulingBtn color="#16a34a" disabled={saving} onClick={() => rule('resolved_buyer')}>
                      ✅ Rule for Buyer — Release Refund
                    </RulingBtn>
                    <RulingBtn color="#3b82f6" disabled={saving} onClick={() => rule('resolved_seller')}>
                      ✅ Rule for Seller — Release Funds
                    </RulingBtn>
                    <RulingBtn color="#f97316" disabled={saving} onClick={() => rule('partial')}>
                      ⚖️ Partial Resolution
                    </RulingBtn>
                    <RulingBtn color="#6b7280" disabled={saving} onClick={() => rule('escalated')}>
                      ❌ No Action — Insufficient Evidence
                    </RulingBtn>
                  </div>
                </div>
              )}

              {!isOpen && selected.resolution && (
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 12, marginTop: 14 }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Resolution</div>
                  <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 12, color: '#333' }}>{selected.resolution}</div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: '#888' }}>{label}</span>
      <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 700, color: '#333' }}>{value}</span>
    </div>
  )
}

function PartyBox({ role, name, color }: { role: string; name: string; color: string }) {
  return (
    <div style={{ background: `${color}12`, borderRadius: 10, padding: '10px 12px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{role}</div>
      <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 12, color: '#1a1a1a', fontWeight: 700 }}>{name}</div>
    </div>
  )
}

function RulingBtn({ color, disabled, onClick, children }: { color: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: color, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer', textAlign: 'left', opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  )
}
