'use client'
import { useEffect, useMemo, useState } from 'react'
import { toast, confirmDialog } from '@/lib/ui'
import { usePanel } from '@/context/PanelContext'
import { trpcAuthed } from '@/lib/authToken'
import { t } from '@/lib/i18n'

// Employer Dashboard body — rendered as a full page (see app/employers/page.tsx)
// with the standard header/footer. Mirrors the V20 openEmployerDashboard flow
// against real data. Cross-links (applicants, find staff, verify) open as modals
// via PanelHost, which the page also mounts.

const ORANGE = 'var(--orange)'
const JOB_LIFE_DAYS = 21     // listings run for 21 days

type App = {
  id: string; status: string; applicant: string; applicantId: string; coverNote: string | null; employerNote: string | null; createdAt: string
  cvUrl?: string | null; revealed?: boolean; suitabilityScore?: number | null
  fullName?: string | null; email?: string | null; phone?: string | null; linkedinUrl?: string | null
  location?: string | null; rightToWork?: string | null; languages?: string[]; experienceMonths?: number | null
  currentRole?: string | null; expectedSalary?: number | null; availability?: string | null
  answers?: Record<string, string | number | boolean>
}
type Question = { id: string; label: string }
type Job = { id: string; listingId: string; jobTitle: string; company: string; type: string; listingStatus: string; postedAt: string; image: string | null; candidateMatching?: boolean; questions?: Question[]; applications: App[] }

function expLabel(m: number | null | undefined): string | null {
  if (!m) return null
  if (m < 12) return `${m} mo experience`
  const y = Math.floor(m / 12)
  return `${y}+ yr${y > 1 ? 's' : ''} experience`
}

// The hiring stages the recruiter can set per candidate, mapped to the stored
// ApplicationStatus enum. "Rejected" requires a reason note (enforced server-side).
const STAGES: { value: string; label: string }[] = [
  { value: 'applied', label: 'New' },
  { value: 'viewed', label: 'Reviewed' },
  { value: 'invited', label: 'Invited to Interview' },
  { value: 'offer', label: 'Offered' },
  { value: 'rejected_pre', label: 'Rejected' },
]
// Fold every stored status onto one of the five selectable stages.
const stageValue = (s: string): string =>
  s === 'viewed' || s === 'shortlisted' ? 'viewed'
  : s === 'invited' || s === 'arranged' ? 'invited'
  : s === 'offer' || s === 'hired' || s === 'accepted' ? 'offer'
  : s.startsWith('rejected') ? 'rejected_pre'
  : 'applied'

const TYPE_EMOJI: Record<string, string> = { full_time: '💼', part_time: '🕒', contract: '📄', temporary: '⏳', volunteer: '🤝' }
const statusBtn = (bg: string, color: string): React.CSSProperties => ({ flex: 1, minWidth: 100, background: bg, color, border: 'none', borderRadius: 50, padding: 8, fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer' })
const pillBtn: React.CSSProperties = { background: '#fff', color: 'var(--dark)', border: '1px solid #e5dccd', borderRadius: 50, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }
// Compact button for the single-row action bar on each job card.
const rowBtn: React.CSSProperties = { background: '#fff', color: 'var(--dark)', border: '1.5px solid #b3a184', borderRadius: 50, padding: '8px 6px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap' }

function daysLeft(postedAt: string) {
  const end = new Date(postedAt).getTime() + JOB_LIFE_DAYS * 86400000
  return Math.ceil((end - Date.now()) / 86400000)
}
function expiryDate(postedAt: string) {
  const end = new Date(new Date(postedAt).getTime() + JOB_LIFE_DAYS * 86400000)
  return end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

type JobStatus = 'open' | 'filled' | 'removed'
const statusOf = (j: Job): JobStatus => j.listingStatus === 'removed' ? 'removed' : j.listingStatus === 'sold' ? 'filled' : 'open'

export default function EmployerDashboardContent() {
  const { openPanel } = usePanel()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<'all' | JobStatus>('all')
  const [meId, setMeId] = useState<string>('')
  useEffect(() => { trpcAuthed().users.me.query().then((m: any) => setMeId(m?.id ?? '')).catch(() => {}) }, [])
  // The candidate whose detail popup is open.
  const [viewing, setViewing] = useState<{ job: Job; app: App } | null>(null)
  // Which job cards are expanded. Collapsed by default so the list stays scannable.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // Open a candidate's CV — their attached file if they uploaded one, otherwise
  // the Grabitt-generated CV built from their work profile + application.
  const openCV = (a: App) => {
    const url = a.cvUrl ? `/api/cv?applicationId=${a.id}` : `/api/cv-pdf?applicationId=${a.id}`
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
  }
  // Set a candidate's hiring stage. Rejection needs a reason (kept on file).
  const setStage = async (a: App, value: string) => {
    if (value === stageValue(a.status)) return
    let note: string | undefined
    if (value === 'rejected_pre') {
      const reason = window.prompt(t('Reason for rejecting this candidate (kept on file):'), '')
      if (reason === null) return
      if (!reason.trim()) { toast(t('A reason is required to reject.')); return }
      note = reason.trim()
    }
    try {
      await trpcAuthed().jobs.setApplicationStatus.mutate({ applicationId: a.id, status: value as never, note })
      setJobs(prev => prev.map(j => ({ ...j, applications: j.applications.map(x => x.id === a.id ? { ...x, status: value } : x) })))
      setViewing(v => v && v.app.id === a.id ? { ...v, app: { ...v.app, status: value } } : v)
    } catch (e: any) { toast(e?.message || t('Could not update.')) }
  }
  // Open the recruiter ↔ candidate message thread for this application.
  const openMessages = async (j: Job, a: App) => {
    try {
      const thread = await trpcAuthed().messages.thread.mutate({ listingId: j.listingId, sellerId: a.applicantId }) as { id: string }
      openPanel('chatThread', { threadId: thread.id, handle: a.applicant, listing: j.jobTitle, avatar: '👤', currentUserId: meId })
    } catch (e: any) { toast(e?.message || t('Could not open the conversation.')) }
  }

  const load = () => trpcAuthed().jobs.employerApplications.query()
    .then((d: any) => { setJobs(d as Job[]); setLoaded(true) })
    .catch(() => setLoaded(true))
  useEffect(() => { load() }, [])

  const counts = useMemo(() => {
    const c = { all: jobs.length, open: 0, filled: 0, removed: 0 }
    for (const j of jobs) c[statusOf(j)]++
    return c
  }, [jobs])
  const shownJobs = filter === 'all' ? jobs : jobs.filter(j => statusOf(j) === filter)

  const setJobStatus = async (listingId: string, status: 'active' | 'sold' | 'removed', label: string) => {
    if (status === 'removed' && !(await confirmDialog(t('Remove this job advert? It will no longer be visible. You can reopen it later.')))) return
    try {
      await trpcAuthed().jobs.setJobStatus.mutate({ listingId, status })
      toast(`✓ ${label}`)
      load()
    } catch (e: any) { toast(e?.message || t('Could not update the job.')) }
  }

  // Database search (Candidate Matching) — if the advert already has it, open the
  // search; otherwise start the paid add-on purchase (Stripe), which enables it.
  const [buyingMatch, setBuyingMatch] = useState<string | null>(null)
  const databaseSearch = async (j: Job) => {
    if (j.candidateMatching) { openPanel('findStaff', { jobId: j.id }); return }
    if (!(await confirmDialog(t('Database Search lets you search our candidate database and contact matching candidates for this advert. It’s a paid add-on for this job. Continue to payment?')))) return
    setBuyingMatch(j.id)
    try {
      const r: any = await (trpcAuthed() as any).jobs.addCandidateMatching.mutate({ listingId: j.listingId })
      if (r?.checkoutUrl) { window.location.href = r.checkoutUrl; return }
      if (r?.enabled || r?.alreadyOn) { toast(`✓ ${t('Database Search enabled')}`); load() }
    } catch (e: any) { toast(e?.message || t('Could not start the purchase.')) }
    finally { setBuyingMatch(null) }
  }

  const shareJobs = async (url: string, title: string) => {
    try {
      if (navigator.share) await navigator.share({ title, url })
      else { await navigator.clipboard.writeText(url); toast(t('Link copied to clipboard')) }
    } catch { /* user cancelled */ }
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div style={{ width: '100%' }}>
      {/* Header row — just a title and a Post a Job action. Everything else lives
          inside each job card below. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 900, color: 'var(--dark)' }}>{t('Candidate Management')}</div>
        <a href="/jobs/new" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg,var(--orange),var(--orange2,#ff8a3d))', color: '#fff', borderRadius: 50, padding: '9px 18px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,84,10,0.22)' }}>+ {t('Post a Job')}</div>
        </a>
      </div>

      {/* Position status filters */}
      {loaded && jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {([['all', t('All')], ['open', t('Open')], ['filled', t('Filled')], ['removed', t('Removed')]] as [typeof filter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ border: `1.5px solid ${filter === k ? ORANGE : '#e5dccd'}`, background: filter === k ? ORANGE : '#fff', color: filter === k ? '#fff' : '#555', borderRadius: 50, padding: '6px 13px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{label} ({counts[k as keyof typeof counts]})</button>
          ))}
        </div>
      )}

      {/* Listings */}
      {!loaded ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>{t('Loading…')}</div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#777', fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: 1.6 }}>{t('No job adverts yet.')}<br />{t('Post your first job above')} 💼</div>
      ) : shownJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#999', fontFamily: 'var(--font-ui)', fontSize: 12 }}>{t('No positions to show.')}</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shownJobs.map(j => {
              const dLeft = daysLeft(j.postedAt)
              const jstatus = statusOf(j)
              const expired = jstatus === 'open' && dLeft <= 0
              const isOpen = expanded.has(j.id)
              const nApps = j.applications.length
              // Accent + chip for the position status, used for the left rail and pill.
              let accent = '#22c55e'
              let chip: React.ReactNode
              if (jstatus === 'filled') { accent = '#16a34a'; chip = <span style={{ background: '#22c55e1a', color: '#16a34a', fontSize: 9.5, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>✓ {t('Filled')}</span> }
              else if (jstatus === 'removed') { accent = '#9ca3af'; chip = <span style={{ background: '#9ca3af1a', color: '#6b7280', fontSize: 9.5, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>⚪ {t('Removed')}</span> }
              else if (expired) { accent = '#ef4444'; chip = <span style={{ background: '#ef44441a', color: '#ef4444', fontSize: 9.5, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>⏳ {t('Expired')}</span> }
              else { accent = dLeft <= 3 ? '#ef4444' : dLeft <= 7 ? '#f59e0b' : '#22c55e'; chip = <span style={{ background: `${accent}1a`, color: accent, fontSize: 9.5, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>{t('{n} days left').replace('{n}', String(dLeft))}</span> }

              return (
                <div key={j.id} style={{ background: '#fff', border: `1px solid ${isOpen ? '#e2d6c4' : '#ece3d7'}`, borderRadius: 16, boxShadow: isOpen ? '0 6px 20px rgba(30,43,85,0.09)' : '0 1px 4px rgba(30,43,85,0.05)', overflow: 'hidden', transition: 'box-shadow .15s' }}>
                  {/* Collapsible header — title, applicant count, expiry, arrow */}
                  <button
                    onClick={() => toggleExpanded(j.id)}
                    aria-expanded={isOpen}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: isOpen ? 'linear-gradient(180deg,#fffaf6,#fff)' : '#fff', border: 'none', borderLeft: `4px solid ${accent}`, cursor: 'pointer' }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0, overflow: 'hidden' }}>
                      {j.image ? <img src={j.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (TYPE_EMOJI[j.type] ?? '💼')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.jobTitle}</div>
                        {chip}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: '#8a7c68', fontFamily: 'var(--font-nunito)', marginTop: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 800, color: nApps ? 'var(--orange)' : '#a99' }}>
                          👤 {nApps} {t(nApps === 1 ? 'applicant' : 'applicants')}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>📅 {t('Expires')} {expiryDate(j.postedAt)}</span>
                        {j.candidateMatching && <span style={{ color: 'var(--orange)', fontWeight: 800 }}>🎯 {t('Job Match on')}</span>}
                      </div>
                    </div>
                    <span aria-hidden style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: isOpen ? 'var(--orange)' : '#f3ece1', color: isOpen ? '#fff' : '#9a8c74', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s, background .15s' }}>▾</span>
                  </button>

                  {/* Expanded body */}
                  {isOpen && (
                    <div style={{ padding: '4px 16px 16px' }}>
                      {/* Manage + status controls — all on one row */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto' }}>
                        <a href={`/jobs/new?edit=${j.listingId}`} style={{ flex: '1 1 0', minWidth: 62, textDecoration: 'none' }}>
                          <div style={rowBtn}>✏️ {t('Edit')}</div>
                        </a>
                        <button onClick={() => shareJobs(`${origin}/listings/${j.listingId}`, j.jobTitle)} style={{ ...rowBtn, flex: '1 1 0', minWidth: 62 }}>📤 {t('Share')}</button>
                        <button onClick={() => databaseSearch(j)} disabled={buyingMatch === j.id} style={{ ...rowBtn, flex: '1 1 0', minWidth: 96, ...(j.candidateMatching ? { background: '#FFF3EE', color: 'var(--orange)', borderColor: '#f0a877' } : {}) }}>
                          {buyingMatch === j.id ? '…' : `🔎 ${t('Database search')}${j.candidateMatching ? '' : ` (${t('add')})`}`}
                        </button>
                        {jstatus === 'open' && <button onClick={() => setJobStatus(j.listingId, 'sold', t('Marked as filled'))} style={{ ...rowBtn, flex: '1 1 0', minWidth: 80, background: '#f0faf4', color: '#16a34a', borderColor: '#8ed3a4' }}>✓ {t('Mark filled')}</button>}
                        {jstatus !== 'open' && <button onClick={() => setJobStatus(j.listingId, 'active', t('Reopened'))} style={{ ...rowBtn, flex: '1 1 0', minWidth: 74, background: '#eef7ff', color: '#1e6fd0', borderColor: '#93bff0' }}>{t('Reopen')}</button>}
                        {jstatus !== 'removed' && <button onClick={() => setJobStatus(j.listingId, 'removed', t('Removed'))} style={{ ...rowBtn, flex: '1 1 0', minWidth: 74, background: '#fef2f2', color: '#ef4444', borderColor: '#f0a0a0' }}>🗑 {t('Remove')}</button>}
                      </div>

                      {/* Candidates */}
                      <div style={{ marginTop: 14, borderTop: '1px solid #f0ece4', paddingTop: 12 }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 900, color: '#b0a08c', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{t('Candidates')} {nApps > 0 ? `(${nApps})` : ''}</div>
                        {nApps === 0 ? (
                          <div style={{ textAlign: 'center', padding: '16px 0', color: '#a99', fontFamily: 'var(--font-nunito)', fontSize: 12 }}>{t('No applicants yet.')}</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {j.applications.map(a => (
                              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#faf8f4', border: '1px solid #efe7db', borderRadius: 10, padding: 6 }}>
                                <button onClick={() => setViewing({ job: j, app: a })} title={t('View candidate')} style={{ flex: '1 1 130px', minWidth: 0, textAlign: 'left', background: '#fff', border: '1px solid #ece3d7', borderRadius: 8, padding: '8px 11px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👤 {a.applicant}</button>
                                <select value={stageValue(a.status)} onChange={e => setStage(a, e.target.value)} style={{ flexShrink: 0, border: '1.5px solid #e5dccd', borderRadius: 8, padding: '8px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>
                                  {STAGES.map(s => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
                                </select>
                                <button onClick={() => openMessages(j, a)} title={t('Message candidate')} style={{ flexShrink: 0, background: '#fff', border: '1px solid #e5dccd', borderRadius: 8, padding: '8px 11px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>💬</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {viewing && (
        <CandidateModal
          job={viewing.job}
          app={viewing.app}
          onClose={() => setViewing(null)}
          onStage={(v) => setStage(viewing.app, v)}
          onMessage={() => openMessages(viewing.job, viewing.app)}
          onOpenCV={() => openCV(viewing.app)}
        />
      )}
    </div>
  )
}

// Candidate detail popup — shows the profile attributes captured from the
// seeker's recruitment profile at apply time, their screening answers, contact
// (once revealed), plus buttons to open the CV, set their stage and message them.
function CandidateModal({ job, app, onClose, onStage, onMessage, onOpenCV }: {
  job: Job; app: App; onClose: () => void; onStage: (v: string) => void; onMessage: () => void; onOpenCV: () => void
}) {
  const facts = ([
    [t('Current role'), app.currentRole || ''],
    [t('Experience'), expLabel(app.experienceMonths) || ''],
    [t('Languages'), (app.languages ?? []).join(', ')],
    [t('Availability'), app.availability || ''],
    [t('Right to work'), app.rightToWork || ''],
    [t('Location'), app.location || ''],
    [t('Expected salary'), app.expectedSalary != null ? `€${Number(app.expectedSalary).toLocaleString()}/mo` : ''],
  ] as [string, string][]).filter(([, v]) => !!v)
  const answers = job.questions ?? []
  const hasAnswers = answers.some(q => app.answers?.[q.id] != null && String(app.answers[q.id]).trim() !== '')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid #f0ece4', position: 'sticky', top: 0, background: '#fff' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>{app.fullName || app.applicant}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#888' }}>{job.jobTitle}{app.suitabilityScore != null ? ` · ${t('Match')} ${app.suitabilityScore}` : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stage + message */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={stageValue(app.status)} onChange={e => onStage(e.target.value)} style={{ flex: 1, minWidth: 140, border: '1.5px solid #e5dccd', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>
              {STAGES.map(s => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
            </select>
            <button onClick={onMessage} style={{ flexShrink: 0, background: '#fff', border: '1px solid #e5dccd', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>💬 {t('Message')}</button>
          </div>

          {/* CV buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {app.cvUrl && <a href={`/api/cv?applicationId=${app.id}`} target="_blank" rel="noreferrer" style={cvBtn}>📎 {t('Attached CV')}</a>}
            <a href={`/api/cv-pdf?applicationId=${app.id}`} target="_blank" rel="noreferrer" style={cvBtn}>📄 {t('Grabitt CV')}</a>
          </div>

          {/* Profile snapshot from their recruitment profile */}
          {facts.length > 0 && (
            <div>
              <SectionLabel>{t('Profile')}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {facts.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: 'var(--font-nunito)', fontSize: 12.5 }}>
                    <span style={{ color: '#999', fontWeight: 700 }}>{k}</span>
                    <span style={{ color: '#1a1a1a', fontWeight: 700, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cover note */}
          {app.coverNote && (
            <div>
              <SectionLabel>{t('Cover note')}</SectionLabel>
              <div style={{ background: '#f8f6f2', borderRadius: 8, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#444', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{app.coverNote}</div>
            </div>
          )}

          {/* Screening answers */}
          {hasAnswers && (
            <div>
              <SectionLabel>{t('Screening answers')}</SectionLabel>
              {answers.map(q => app.answers?.[q.id] != null && String(app.answers[q.id]).trim() !== '' && (
                <div key={q.id} style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#333', marginBottom: 5 }}><strong>{q.label}:</strong> {String(app.answers![q.id])}</div>
              ))}
            </div>
          )}

          {/* Contact — only once the candidate is revealed */}
          {app.revealed && (app.email || app.phone || app.linkedinUrl) && (
            <div>
              <SectionLabel>{t('Contact')}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--font-nunito)', fontSize: 12.5 }}>
                {app.email && <a href={`mailto:${app.email}`} style={{ color: 'var(--orange)', fontWeight: 800 }}>✉️ {app.email}</a>}
                {app.phone && <a href={`tel:${app.phone}`} style={{ color: 'var(--orange)', fontWeight: 800 }}>📞 {app.phone}</a>}
                {app.linkedinUrl && <a href={app.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--orange)', fontWeight: 800, overflowWrap: 'anywhere' }}>🔗 {t('LinkedIn / portfolio')}</a>}
              </div>
            </div>
          )}
          {!app.revealed && (
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#999', lineHeight: 1.5 }}>{t('Contact details are revealed once you invite the candidate to interview.')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

const cvBtn: React.CSSProperties = { flex: '1 1 auto', textAlign: 'center', textDecoration: 'none', background: '#FFF3EE', color: 'var(--orange)', border: '1px solid #FFD4C0', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800 }
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>{children}</div>
}
