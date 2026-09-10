'use client'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/ui'
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

function daysLeft(postedAt: string) {
  const end = new Date(postedAt).getTime() + JOB_LIFE_DAYS * 86400000
  return Math.ceil((end - Date.now()) / 86400000)
}

export default function EmployerDashboardContent() {
  const { openPanel } = usePanel()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    trpcAuthed().jobs.employerApplications.query()
      .then((d: any) => { setJobs(d as Job[]); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

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

      {/* Listings */}
      {!loaded ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>Loading…</div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#777', fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: 1.6 }}>No job adverts yet.<br />Post your first job above 💼</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.map(j => {
              const dLeft = daysLeft(j.postedAt)
              const filled = j.listingStatus !== 'active'
              const expired = !filled && dLeft <= 0
              const newCount = j.applications.filter(a => a.status === 'applied').length
              let chip: React.ReactNode
              if (filled) chip = <span style={{ background: '#22c55e1a', color: '#16a34a', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 8px', borderRadius: 50 }}>✓ Closed</span>
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
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
