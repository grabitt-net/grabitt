'use client'
import { useState } from 'react'
import type { PanelId } from '@/context/PanelContext'
import { trpcAuthed } from '@/lib/authToken'

type Candidate = {
  seekerId: string; headline: string | null; sector: string | null; roles: string[]
  experienceMonths: number; languages: string[]; hours: string[]; availability: string | null
  rightToWork: string | null; location: string | null; rating: number | null; unlocked: boolean
}
type Revealed = { name: string; email: string; phone: string | null; avatar: string | null; location: string | null; languages: string[]; availability: string | null }

function expLabel(m: number) {
  if (!m) return 'Any experience'
  if (m < 12) return `${m} mo experience`
  const y = Math.floor(m / 12)
  return `${y}+ yr${y > 1 ? 's' : ''} experience`
}

// "Find Staff" (Get Staff) — replicates the V20 HTML flow: employers build a job
// spec, we show how many anonymous candidates match, and they buy credits to
// unlock full profiles. Faithful to index.html openGetStaffPanel / runJobMatch.

export const JOB_SECTORS: Record<string, string[]> = {
  Hospitality: ['Bar work', 'Food prep', 'Waiting staff', 'Restaurant management', 'Reception', 'Cleaning', 'Events staff', 'Entertainment', 'Kitchen porter', 'Head chef'],
  Office: ['Reception', 'Administration', 'PA / Executive assistant', 'Supervisor', 'Telephone marketing', 'Research', 'Accounting', 'Bookkeeping', 'Data entry', 'Office management'],
  Legal: ['Lawyer', 'Legal secretary', 'Drafting', 'Administration', 'Court attendance', 'Enforcement', 'Claims handling', 'Witness statements', 'Paralegal', 'Compliance'],
  Retail: ['Shop assistant', 'Supermarket', 'Online retail', 'Cash handling', 'Staff management', 'Cleaning', 'Stock management', 'Visual merchandising', 'Customer service', 'Loss prevention'],
  Construction: ['Labourer', 'Electrician', 'Plumber', 'Carpenter', 'Painter & decorator', 'Tiler', 'Bricklayer', 'Site management', 'Health & safety', 'Project management'],
  Healthcare: ['Nurse', 'Carer', 'Physiotherapist', 'Dentist', 'Doctor', 'Optician', 'Pharmacist', 'Massage therapist', 'Personal trainer', 'Yoga instructor'],
  Education: ['Teacher', 'Teaching assistant', 'Tutor', 'Nursery worker', 'Au pair', 'School admin', 'Sports coach', 'Music teacher', 'Language teacher', 'SEN support'],
  Technology: ['Developer', 'Designer', 'IT support', 'Network engineer', 'Cybersecurity', 'Data analyst', 'Project manager', 'Social media', 'SEO', 'E-commerce'],
  Marine: ['Yacht captain', 'Crew', 'Dive instructor', 'Surf instructor', 'Kayak guide', 'Boat maintenance', 'Fishing guide', 'Water taxi', 'Marina management', 'Sailing instructor'],
  Property: ['Villa cleaner', 'Housekeeper', 'Gardener', 'Pool maintenance', 'Property manager', 'Concierge', 'Driver / Chauffeur', 'Private chef', 'Security', 'Dog walker'],
  'Sales & Marketing': ['Sales executive', 'Sales manager', 'Business development', 'Marketing manager', 'Digital marketing', 'Social media manager', 'Brand coordinator', 'Account manager', 'Telesales', 'Copywriter'],
}
export const JOB_LANGUAGES = ['English', 'Spanish', 'German', 'Swedish', 'Danish', 'Norwegian', 'Dutch', 'French', 'Finnish', 'Italian', 'Polish']
export const JOB_ATTRIBUTES: Record<string, string[]> = {
  hours: ['Full time', 'Part time', 'Seasonal', 'Flexible / Freelance'],
  availability: ['Immediate', '1 month', '3 months', '6 months+'],
  rightToWork: ['EU citizen', 'Non-EU with permit', 'Sponsorship required', 'Student visa'],
  location: ['Las Palmas', 'South GC', 'North GC', 'Remote', 'All areas'],
}
export const EXP_OPTIONS = [['0', 'Any experience'], ['3', '3+ months'], ['6', '6+ months'], ['12', '1+ year'], ['24', '2+ years'], ['36', '3+ years'], ['60', '5+ years']]
const ORANGE = '#FF4500'

const LABEL: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', marginBottom: 6 }
const SELECT: React.CSSProperties = { width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff', outline: 'none', boxSizing: 'border-box' }

export default function FindStaffPanel({ onClose, openPanel }: { onClose: () => void; openPanel: (id: PanelId, data?: Record<string, unknown>) => void }) {
  const [sector, setSector] = useState('')
  const [role, setRole] = useState('')
  const [exp, setExp] = useState('0')
  const [langs, setLangs] = useState<string[]>([])
  const [attrs, setAttrs] = useState<Record<string, string[]>>({ hours: [], availability: [], rightToWork: [], location: [] })
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [unlockCost, setUnlockCost] = useState(10)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({})
  const [unlockingId, setUnlockingId] = useState<string | null>(null)

  const toggleLang = (l: string) => setLangs(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])
  const toggleAttr = (key: string, o: string) => setAttrs(p => ({ ...p, [key]: p[key].includes(o) ? p[key].filter(x => x !== o) : [...p[key], o] }))

  const runMatch = async () => {
    if (!sector) { alert('Pick a sector to match against.'); return }
    setLoading(true)
    try {
      const res = await trpcAuthed().seekers.matchCandidates.query({
        sector,
        role: role || undefined,
        experienceMonths: Number(exp) || undefined,
        languages: langs.length ? langs : undefined,
        hours: attrs.hours.length ? attrs.hours : undefined,
        availability: attrs.availability.length ? attrs.availability : undefined,
        rightToWork: attrs.rightToWork.length ? attrs.rightToWork : undefined,
        location: attrs.location.length ? attrs.location : undefined,
      }) as { count: number; candidates: Candidate[]; unlockCost: number }
      setCandidates(res.candidates)
      setUnlockCost(res.unlockCost)
      setMatchCount(res.count)
    } catch { alert('Could not search candidates. Please sign in as an employer and try again.') }
    finally { setLoading(false) }
  }

  const unlock = async (c: Candidate) => {
    if (revealed[c.seekerId]) return
    setUnlockingId(c.seekerId)
    try {
      const r = await trpcAuthed().seekers.unlockCandidate.mutate({ seekerId: c.seekerId }) as Revealed & { seekerId: string }
      setRevealed(prev => ({ ...prev, [c.seekerId]: r }))
      setCandidates(prev => prev.map(x => x.seekerId === c.seekerId ? { ...x, unlocked: true } : x))
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (msg.includes('credits')) { if (confirm('Not enough credits to unlock. Buy more now?')) { onClose(); openPanel('buyCredits') } }
      else alert('Could not unlock this candidate. Please try again.')
    } finally { setUnlockingId(null) }
  }

  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ background: '#fff', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{matchCount === null ? '💼 Find Staff' : `🎯 ${matchCount} Candidates Found`}</span>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {matchCount === null ? (
            <>
              <div style={{ fontSize: 11, color: ORANGE, fontFamily: 'var(--font-ui)', marginBottom: 14, lineHeight: 1.5 }}>
                Build your job spec below. We&apos;ll match it against anonymous candidate profiles and show you how many qualify. Use credits to unlock full profiles.
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Sector</div>
                <select value={sector} onChange={e => { setSector(e.target.value); setRole('') }} style={SELECT}>
                  <option value="">Select sector…</option>
                  {Object.keys(JOB_SECTORS).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {sector && (
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL}>Role</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {JOB_SECTORS[sector].map(r => (
                      <span key={r} onClick={() => setRole(role === r ? '' : r)} style={{ background: role === r ? ORANGE : '#f0f0f0', color: role === r ? '#fff' : '#555', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{r}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Minimum Experience</div>
                <select value={exp} onChange={e => setExp(e.target.value)} style={SELECT}>
                  {EXP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Languages Required</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {JOB_LANGUAGES.map(l => (
                    <span key={l} onClick={() => toggleLang(l)} style={{ background: langs.includes(l) ? ORANGE : '#f8f9fa', color: langs.includes(l) ? '#fff' : '#1a1a1a', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{l}</span>
                  ))}
                </div>
              </div>

              {(['hours', 'availability', 'rightToWork', 'location'] as const).map(key => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={LABEL}>{key === 'rightToWork' ? 'Right to Work' : key}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {JOB_ATTRIBUTES[key].map(o => (
                      <span key={o} onClick={() => toggleAttr(key, o)} style={{ background: attrs[key].includes(o) ? ORANGE : '#f8f9fa', color: attrs[key].includes(o) ? '#fff' : '#1a1a1a', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{o}</span>
                    ))}
                  </div>
                </div>
              ))}

              <button onClick={runMatch} disabled={loading} style={{ width: '100%', background: ORANGE, color: '#fff', border: 'none', borderRadius: 50, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginTop: 4, opacity: loading ? 0.6 : 1 }}>{loading ? 'Searching…' : '🔍 Find Matching Candidates →'}</button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '16px 0 12px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 64, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>{matchCount}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginTop: 6 }}>{matchCount === 1 ? 'candidate matches' : 'candidates match'} your spec</div>
                <div style={{ fontSize: 12, color: '#666', fontFamily: 'var(--font-ui)', marginTop: 4 }}>{role ? `${role} · ` : ''}Gran Canaria</div>
              </div>

              {matchCount === 0 ? (
                <div style={{ background: '#f8f9fa', borderRadius: 14, padding: 18, textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#555', marginBottom: 4 }}>No candidates match yet</div>
                  <div style={{ fontSize: 12, color: '#888', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>Try widening your spec — fewer required languages or lower minimum experience. New job-seekers register every day.</div>
                </div>
              ) : (
                <>
                  <div style={{ background: '#FFF3EE', border: '1.5px solid #FFD4C0', borderRadius: 14, padding: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>🔒 Spend <strong>{unlockCost} credits</strong> to reveal a candidate&apos;s name, email, phone &amp; availability. Already-unlocked candidates stay free.</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {candidates.map(c => {
                      const rev = revealed[c.seekerId]
                      const isUnlocked = c.unlocked || !!rev
                      return (
                        <div key={c.seekerId} style={{ background: '#f8f9fa', border: '1.5px solid #eee', borderRadius: 14, padding: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, flexShrink: 0 }}>{rev ? rev.name.charAt(0) : (c.roles[0] || c.sector || '?').charAt(0)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 900, color: '#1a1a1a' }}>{rev ? rev.name : (c.headline || c.roles[0] || 'Candidate')}</div>
                              <div style={{ fontSize: 11, color: '#666', fontFamily: 'var(--font-ui)' }}>{[c.sector, c.location].filter(Boolean).join(' · ') || 'Gran Canaria'}{c.rating ? ` · ★ ${Number(c.rating).toFixed(1)}` : ''}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                            {[expLabel(c.experienceMonths), ...(c.languages.slice(0, 3)), c.availability].filter(Boolean).map((tg, i) => (
                              <span key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 50, padding: '3px 9px', fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 700, color: '#555' }}>{tg}</span>
                            ))}
                          </div>

                          {isUnlocked && rev ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#fff', borderRadius: 10, padding: 10 }}>
                              <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: '#1a1a1a' }}>📧 <strong>{rev.email}</strong></div>
                              {rev.phone && <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: '#1a1a1a' }}>📱 <strong>{rev.phone}</strong></div>}
                              {rev.location && <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: '#666' }}>📍 {rev.location}</div>}
                            </div>
                          ) : isUnlocked ? (
                            <div style={{ fontSize: 11, color: '#22c55e', fontFamily: 'var(--font-ui)', fontWeight: 800 }}>✓ Unlocked — reopen to view details</div>
                          ) : (
                            <button onClick={() => unlock(c)} disabled={unlockingId === c.seekerId} style={{ width: '100%', background: ORANGE, color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer', opacity: unlockingId === c.seekerId ? 0.6 : 1 }}>{unlockingId === c.seekerId ? 'Unlocking…' : `🔓 Unlock · ${unlockCost} credits`}</button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div onClick={() => { onClose(); openPanel('buyCredits') }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF3EE', border: `1.5px solid ${ORANGE}`, borderRadius: 12, padding: 12, cursor: 'pointer', marginBottom: 12 }}>
                    <div style={{ fontSize: 22 }}>🪙</div>
                    <div style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: '#1a1a1a' }}>Need more credits? Top up →</div>
                  </div>
                </>
              )}

              <button onClick={() => setMatchCount(null)} style={{ width: '100%', background: '#fff', color: '#666', border: '1.5px solid #eee', borderRadius: 50, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>← Adjust spec</button>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#666', fontFamily: 'var(--font-ui)' }}>Secure payment via Stripe · Credits never expire · Must be a registered employer</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
