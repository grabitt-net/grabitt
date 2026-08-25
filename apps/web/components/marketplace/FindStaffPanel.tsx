'use client'
import { useEffect, useState } from 'react'
import { toast, confirmDialog } from '@/lib/ui'
import type { PanelId } from '@/context/PanelContext'
import { trpcAuthed } from '@/lib/authToken'
import { JOB_SECTORS as CANON_SECTORS } from '@/lib/jobCategories'

type Candidate = {
  seekerId: string; headline: string | null; sector: string | null; sectors: string[]; roles: string[]
  skills: string[]
  experienceMonths: number; languages: string[]; hours: string[]; availability: string | null
  rightToWork: string | null; location: string | null; rating: number | null; unlocked: boolean
  viewed: boolean
  // How well they match THIS search — not a grade on the person.
  matchScore: number
  matchNotes: { factor: string; points: number; of: number; detail: string }[]
}

type FullProfile = {
  seekerId: string; headline: string | null; summary: string | null
  sectors: string[]; roles: string[]; skills: string[]; keyStrengths: string[]; certifications: string[]
  languages: string[]; experienceMonths: number; hours: string[]; availability: string | null
  rightToWork: string | null; location: string
  workExperience: { title?: string; employer?: string; location?: string; start?: string; end?: string; current?: boolean; bullets?: string[] }[] | null
  education: { qualification?: string; institution?: string; start?: string; end?: string; status?: string }[] | null
  rating: number | null; verified: boolean; alreadyCharged: boolean; contactUnlocked: boolean; unlockCents: number
}
type Revealed = { name: string; email: string; phone: string | null; avatar: string | null; location: string | null; languages: string[]; availability: string | null }
type LiveJob = { id: string; jobTitle: string }
const euro = (cents: number) => `€${(cents / 100).toFixed(2)}`

// Everything the employer paid to see: history, education, skills and the CV.
// Contact details are deliberately absent — that's the separate unlock.
function FullProfileBlock({ p, seekerId }: { p: FullProfile; seekerId: string }) {
  const work = p.workExperience ?? []
  const edu = p.education ?? []
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {p.summary && (
        <div>
          <SectionLabel>Summary</SectionLabel>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#444', lineHeight: 1.55 }}>{p.summary}</div>
        </div>
      )}

      {work.length > 0 && (
        <div>
          <SectionLabel>Work history</SectionLabel>
          {work.map((w, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>
                {w.title || 'Role'}{w.employer ? ` · ${w.employer}` : ''}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888' }}>
                {[w.start, w.current ? 'Present' : w.end].filter(Boolean).join(' – ')}{w.location ? ` · ${w.location}` : ''}
              </div>
              {(w.bullets ?? []).filter(Boolean).map((b, bi) => (
                <div key={bi} style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#555', marginTop: 2 }}>• {b}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {edu.length > 0 && (
        <div>
          <SectionLabel>Education</SectionLabel>
          {edu.map((e, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#1a1a1a' }}>{e.qualification || 'Qualification'}{e.status ? ` (${e.status})` : ''}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888' }}>{[e.institution, [e.start, e.end].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Exactly what the candidate selected when they set up their work
          profile — sectors, the roles under each, key skills, languages with
          the level they claimed, and the hours they'll work. */}
      {p.sectors.length > 0 && <Chips label="Sectors" items={p.sectors} />}
      {p.roles.length > 0 && <Chips label="Roles" items={p.roles} />}
      {p.skills.length > 0 && <Chips label="Key skills" items={p.skills} />}
      {p.keyStrengths.length > 0 && <Chips label="Key strengths" items={p.keyStrengths} />}
      {p.certifications.length > 0 && <Chips label="Certifications" items={p.certifications} />}
      {p.languages.length > 0 && <Chips label="Languages" items={p.languages} />}
      {p.hours.length > 0 && <Chips label="Hours available" items={p.hours} />}
      <Chips label="Experience" items={[expLabel(p.experienceMonths)]} />

      <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888', flexWrap: 'wrap' }}>
        {p.location && <span>📍 {p.location}</span>}
        {p.availability && <span>🗓️ {p.availability}</span>}
        {p.rightToWork && <span>🛂 {p.rightToWork}</span>}
        {p.verified && <span style={{ color: '#16a34a', fontWeight: 800 }}>🛡️ Verified</span>}
      </div>

      <a href={`/api/cv-pdf?seekerId=${seekerId}`} target="_blank" rel="noreferrer"
        style={{ background: ORANGE, color: '#fff', borderRadius: 8, padding: '9px 10px', textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, textDecoration: 'none' }}>
        📄 Download CV{p.contactUnlocked ? '' : ' (anonymous)'}
      </a>
      {!p.contactUnlocked && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#1a1a1a', textAlign: 'center' }}>
          🔒 Name and contact appear once you unlock them ({euro(p.unlockCents)}).
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{children}</div>
}

function Chips({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map(i => <span key={i} style={{ background: '#f8f9fa', border: '1px solid #eee', borderRadius: 50, padding: '3px 9px', fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 700, color: '#555' }}>{i}</span>)}
      </div>
    </div>
  )
}

function expLabel(m: number) {
  if (!m) return 'Any experience'
  if (m < 12) return `${m} mo experience`
  const y = Math.floor(m / 12)
  return `${y}+ yr${y > 1 ? 's' : ''} experience`
}

// "Find Staff" (Get Staff) — replicates the V20 HTML flow: employers build a job
// spec, we show how many anonymous candidates match, and they pay per candidate
// to unlock the CV & contact — the search being an optional add-on to a live,
// paid-for job advert. Faithful to index.html openGetStaffPanel / runJobMatch.

// Employer search taxonomy is the single canonical recruitment taxonomy, so the
// sector/role an employer searches for are the exact strings a jobseeker stores
// when they tick roles — otherwise nothing would ever match.
export const JOB_SECTORS: Record<string, string[]> = Object.fromEntries(
  CANON_SECTORS.map(s => [s.name, s.jobs])
)
export const JOB_LANGUAGES = ['English', 'Spanish', 'German', 'Other']
export const JOB_ATTRIBUTES: Record<string, string[]> = {
  hours: ['Full time', 'Part time', 'Seasonal', 'Flexible / Freelance'],
  availability: ['Immediate', '1 month', '3 months', '6 months+'],
  rightToWork: ['EU citizen', 'Non-EU with permit', 'Sponsorship required', 'Student visa'],
  location: ['Las Palmas', 'South GC', 'North GC', 'Remote', 'All areas'],
}
export const EXP_OPTIONS = [['0', 'Any experience'], ['3', '3+ months'], ['6', '6+ months'], ['12', '1+ year'], ['24', '2+ years'], ['36', '3+ years'], ['60', '5+ years']]
const ORANGE = 'var(--orange)'

const LABEL: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', marginBottom: 6 }
const SELECT: React.CSSProperties = { width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff', outline: 'none', boxSizing: 'border-box' }

type Access = {
  isBusiness: boolean; businessName: string | null
  hasLiveJob: boolean; liveJobs: LiveJob[]; cvUnlockCents: number
  canSearch: boolean; profilesViewed: number
}

export default function FindStaffPanel({ onClose, openPanel }: { onClose: () => void; openPanel: (id: PanelId, data?: Record<string, unknown>) => void }) {
  // Find Staff is a Business feature, and the candidate database is an add-on to
  // a live job advert. We check that up front rather than letting someone fill
  // in a search and then refusing them.
  const [access, setAccess] = useState<Access | null>(null)
  const [mode, setMode] = useState<'choose' | 'search'>('choose')

  useEffect(() => {
    trpcAuthed().seekers.searchAccess.query()
      .then(a => setAccess(a as Access))
      .catch(() => setAccess({ isBusiness: false, businessName: null, hasLiveJob: false, liveJobs: [], cvUnlockCents: 499, canSearch: false, profilesViewed: 0 }))
  }, [])

  const [sector, setSector] = useState('')
  const [role, setRole] = useState('')
  const [exp, setExp] = useState('0')
  const [langs, setLangs] = useState<string[]>([])
  const [attrs, setAttrs] = useState<Record<string, string[]>>({ hours: [], availability: [], rightToWork: [], location: [] })
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [unlockCents, setUnlockCents] = useState(499)
  // Which of my live job adverts each CV unlock is charged against. Defaults to
  // the first live advert; the employer can switch it when they have several.
  const [unlockJobId, setUnlockJobId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({})
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, FullProfile>>({})
  const [openingId, setOpeningId] = useState<string | null>(null)
  // Which profiles are expanded right now. Kept apart from the loaded data so a
  // profile can be collapsed and reopened without being fetched — or charged —
  // again.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Opening a profile is free — it's the CV/contact unlock that's charged.
  const openProfile = async (c: Candidate) => {
    // Already fetched this session — just show it again, instant.
    if (profiles[c.seekerId]) { toggleExpanded(c.seekerId); return }
    setOpeningId(c.seekerId)
    try {
      const full = await trpcAuthed().seekers.viewCandidate.mutate({ seekerId: c.seekerId }) as unknown as FullProfile
      setProfiles(p => ({ ...p, [c.seekerId]: full }))
      setExpanded(prev => new Set(prev).add(c.seekerId))
      setCandidates(list => list.map(x => x.seekerId === c.seekerId ? { ...x, viewed: true } : x))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not open that profile.')
    } finally { setOpeningId(null) }
  }

  const toggleLang = (l: string) => setLangs(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])
  const toggleAttr = (key: string, o: string) => setAttrs(p => ({ ...p, [key]: p[key].includes(o) ? p[key].filter(x => x !== o) : [...p[key], o] }))

  const runMatch = async () => {
    if (!sector) { toast('Pick a sector to match against.'); return }
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
      }) as { count: number; candidates: Candidate[]; cvUnlockCents: number; liveJobs: LiveJob[] }
      setCandidates(res.candidates)
      setUnlockCents(res.cvUnlockCents)
      if (res.liveJobs?.length && !unlockJobId) setUnlockJobId(res.liveJobs[0].id)
      setMatchCount(res.count)
    } catch { toast('Could not search candidates. Please sign in as an employer and try again.') }
    finally { setLoading(false) }
  }

  // Unlocking a candidate's CV + contact is a €-charge tied to one of my live
  // job adverts. If already unlocked the server returns the contact directly;
  // otherwise it returns a Stripe checkout URL and we send the employer there.
  const unlock = async (c: Candidate) => {
    if (revealed[c.seekerId]) return
    const jobId = unlockJobId || access?.liveJobs?.[0]?.id
    if (!jobId) { toast('You need a live job advert to unlock candidates. Post a job first.'); return }
    const job = access?.liveJobs?.find(j => j.id === jobId)
    if (!(await confirmDialog({ message: `Unlock this candidate's CV & contact for ${euro(unlockCents)}? The charge is linked to your advert "${job?.jobTitle ?? 'your job'}".`, confirmLabel: `Pay ${euro(unlockCents)}` }))) return
    setUnlockingId(c.seekerId)
    try {
      const r = await trpcAuthed().seekers.unlockCandidate.mutate({ seekerId: c.seekerId, jobListingId: jobId }) as
        (Revealed & { seekerId: string; unlocked: true }) | { paid: true; unlocked: false; checkoutUrl: string }
      if ('checkoutUrl' in r && r.checkoutUrl) { window.location.href = r.checkoutUrl; return }
      if ('unlocked' in r && r.unlocked) {
        setRevealed(prev => ({ ...prev, [c.seekerId]: r as Revealed }))
        setCandidates(prev => prev.map(x => x.seekerId === c.seekerId ? { ...x, unlocked: true } : x))
      }
    } catch {
      toast('Could not unlock this candidate. Please try again.')
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
          {!access ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Checking your account…</div>
          ) : !access.isBusiness ? (
            /* Hiring is a Business feature — say so plainly rather than showing
               a form that would be refused on submit. */
            <div style={{ textAlign: 'center', padding: '20px 6px' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🏢</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>Find Staff is for Business accounts</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666', lineHeight: 1.6, marginBottom: 18 }}>
                Upgrade to advertise roles and search our candidate database. 14 days free, then €29/month — pause any time.
              </div>
              <button onClick={() => { onClose(); openPanel('business') }} style={{ width: '100%', background: 'linear-gradient(135deg,#4A2E1A,#7a4419)', color: '#fff', border: 'none', borderRadius: 50, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
                🏢 Upgrade to Business
              </button>
            </div>
          ) : mode === 'choose' && matchCount === null ? (
            /* Two ways to hire — post a role and wait, or go looking. */
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>
                Hiring for {access.businessName || 'your business'}? Advertise the role, or search candidates who have already listed themselves for work.
              </div>

              <button onClick={() => { onClose(); window.location.href = '/jobs/new' }} style={{ width: '100%', textAlign: 'left', background: '#fff', border: '1.5px solid #e5dccd', borderRadius: 14, padding: 15, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 26 }}>📢</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>Place a job advert</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#888', marginTop: 2 }}>Free to post. Candidates apply to you.</span>
                </span>
                <span style={{ color: ORANGE, fontWeight: 900, fontSize: 18 }}>›</span>
              </button>

              <button onClick={() => setMode('search')} disabled={!access.canSearch} style={{ width: '100%', textAlign: 'left', background: access.canSearch ? '#fff' : '#fafafa', border: '1.5px solid #e5dccd', borderRadius: 14, padding: 15, cursor: access.canSearch ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 12, opacity: access.canSearch ? 1 : 0.7 }}>
                <span style={{ fontSize: 26 }}>🔍</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>Search the candidate database</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#888', marginTop: 2 }}>
                    Optional add-on · searching &amp; profiles are free · {euro(access.cvUnlockCents)} to unlock a candidate&apos;s CV &amp; contact
                  </span>
                </span>
                <span style={{ color: ORANGE, fontWeight: 900, fontSize: 18 }}>›</span>
              </button>

              <div style={{ marginTop: 14, background: access.canSearch ? '#f0fdf4' : '#FFF7ED', border: `1px solid ${access.canSearch ? '#bbf7d0' : '#FFD4A0'}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: access.canSearch ? '#16a34a' : '#9a5b1a' }}>
                  {access.canSearch ? `${access.liveJobs.length} live job advert${access.liveJobs.length === 1 ? '' : 's'}` : 'A live job advert is required'}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: access.canSearch ? '#15803d' : '#9a5b1a', marginTop: 2, lineHeight: 1.5 }}>
                  {access.canSearch
                    ? `The database is an optional extra for businesses with a live advert. Each CV unlock (${euro(access.cvUnlockCents)}) is linked to one of your adverts.`
                    : 'Post a job advert first — the candidate database is an optional add-on that speeds up hiring for a role you already have live.'}
                </div>
                {!access.canSearch && (
                  <button onClick={() => { onClose(); window.location.href = '/jobs/new' }} style={{ marginTop: 8, background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Post a job</button>
                )}
              </div>
            </div>
          ) : matchCount === null ? (
            <>
              <div style={{ fontSize: 11, color: ORANGE, fontFamily: 'var(--font-ui)', marginBottom: 14, lineHeight: 1.5 }}>
                Build your job spec below. We&apos;ll match it against anonymous candidate profiles and show you how many qualify. Opening a profile is free; unlocking a candidate&apos;s CV &amp; contact is charged and linked to your job advert.
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
                <div style={{ fontSize: 12, color: '#666', fontFamily: 'var(--font-ui)', marginTop: 4 }}>{role ? `${role} · ` : ''}Canary Islands</div>
              </div>

              {matchCount === 0 ? (
                <div style={{ background: '#f8f9fa', borderRadius: 14, padding: 18, textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#555', marginBottom: 4 }}>No candidates match yet</div>
                  <div style={{ fontSize: 12, color: '#888', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>Try widening your spec — fewer required languages or lower minimum experience. New job-seekers register every day.</div>
                </div>
              ) : (
                <>
                  <div style={{ background: '#FFF3EE', border: '1.5px solid #FFD4C0', borderRadius: 14, padding: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>🔒 Unlocking a candidate&apos;s CV, name &amp; contact is <strong>{euro(unlockCents)}</strong> — linked to the job advert you&apos;re hiring for. Already-unlocked candidates stay free.</div>
                    {(access?.liveJobs?.length ?? 0) > 1 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', marginBottom: 4 }}>Unlock against advert</div>
                        <select value={unlockJobId} onChange={e => setUnlockJobId(e.target.value)} style={{ ...SELECT, padding: '8px 10px', fontSize: 12 }}>
                          {access!.liveJobs.map(j => <option key={j.id} value={j.id}>{j.jobTitle}</option>)}
                        </select>
                      </div>
                    )}
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
                              <div style={{ fontSize: 11, color: '#666', fontFamily: 'var(--font-ui)' }}>{[c.sector, c.location].filter(Boolean).join(' · ') || 'Canary Islands'}{c.rating ? ` · ★ ${Number(c.rating).toFixed(1)}` : ''}</div>
                            </div>
                            {/* Fit against this search, not a grade on the person. */}
                            <div title={c.matchNotes.map(n => `${n.factor}: ${n.points}/${n.of} — ${n.detail}`).join('\n')}
                              style={{ flexShrink: 0, textAlign: 'center', background: '#fff', border: `1.5px solid ${c.matchScore >= 70 ? '#16a34a' : c.matchScore >= 45 ? '#f59e0b' : '#d1d5db'}`, borderRadius: 10, padding: '4px 9px' }}>
                              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: c.matchScore >= 70 ? '#16a34a' : c.matchScore >= 45 ? '#f59e0b' : '#9ca3af' }}>{c.matchScore}</div>
                              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>match</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                            {[expLabel(c.experienceMonths), ...(c.languages.slice(0, 3)), c.availability].filter(Boolean).map((tg, i) => (
                              <span key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 50, padding: '3px 9px', fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 700, color: '#555' }}>{tg}</span>
                            ))}
                          </div>

                          {/* Full profile — history, CV and all. Free to open;
                              only the CV/contact unlock is charged. */}
                          {profiles[c.seekerId] && expanded.has(c.seekerId) ? (
                            <>
                              <FullProfileBlock p={profiles[c.seekerId]} seekerId={c.seekerId} />
                              <button onClick={() => toggleExpanded(c.seekerId)} style={{ width: '100%', marginBottom: 8, background: 'none', border: 'none', color: '#888', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: 6 }}>
                                ▲ Hide profile
                              </button>
                            </>
                          ) : (
                            <button onClick={() => openProfile(c)} disabled={openingId === c.seekerId}
                              style={{ width: '100%', marginBottom: 8, background: '#fff', color: ORANGE, border: `1.5px solid ${ORANGE}`, borderRadius: 10, padding: 9, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
                              {openingId === c.seekerId
                                ? 'Opening…'
                                : '📄 Open full profile · free'}
                            </button>
                          )}

                          {isUnlocked && rev ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#fff', borderRadius: 10, padding: 10 }}>
                              <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: '#1a1a1a' }}>📧 <strong>{rev.email}</strong></div>
                              {rev.phone && <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: '#1a1a1a' }}>📱 <strong>{rev.phone}</strong></div>}
                              {rev.location && <div style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: '#666' }}>📍 {rev.location}</div>}
                            </div>
                          ) : isUnlocked ? (
                            <div style={{ fontSize: 11, color: '#22c55e', fontFamily: 'var(--font-ui)', fontWeight: 800 }}>✓ Unlocked — reopen to view details</div>
                          ) : (
                            <button onClick={() => unlock(c)} disabled={unlockingId === c.seekerId} style={{ width: '100%', background: ORANGE, color: '#fff', border: 'none', borderRadius: 10, padding: 10, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer', opacity: unlockingId === c.seekerId ? 0.6 : 1 }}>{unlockingId === c.seekerId ? 'Unlocking…' : `🔓 Unlock CV & contact · ${euro(unlockCents)}`}</button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                </>
              )}

              <button onClick={() => setMatchCount(null)} style={{ width: '100%', background: '#fff', color: '#666', border: '1.5px solid #eee', borderRadius: 50, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>← Adjust spec</button>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#666', fontFamily: 'var(--font-ui)' }}>Secure payment via Stripe · Each unlock is linked to your live job advert · Must be a registered employer</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
