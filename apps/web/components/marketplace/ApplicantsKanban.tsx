'use client'
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/ui'
import type { PanelId } from '@/context/PanelContext'
import { trpcAuthed } from '@/lib/authToken'

// Full applicant-tracking board for ONE job advert: horizontal stage columns
// with candidate cards moving left→right through the pipeline (or to Rejected /
// Hired). Click a card for full details, private notes and messaging.

const ORANGE = 'var(--orange)'

type App = {
  id: string; status: string; applicant: string; applicantId: string; revealed?: boolean
  coverNote: string | null; employerNote: string | null; createdAt: string
  suitabilityScore?: number | null
  fullName: string | null; email: string | null; phone: string | null; location: string | null; rightToWork: string | null
  languages: string[]; experienceMonths: number | null; currentRole: string | null; expectedSalary: number | null
  availability: string | null; linkedinUrl: string | null; cvUrl: string | null; answers: Record<string, string | number | boolean>
}
type Question = { id: string; label: string }
type Job = { id: string; listingId: string; jobTitle: string; company: string; questions: Question[]; applications: App[] }

// The pipeline columns, in order. Rejected/Hired are terminal columns shown at
// the end. `hired` maps to the 'accepted' status (offer accepted = hired).
const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'applied', label: 'New Applicant', color: '#3b82f6' },
  { key: 'invited', label: 'Invited to Interview', color: '#8b5cf6' },
  { key: 'accepted', label: 'Hired', color: '#22c55e' },
  { key: 'rejected_pre', label: 'Rejected', color: '#ef4444' },
]
// Legacy statuses folded onto a column so old applications still appear.
// Reviewing / Interview Arranged / Offer Made were removed to simplify the
// pipeline, so any application left on them collapses back to a live column.
const FOLD: Record<string, string> = { viewed: 'applied', arranged: 'invited', offer: 'invited', shortlisted: 'invited', hired: 'accepted', rejected: 'rejected_pre', rejected_post: 'rejected_pre' }
const colOf = (status: string) => FOLD[status] ?? status

function expLabel(m: number | null) {
  if (!m) return null
  if (m < 12) return `${m} mo experience`
  const y = Math.floor(m / 12)
  return `${y}+ yr${y > 1 ? 's' : ''} experience`
}

export default function ApplicantsKanban({ jobId, onClose, openPanel }: { jobId: string; onClose: () => void; openPanel: (id: PanelId, data?: Record<string, unknown>) => void }) {
  const [job, setJob] = useState<Job | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const me = typeof window !== 'undefined' ? localStorage.getItem('grabitt_uid') : null

  const load = () => trpcAuthed().jobs.employerApplications.query()
    .then((d: any) => { const list = d as Job[]; setJob(list.find(j => j.id === jobId) ?? null); setLoaded(true) })
    .catch(() => setLoaded(true))
  useEffect(() => { load() }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  const move = async (a: App, toStatus: string) => {
    if (toStatus === a.status) return
    let note: string | undefined
    if (toStatus === 'rejected_pre') {
      const reason = prompt('Add a short reason for rejecting this candidate (kept on file):')
      if (reason === null) return
      if (!reason.trim()) { toast('A reason is required to reject.'); return }
      note = reason.trim()
    }
    setSaving(a.id)
    try {
      await trpcAuthed().jobs.setApplicationStatus.mutate({ applicationId: a.id, status: toStatus as any, note })
      setJob(prev => prev ? { ...prev, applications: prev.applications.map(x => x.id === a.id ? { ...x, status: toStatus, employerNote: note ?? x.employerNote } : x) } : prev)
    } catch (e: any) { toast(e?.message || 'Could not update.') }
    finally { setSaving(null) }
  }

  const message = async (a: App) => {
    try {
      const thread = await trpcAuthed().messages.thread.mutate({ listingId: job!.listingId, sellerId: a.applicantId }) as { id: string }
      openPanel('chatThread', { threadId: thread.id, handle: a.applicant, listing: job!.jobTitle, avatar: '👤', currentUserId: me || '' })
    } catch (e: any) { toast(e?.message || 'Could not open the conversation.') }
  }

  const saveNote = async (a: App) => {
    setSaving(a.id)
    try {
      await trpcAuthed().jobs.setApplicationNote.mutate({ applicationId: a.id, note: noteDraft })
      setJob(prev => prev ? { ...prev, applications: prev.applications.map(x => x.id === a.id ? { ...x, employerNote: noteDraft.trim() || null } : x) } : prev)
      toast('✓ Note saved')
    } catch (e: any) { toast(e?.message || 'Could not save the note.') }
    finally { setSaving(null) }
  }

  const byStage = useMemo(() => {
    const map: Record<string, App[]> = {}
    for (const s of STAGES) map[s.key] = []
    for (const a of job?.applications ?? []) (map[colOf(a.status)] ??= []).push(a)
    return map
  }, [job])

  const detail = job?.applications.find(a => a.id === detailId) ?? null

  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ position: 'relative', background: '#f4f6f8', height: '85vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header with a Back button to the job listings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderBottom: '1px solid #e8e8e8', flexShrink: 0 }}>
          <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f5f0e8', color: 'var(--dark)', border: 'none', borderRadius: 50, padding: '7px 13px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer', flexShrink: 0 }}>‹ Back to jobs</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14.5, fontWeight: 900, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job ? job.jobTitle : 'Applicants'}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>{job ? `${job.applications.length} applicant${job.applications.length === 1 ? '' : 's'}` : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        {!loaded ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading…</div>
        ) : !job ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Job not found.</div>
        ) : (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0 }}>
              {STAGES.map(stage => {
                const cards = byStage[stage.key] ?? []
                return (
                  <div key={stage.key} style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', background: '#eceff3', borderRadius: 12, maxHeight: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `2px solid ${stage.color}`, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, color: '#1a1a1a', flex: 1 }}>{stage.label}</span>
                      <span style={{ background: '#fff', color: stage.color, borderRadius: 50, padding: '1px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900 }}>{cards.length}</span>
                    </div>
                    <div style={{ overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      {cards.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa', textAlign: 'center', padding: '14px 0' }}>—</div>}
                      {cards.map(a => {
                        return (
                          <div key={a.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', opacity: saving === a.id ? 0.6 : 1 }}>
                            <div onClick={() => { setDetailId(a.id); setNoteDraft(a.employerNote ?? '') }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1a1a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, fontFamily: 'var(--font-ui)', flexShrink: 0 }}>{a.applicant.charAt(0)}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.applicant}</div>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, color: '#999' }}>Applied {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                              </div>
                              {a.suitabilityScore != null && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: a.suitabilityScore >= 70 ? '#16a34a' : a.suitabilityScore >= 45 ? '#f59e0b' : '#9ca3af' }}>{a.suitabilityScore}</span>}
                            </div>
                            {/* Jump the candidate straight to any stage. */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                              <select value={colOf(a.status)} onChange={e => move(a, e.target.value)} onClick={e => e.stopPropagation()} style={{ flex: 1, minWidth: 0, border: '1px solid #e5e7eb', borderRadius: 7, padding: '6px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, background: '#fff', color: '#1a1a1a', cursor: 'pointer' }}>
                                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                              </select>
                              <button onClick={() => message(a)} title="Message candidate" style={miniBtn(true)}>💬</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Candidate detail drawer */}
        {detail && (
          <div onClick={() => setDetailId(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 10 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px, 100%)', height: '100%', background: '#fff', overflowY: 'auto', padding: 18, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>{detail.applicant}</div>
                <button onClick={() => setDetailId(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>×</button>
              </div>
              <button onClick={() => message(detail)} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2,#ff8a3d))', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer', marginBottom: 12 }}>💬 Message this candidate</button>
              {detail.coverNote && <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#555', fontFamily: 'var(--font-ui)', marginBottom: 10 }}>💬 {detail.coverNote}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {detail.fullName && <D label="Name" value={detail.fullName} />}
                {detail.email && <D label="Email" value={detail.email} />}
                {detail.phone && <D label="Phone" value={detail.phone} />}
                {detail.currentRole && <D label="Current role" value={detail.currentRole} />}
                {expLabel(detail.experienceMonths) && <D label="Experience" value={expLabel(detail.experienceMonths)!} />}
                {detail.languages.length > 0 && <D label="Languages" value={detail.languages.join(', ')} />}
                {detail.location && <D label="Location" value={detail.location} />}
                {detail.rightToWork && <D label="Right to work" value={detail.rightToWork} />}
                {detail.availability && <D label="Availability" value={detail.availability} />}
                {detail.expectedSalary != null && <D label="Expected salary" value={`€${detail.expectedSalary.toLocaleString()}/mo`} />}
                <a href={`/api/cv-pdf?applicationId=${detail.id}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: ORANGE }}>📄 View CV</a>
                {detail.cvUrl && <a href={`/api/cv?applicationId=${detail.id}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555' }}>📎 Attached file</a>}
              </div>
              {Object.keys(detail.answers).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#555', marginBottom: 4 }}>Screening answers</div>
                  {(job?.questions ?? []).map(q => detail.answers[q.id] != null && (
                    <div key={q.id} style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#333', marginBottom: 4 }}><strong>{q.label}:</strong> {String(detail.answers[q.id])}</div>
                  ))}
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#555', marginBottom: 4 }}>Private note</div>
              <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={3} placeholder="Your notes on this candidate (never shown to them)…" style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 12, resize: 'vertical' }} />
              <button onClick={() => saveNote(detail)} style={{ marginTop: 6, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Save note</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const miniBtn = (on: boolean): React.CSSProperties => ({ minWidth: 26, height: 26, borderRadius: 7, border: '1px solid #e5e7eb', background: on ? '#fff' : '#f3f4f6', color: on ? '#1a1a1a' : '#c4c4c4', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: on ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' })
function D({ label, value }: { label: string; value: string }) {
  return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12 }}><span style={{ color: '#999', fontWeight: 700 }}>{label}: </span><span style={{ color: '#1a1a1a', fontWeight: 700 }}>{value}</span></div>
}
