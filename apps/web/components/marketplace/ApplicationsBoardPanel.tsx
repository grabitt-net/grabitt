'use client'
import { useEffect, useState } from 'react'
import type { PanelId } from '@/context/PanelContext'
import { trpcAuthed } from '@/lib/authToken'

// Employer applicants board — replicates the V20 openApplicationsBoard: per-job
// applicant list with a pipeline status control. Rejections require a reason note.

const ORANGE = '#FF4500'
type App = {
  id: string; status: string; applicant: string; applicantId: string; coverNote: string | null; employerNote: string | null; createdAt: string
  fullName: string | null; email: string | null; phone: string | null; location: string | null; rightToWork: string | null
  languages: string[]; experienceMonths: number | null; currentRole: string | null; expectedSalary: number | null
  availability: string | null; linkedinUrl: string | null; cvUrl: string | null; answers: Record<string, string | number | boolean>
}
type Question = { id: string; label: string }
type Job = { id: string; jobTitle: string; company: string; questions: Question[]; applications: App[] }

function expLabel(m: number | null) {
  if (!m) return null
  if (m < 12) return `${m} mo experience`
  const y = Math.floor(m / 12)
  return `${y}+ yr${y > 1 ? 's' : ''} experience`
}

const STATUS: Record<string, { label: string; color: string }> = {
  applied: { label: 'New Applicant', color: '#3b82f6' },
  viewed: { label: 'Viewed', color: '#6b7280' },
  shortlisted: { label: 'Shortlisted', color: '#8b5cf6' },
  hired: { label: 'Hired', color: '#22c55e' },
  rejected: { label: 'Rejected', color: '#ef4444' },
}
const ORDER = ['applied', 'viewed', 'shortlisted', 'hired', 'rejected']

export default function ApplicationsBoardPanel({ onClose, focusJobId }: { onClose: () => void; focusJobId?: string; openPanel: (id: PanelId, data?: Record<string, unknown>) => void }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const toggleOpen = (id: string) => setOpenIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const load = () => trpcAuthed().jobs.employerApplications.query()
    .then((d: any) => { setJobs(d as Job[]); setLoaded(true) })
    .catch(() => setLoaded(true))
  useEffect(() => { load() }, [])

  const shown = focusJobId ? jobs.filter(j => j.id === focusJobId) : jobs

  const changeStatus = async (app: App, status: string) => {
    if (status === app.status) return
    let note: string | undefined
    if (status === 'rejected') {
      const reason = prompt('A reason note is required when rejecting a candidate:')
      if (reason === null) return
      if (!reason.trim()) { alert('A reason note is required.'); return }
      note = reason.trim()
    }
    setSaving(app.id)
    try {
      await trpcAuthed().jobs.setApplicationStatus.mutate({ applicationId: app.id, status: status as any, note })
      setJobs(prev => prev.map(j => ({ ...j, applications: j.applications.map(a => a.id === app.id ? { ...a, status, employerNote: status === 'rejected' ? note! : null } : a) })))
    } catch (e: any) { alert(e?.message || 'Could not update status.') }
    finally { setSaving(null) }
  }

  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ background: '#fff', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>📋 Applicants</span>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {!loaded ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>Loading…</div>
          ) : shown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>No job posts yet</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Post a job and applicants will appear here.</div>
            </div>
          ) : shown.map(j => {
            const hired = j.applications.filter(a => a.status === 'hired').length
            return (
              <div key={j.id} style={{ marginBottom: 18 }}>
                <div style={{ background: '#f8f9fa', border: '1px solid #1a1a1a', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>{j.jobTitle} <span style={{ color: '#888', fontWeight: 700 }}>· {j.company}</span></div>
                  <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-ui)' }}>{j.applications.length} applicant{j.applications.length === 1 ? '' : 's'}{hired ? ` · ${hired} hired` : ''}</div>
                </div>

                {j.applications.length === 0 ? (
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#bbb', paddingLeft: 4 }}>No applicants yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {j.applications.map(a => {
                      const st = STATUS[a.status] ?? STATUS.applied
                      return (
                        <div key={a.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '11px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 900, flexShrink: 0 }}>{a.applicant.charAt(0)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: '#1a1a1a' }}>{a.applicant}</div>
                              <div style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-ui)' }}>Applied {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                            </div>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                          </div>

                          {a.coverNote && <div style={{ marginTop: 6, background: '#f8f9fa', borderRadius: 8, padding: '6px 8px', fontSize: 11, color: '#555', fontFamily: 'var(--font-ui)' }}>💬 {a.coverNote}</div>}
                          {a.employerNote && <div style={{ marginTop: 6, background: '#fef2f2', borderRadius: 8, padding: '6px 8px', fontSize: 10, color: '#b91c1c', fontFamily: 'var(--font-ui)' }}>📝 {a.employerNote}</div>}

                          <button onClick={() => toggleOpen(a.id)} style={{ marginTop: 8, background: 'none', border: 'none', color: ORANGE, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: 0 }}>{openIds.has(a.id) ? '▲ Hide details' : '▼ View full application'}</button>

                          {openIds.has(a.id) && (
                            <div style={{ marginTop: 8, background: '#f8f9fa', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {a.fullName && <Detail icon="👤" label="Name" value={a.fullName} />}
                              {a.email && <Detail icon="📧" label="Email" value={a.email} />}
                              {a.phone && <Detail icon="📱" label="Phone" value={a.phone} />}
                              {a.currentRole && <Detail icon="💼" label="Current role" value={a.currentRole} />}
                              {expLabel(a.experienceMonths) && <Detail icon="📈" label="Experience" value={expLabel(a.experienceMonths)!} />}
                              {a.languages.length > 0 && <Detail icon="🌐" label="Languages" value={a.languages.join(', ')} />}
                              {a.location && <Detail icon="📍" label="Location" value={a.location} />}
                              {a.rightToWork && <Detail icon="🛂" label="Right to work" value={a.rightToWork} />}
                              {a.availability && <Detail icon="🗓️" label="Availability" value={a.availability} />}
                              {a.expectedSalary != null && <Detail icon="💶" label="Expected salary" value={`€${a.expectedSalary.toLocaleString()}/mo`} />}
                              {a.linkedinUrl && <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)' }}>🔗 <a href={a.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: ORANGE, fontWeight: 800 }}>LinkedIn / portfolio</a></div>}
                              {a.cvUrl && <a href={a.cvUrl} target="_blank" rel="noreferrer" style={{ marginTop: 2, background: ORANGE, color: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, textDecoration: 'none' }}>📄 Download CV</a>}

                              {j.questions.length > 0 && Object.keys(a.answers).length > 0 && (
                                <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px solid #eee' }}>
                                  {j.questions.map(q => a.answers[q.id] !== undefined && a.answers[q.id] !== '' ? (
                                    <div key={q.id} style={{ marginBottom: 5 }}>
                                      <div style={{ fontSize: 9.5, fontWeight: 800, color: '#888', fontFamily: 'var(--font-ui)', textTransform: 'uppercase' }}>{q.label}</div>
                                      <div style={{ fontSize: 11.5, color: '#1a1a1a', fontFamily: 'var(--font-ui)' }}>{String(a.answers[q.id])}</div>
                                    </div>
                                  ) : null)}
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: '#555', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                            <select value={a.status} disabled={saving === a.id} onChange={e => changeStatus(a, e.target.value)} style={{ width: '100%', border: `1.5px solid ${st.color}`, borderRadius: 10, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: st.color, background: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                              {ORDER.map(k => <option key={k} value={k}>{STATUS[k].label}</option>)}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: 11.5, fontFamily: 'var(--font-ui)' }}>
      <span>{icon}</span>
      <span style={{ color: '#888', fontWeight: 700 }}>{label}:</span>
      <span style={{ color: '#1a1a1a', fontWeight: 700 }}>{value}</span>
    </div>
  )
}
