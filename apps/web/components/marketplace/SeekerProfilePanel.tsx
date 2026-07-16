'use client'
import { useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { JOB_SECTORS, JOB_LANGUAGES, JOB_ATTRIBUTES, EXP_OPTIONS } from './FindStaffPanel'

// "List yourself for work" — a job-seeker's available-for-work profile. Employers
// find these anonymously via Find Staff and spend credits to unlock contact.

const ORANGE = '#FF4500'
const LABEL: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', marginBottom: 6 }
const SELECT: React.CSSProperties = { width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff', outline: 'none', boxSizing: 'border-box' }

export default function SeekerProfilePanel({ onClose }: { onClose: () => void }) {
  const [headline, setHeadline] = useState('')
  const [sector, setSector] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [exp, setExp] = useState('0')
  const [langs, setLangs] = useState<string[]>([])
  const [hours, setHours] = useState<string[]>([])
  const [availability, setAvailability] = useState('')
  const [rightToWork, setRightToWork] = useState('')
  const [location, setLocation] = useState('')
  const [active, setActive] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    trpcAuthed().seekers.myProfile.query().then((p: any) => {
      if (p) {
        setHeadline(p.headline || ''); setSector(p.sector || ''); setRoles(p.roles || [])
        setExp(String(p.experienceMonths || 0)); setLangs(p.languages || []); setHours(p.hours || [])
        setAvailability(p.availability || ''); setRightToWork(p.rightToWork || ''); setLocation(p.location || '')
        setActive(p.active)
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const save = async () => {
    if (!sector) { alert('Pick your sector so employers can find you.'); return }
    setSaving(true)
    try {
      await trpcAuthed().seekers.upsertProfile.mutate({
        headline: headline.trim() || undefined,
        sector, roles,
        experienceMonths: Number(exp) || 0,
        languages: langs, hours,
        availability: availability || undefined,
        rightToWork: rightToWork || undefined,
        location: location || undefined,
        active,
      })
      alert('Your work profile is live. Employers can now find you. 🙌')
      onClose()
    } catch { alert('Could not save your profile. Please sign in and try again.') }
    finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ background: '#fff', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>🙋 List Yourself for Work</span>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {!loaded ? <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-ui)' }}>Loading…</div> : (
            <>
              <div style={{ fontSize: 11, color: ORANGE, fontFamily: 'var(--font-ui)', marginBottom: 14, lineHeight: 1.5 }}>
                Add your details so employers searching Find Staff can match you. Your contact details stay hidden until an employer spends credits to unlock them.
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Headline</div>
                <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Experienced bartender, fluent EN/ES" style={SELECT} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Sector</div>
                <select value={sector} onChange={e => { setSector(e.target.value); setRoles([]) }} style={SELECT}>
                  <option value="">Select sector…</option>
                  {Object.keys(JOB_SECTORS).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {sector && (
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL}>Roles (pick any)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {JOB_SECTORS[sector].map(r => (
                      <span key={r} onClick={() => toggle(roles, setRoles, r)} style={{ background: roles.includes(r) ? ORANGE : '#f0f0f0', color: roles.includes(r) ? '#fff' : '#555', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{r}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Experience</div>
                <select value={exp} onChange={e => setExp(e.target.value)} style={SELECT}>
                  {EXP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Languages</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {JOB_LANGUAGES.map(l => (
                    <span key={l} onClick={() => toggle(langs, setLangs, l)} style={{ background: langs.includes(l) ? ORANGE : '#f8f9fa', color: langs.includes(l) ? '#fff' : '#1a1a1a', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{l}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Hours</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {JOB_ATTRIBUTES.hours.map(o => (
                    <span key={o} onClick={() => toggle(hours, setHours, o)} style={{ background: hours.includes(o) ? ORANGE : '#f8f9fa', color: hours.includes(o) ? '#fff' : '#1a1a1a', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{o}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={LABEL}>Availability</div>
                  <select value={availability} onChange={e => setAvailability(e.target.value)} style={SELECT}>
                    <option value="">—</option>
                    {JOB_ATTRIBUTES.availability.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={LABEL}>Location</div>
                  <select value={location} onChange={e => setLocation(e.target.value)} style={SELECT}>
                    <option value="">—</option>
                    {JOB_ATTRIBUTES.location.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={LABEL}>Right to Work</div>
                <select value={rightToWork} onChange={e => setRightToWork(e.target.value)} style={SELECT}>
                  <option value="">—</option>
                  {JOB_ATTRIBUTES.rightToWork.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8f9fa', borderRadius: 10, padding: '10px 12px', marginBottom: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: ORANGE }} />
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>Visible to employers (uncheck to pause)</span>
              </label>

              <button onClick={save} disabled={saving} style={{ width: '100%', background: ORANGE, color: '#fff', border: 'none', borderRadius: 50, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save my work profile'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
