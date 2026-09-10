'use client'
import { useEffect, useMemo, useState } from 'react'
import { toast, confirmDialog } from '@/lib/ui'
import { usePanel } from '@/context/PanelContext'
import { trpcAuthed } from '@/lib/authToken'

// Employer Dashboard body — rendered as a full page (see app/employers/page.tsx)
// with the standard header/footer. Mirrors the V20 openEmployerDashboard flow
// against real data. Cross-links (applicants, find staff, verify) open as modals
// via PanelHost, which the page also mounts.

const ORANGE = 'var(--orange)'
const JOB_LIFE_DAYS = 21     // listings run for 21 days

type App = { id: string; status: string; applicant: string; applicantId: string; coverNote: string | null; employerNote: string | null; createdAt: string }
type Job = { id: string; listingId: string; jobTitle: string; company: string; type: string; listingStatus: string; postedAt: string; image: string | null; candidateMatching?: boolean; applications: App[] }

const TYPE_EMOJI: Record<string, string> = { full_time: '💼', part_time: '🕒', contract: '📄', temporary: '⏳', volunteer: '🤝' }
const statusBtn = (bg: string, color: string): React.CSSProperties => ({ flex: 1, minWidth: 90, background: bg, color, border: 'none', borderRadius: 50, padding: 7, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' })

function daysLeft(postedAt: string) {
  const end = new Date(postedAt).getTime() + JOB_LIFE_DAYS * 86400000
  return Math.ceil((end - Date.now()) / 86400000)
}

type JobStatus = 'open' | 'filled' | 'removed'
const statusOf = (j: Job): JobStatus => j.listingStatus === 'removed' ? 'removed' : j.listingStatus === 'sold' ? 'filled' : 'open'

export default function EmployerDashboardContent() {
  const { openPanel } = usePanel()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<'all' | JobStatus>('all')

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
    if (status === 'removed' && !(await confirmDialog('Remove this job advert? It will no longer be visible. You can reopen it later.'))) return
    try {
      await trpcAuthed().jobs.setJobStatus.mutate({ listingId, status })
      toast(`✓ ${label}`)
      load()
    } catch (e: any) { toast(e?.message || 'Could not update the job.') }
  }

  const shareJobs = async (url: string, title: string) => {
    try {
      if (navigator.share) await navigator.share({ title, url })
      else { await navigator.clipboard.writeText(url); toast('Link copied to clipboard') }
    } catch { /* user cancelled */ }
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      {/* Header row — just a title and a Post a Job action. Everything else lives
          inside each job card below. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>Candidate Management</div>
        <a href="/jobs/new" style={{ textDecoration: 'none' }}>
          <div style={{ background: ORANGE, color: '#fff', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>+ Post a Job</div>
        </a>
      </div>

      {/* Position status filters */}
      {loaded && jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {([['all', 'All'], ['open', 'Open'], ['filled', 'Filled'], ['removed', 'Removed']] as [typeof filter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ border: `1.5px solid ${filter === k ? ORANGE : '#e5dccd'}`, background: filter === k ? ORANGE : '#fff', color: filter === k ? '#fff' : '#555', borderRadius: 50, padding: '6px 13px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{label} ({counts[k as keyof typeof counts]})</button>
          ))}
        </div>
      )}

      {/* Listings */}
      {!loaded ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>Loading…</div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#777', fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: 1.6 }}>No job adverts yet.<br />Post your first job above 💼</div>
      ) : shownJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#999', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No {filter} positions.</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shownJobs.map(j => {
              const dLeft = daysLeft(j.postedAt)
              const jstatus = statusOf(j)
              const filled = jstatus !== 'open'
              const expired = jstatus === 'open' && dLeft <= 0
              const newCount = j.applications.filter(a => a.status === 'applied').length
              let chip: React.ReactNode
              if (jstatus === 'filled') chip = <span style={{ background: '#22c55e1a', color: '#16a34a', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 8px', borderRadius: 50 }}>✓ Filled</span>
              else if (jstatus === 'removed') chip = <span style={{ background: '#9ca3af1a', color: '#6b7280', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 8px', borderRadius: 50 }}>⚪ Removed</span>
              else if (expired) chip = <span style={{ background: '#ef44441a', color: '#ef4444', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 8px', borderRadius: 50 }}>⏳ Expired</span>
              else { const c = dLeft <= 3 ? '#ef4444' : dLeft <= 7 ? '#f59e0b' : '#22c55e'; chip = <span style={{ background: `${c}1a`, color: c, fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 8px', borderRadius: 50 }}>{dLeft} days left</span> }

              return (
                <div key={j.id} style={{ background: '#f8f9fa', border: '1px solid #1a1a1a', borderRadius: 12, padding: '11px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, overflow: 'hidden' }}>
                      {j.image ? <img src={j.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (TYPE_EMOJI[j.type] ?? '💼')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.jobTitle}</div>
                      <div style={{ fontSize: 10, color: '#666', fontFamily: 'var(--font-ui)' }}>{j.applications.length} applicant{j.applications.length === 1 ? '' : 's'} · {chip}{j.candidateMatching ? ' · ' : ''}{j.candidateMatching && <span style={{ color: ORANGE, fontWeight: 800 }}>🎯 Job Match on</span>}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => openPanel('applications', { jobId: j.id })} style={{ flex: 1, minWidth: 100, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>📋 Applicants{newCount ? ` (${newCount} new)` : ''}</button>
                    <a href={`/jobs/new?edit=${j.listingId}`} style={{ flex: 1, minWidth: 70, textDecoration: 'none' }}>
                      <div style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #1a1a1a', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}>✏️ Edit</div>
                    </a>
                    <button onClick={() => openPanel('jobMessages', { listingId: j.listingId, jobTitle: j.jobTitle })} style={{ flex: 1, minWidth: 70, background: '#fff', color: '#1a1a1a', border: '1px solid #1a1a1a', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>📨 Messages</button>
                    <button onClick={() => shareJobs(`${origin}/listings/${j.listingId}`, j.jobTitle)} style={{ flex: 1, minWidth: 70, background: ORANGE, color: '#fff', border: 'none', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>📤 Share</button>
                  </div>
                  {/* Job Match — the paid Candidate Matching add-on, restricted to
                      THIS advert (the search/unlocks can't be reused elsewhere). */}
                  {j.candidateMatching ? (
                    <button onClick={() => openPanel('findStaff', { jobId: j.id })} style={{ marginTop: 6, width: '100%', background: '#FFF3EE', color: ORANGE, border: '1px solid #FFD4C0', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>🎯 Job Match — search candidates for this job</button>
                  ) : (
                    <div style={{ marginTop: 6, fontSize: 9.5, color: '#999', fontFamily: 'var(--font-ui)', textAlign: 'center' }}>🎯 Job Match (paid) not added — add it when posting or editing this advert.</div>
                  )}
                  {/* Position status controls */}
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {jstatus === 'open' && <button onClick={() => setJobStatus(j.listingId, 'sold', 'Marked as filled')} style={statusBtn('#f0faf4', '#16a34a')}>✓ Mark filled</button>}
                    {jstatus !== 'open' && <button onClick={() => setJobStatus(j.listingId, 'active', 'Reopened')} style={statusBtn('#eef7ff', '#1e6fd0')}>↩ Reopen</button>}
                    {jstatus !== 'removed' && <button onClick={() => setJobStatus(j.listingId, 'removed', 'Removed')} style={statusBtn('#fef2f2', '#ef4444')}>🗑 Remove</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
