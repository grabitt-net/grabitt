'use client'
import { useEffect, useState } from 'react'
import { usePanel } from '@/context/PanelContext'
import { trpcAuthed } from '@/lib/authToken'

// Employer Dashboard body — rendered as a full page (see app/employers/page.tsx)
// with the standard header/footer. Mirrors the V20 openEmployerDashboard flow
// against real data. Cross-links (applicants, find staff, verify) open as modals
// via PanelHost, which the page also mounts.

const ORANGE = '#FF4500'
const FREE_JOBS = 3          // first 3 job listings are free
const JOB_LIFE_DAYS = 21     // listings run for 21 days

type App = { id: string; status: string; applicant: string; applicantId: string; coverNote: string | null; employerNote: string | null; createdAt: string }
type Job = { id: string; listingId: string; jobTitle: string; company: string; type: string; listingStatus: string; postedAt: string; image: string | null; applications: App[] }

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

  const posted = jobs.length
  const applicants = jobs.reduce((n, j) => n + j.applications.length, 0)
  const remaining = Math.max(0, FREE_JOBS - posted)

  const shareJobs = async (url: string, title: string) => {
    try {
      if (navigator.share) await navigator.share({ title, url })
      else { await navigator.clipboard.writeText(url); alert('Link copied to clipboard') }
    } catch { /* user cancelled */ }
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const statCard = (n: number, label: string, color: string, bg: string) => (
    <div style={{ flex: 1, background: bg, borderRadius: 10, padding: 10, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 900, color }}>{n}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      {/* Counter card */}
      <div style={{ background: 'linear-gradient(135deg,#1a1a1a,#333)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 10 }}>Your Job Listings</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {statCard(posted, 'POSTED', '#fff', 'rgba(255,255,255,0.1)')}
          {statCard(applicants, 'APPLICANTS', '#FF7A00', 'rgba(255,255,255,0.1)')}
          {statCard(remaining, 'FREE LEFT', '#22c55e', 'rgba(34,197,94,0.18)')}
        </div>
        <a href="/jobs/new" style={{ textDecoration: 'none' }}>
          <div style={{ marginTop: 12, background: ORANGE, color: '#fff', borderRadius: 50, padding: 10, textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
            {remaining > 0 ? `+ Post a Job (${remaining} free)` : '+ Post a Job'}
          </div>
        </a>
        <div onClick={() => openPanel('verifyMe')} style={{ marginTop: 8, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>🏢 Company details &amp; verification →</div>
      </div>

      {/* Messages */}
      <a href="/messages" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF3EE', border: '1px solid #FFD4C0', borderRadius: 12, padding: 12, marginBottom: 14, cursor: 'pointer' }}>
          <div style={{ fontSize: 22 }}>📨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>Messages</div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-ui)' }}>Candidate enquiries &amp; contact Grabitt</div>
          </div>
          <div style={{ color: ORANGE, fontWeight: 800, fontSize: 11, fontFamily: 'var(--font-ui)' }}>Open →</div>
        </div>
      </a>

      {/* Find Staff cross-link */}
      <div onClick={() => openPanel('findStaff')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8f9fa', border: '1px solid #eee', borderRadius: 12, padding: 12, marginBottom: 14, cursor: 'pointer' }}>
        <div style={{ fontSize: 22 }}>🧑‍💼</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>Find Staff</div>
          <div style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-ui)' }}>Search candidates &amp; unlock profiles</div>
        </div>
        <div style={{ color: ORANGE, fontWeight: 800, fontSize: 11, fontFamily: 'var(--font-ui)' }}>Open →</div>
      </div>

      {/* Share prompt */}
      <div style={{ background: 'linear-gradient(135deg,#FF4500,#FF8C00)', borderRadius: 14, padding: 16, marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 4 }}>📣</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Get more applicants — share your jobs!</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-ui)', marginBottom: 12, lineHeight: 1.5 }}>Listings shared on social reach a wider audience. More eyes means more quality candidates.</div>
        <button onClick={() => shareJobs(`${origin}/jobs`, 'Jobs on Grabitt')} style={{ width: '100%', background: '#fff', color: ORANGE, border: 'none', borderRadius: 50, padding: 11, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>📤 Share My Jobs</button>
      </div>

      {/* Listings */}
      {!loaded ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>Loading…</div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#777', fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: 1.6 }}>No live job listings yet.<br />Post your first job above 💼</div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>My Listings</div>
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
                      <div style={{ fontSize: 10, color: '#666', fontFamily: 'var(--font-ui)' }}>{j.applications.length} applicant{j.applications.length === 1 ? '' : 's'} · {chip}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <button onClick={() => openPanel('applications', { jobId: j.id })} style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>📋 Applicants{newCount ? ` (${newCount} new)` : ''}</button>
                    <a href={`/jobs/new?edit=${j.listingId}`} style={{ flex: 1, textDecoration: 'none' }}>
                      <div style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #1a1a1a', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}>✏️ Edit</div>
                    </a>
                    <button onClick={() => shareJobs(`${origin}/listings/${j.listingId}`, j.jobTitle)} style={{ flex: 1, background: ORANGE, color: '#fff', border: 'none', borderRadius: 50, padding: 8, fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>📤 Share</button>
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
