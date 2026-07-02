'use client'
import { useState } from 'react'

interface JobListing {
  id: string
  company: string
  role: string
  location: string
  type: string
  credits: number
  posted: string
  status: 'live' | 'expired'
}

const INITIAL_JOBS: JobListing[] = [
  { id: 'j01', company: 'Nordic Travel GC', role: 'Tourist Guide', location: 'Las Palmas', type: 'Full-time', credits: 400, posted: 'Jun 5', status: 'live' },
  { id: 'j02', company: 'GC Supermarket', role: 'Store Manager', location: 'Maspalomas', type: 'Full-time', credits: 400, posted: 'Jun 10', status: 'live' },
]

const JOB_TYPES = ['Full-time', 'Part-time', 'Seasonal', 'Contract']

function toast(msg: string) {
  // reuse browser alert as simple feedback — matches HTML build behaviour
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:50px;font-family:Nunito,sans-serif;font-size:12px;font-weight:700;z-index:99999;'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
}

export default function JobsView() {
  const [jobs, setJobs] = useState<JobListing[]>(INITIAL_JOBS)
  const [showModal, setShowModal] = useState(false)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('Full-time')

  function removeJob(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id))
    toast('Job listing removed ✓')
  }

  function saveJob() {
    if (!company.trim() || !role.trim()) { alert('Please enter company and role'); return }
    const posted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    const newJob: JobListing = { id: 'j' + Date.now(), company: company.trim(), role: role.trim(), location: location.trim() || '—', type, credits: 400, posted, status: 'live' }
    setJobs(prev => [newJob, ...prev])
    setShowModal(false)
    setCompany(''); setRole(''); setLocation(''); setType('Full-time')
    toast(`${newJob.role} at ${newJob.company} posted ✓`)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>
          <span style={{ color: '#FF4500' }}>Jobs</span> 💼
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '7px 14px', fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
          + Post Job
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#666', fontFamily: 'Comfortaa, sans-serif', marginBottom: 14 }}>
        400 credits (€20) per job listing posted
      </div>

      {/* Job list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: '#777', fontSize: 12, fontFamily: 'Comfortaa, sans-serif' }}>
            No job listings yet
          </div>
        )}
        {jobs.map(j => (
          <div key={j.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 14, borderLeft: '4px solid #FF4500' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>{j.role}</div>
                <div style={{ fontSize: 11, color: '#666', fontFamily: 'Comfortaa, sans-serif', marginTop: 2 }}>{j.company} · {j.location}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: '#FFF3EE', color: '#FF4500', borderRadius: 50, padding: '2px 8px', fontSize: 9, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>{j.type}</span>
                  <span style={{ background: '#f0f0f0', color: '#666', borderRadius: 50, padding: '2px 8px', fontSize: 9, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>🪙 {j.credits} credits</span>
                  <span style={{ background: j.status === 'live' ? '#22c55e' : '#94a3b8', color: '#fff', borderRadius: 50, padding: '2px 8px', fontSize: 9, fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>{j.status}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: '#666' }}>{j.posted}</div>
                <button onClick={() => removeJob(j.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', marginTop: 6, fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Post Job modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 380, maxWidth: '95vw', overflow: 'hidden' }}>
            <div style={{ background: '#FF4500', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>💼 Post Job Listing</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: '#fff', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" style={{ border: '1.5px solid #eee', borderRadius: 10, padding: 10, fontFamily: 'Comfortaa, sans-serif', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role / position" style={{ border: '1.5px solid #eee', borderRadius: 10, padding: 10, fontFamily: 'Comfortaa, sans-serif', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" style={{ border: '1.5px solid #eee', borderRadius: 10, padding: 10, fontFamily: 'Comfortaa, sans-serif', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              <select value={type} onChange={e => setType(e.target.value)} style={{ border: '1.5px solid #eee', borderRadius: 10, padding: 10, fontFamily: 'Comfortaa, sans-serif', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={saveJob} style={{ background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 24px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer', marginTop: 4 }}>
                Post Job →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
