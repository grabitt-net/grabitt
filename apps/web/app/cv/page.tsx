'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHost'

// My CV — the candidate's real, structured CV. Rendered to a formatted PDF for
// recruiters on apply (anonymised until they shortlist). This is the editor;
// contact details (name/email/phone) come from the account and are shown, not
// edited, here.

type Job = { title: string; employer: string; location: string; start: string; end: string; current: boolean; bullets: string[] }
type Edu = { qualification: string; institution: string; start: string; end: string; status: string }

const newJob = (): Job => ({ title: '', employer: '', location: '', start: '', end: '', current: false, bullets: [''] })
const newEdu = (): Edu => ({ qualification: '', institution: '', start: '', end: '', status: '' })

export default function CvPage() {
  return <PanelProvider><CvInner /></PanelProvider>
}

function CvInner() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [summary, setSummary] = useState('')
  const [skills, setSkills] = useState('')
  const [strengths, setStrengths] = useState('')
  const [certifications, setCertifications] = useState('')
  const [languages, setLanguages] = useState('')
  const [availability, setAvailability] = useState('')
  const [rightToWork, setRightToWork] = useState('')
  const [location, setLocation] = useState('')
  const [work, setWork] = useState<Job[]>([])
  const [education, setEducation] = useState<Edu[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { router.push('/auth?next=/cv'); return }
    try {
      const [u, p] = await Promise.all([
        (trpcAuthed() as any).users.me.query(),
        (trpcAuthed() as any).seekers.myProfile.query(),
      ])
      setMe(u)
      if (p) {
        setSummary(p.summary || '')
        setSkills((p.skills || []).join(', '))
        setStrengths((p.keyStrengths || []).join(', '))
        setCertifications((p.certifications || []).join(', '))
        setLanguages((p.languages || []).join(', '))
        setAvailability(p.availability || '')
        setRightToWork(p.rightToWork || '')
        setLocation(p.location || '')
        setWork(Array.isArray(p.workExperience) && p.workExperience.length ? p.workExperience.map((w: any) => ({ ...newJob(), ...w, bullets: w.bullets?.length ? w.bullets : [''] })) : [])
        setEducation(Array.isArray(p.education) && p.education.length ? p.education.map((e: any) => ({ ...newEdu(), ...e })) : [])
      }
    } catch { /* leave blank */ }
    finally { setReady(true) }
  }, [router])
  useEffect(() => { load() }, [load])

  const splitList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

  const save = async () => {
    setErr(''); setSaved(false); setSaving(true)
    try {
      await (trpcAuthed() as any).seekers.upsertProfile.mutate({
        summary: summary.trim() || undefined,
        skills: splitList(skills),
        keyStrengths: splitList(strengths),
        certifications: splitList(certifications),
        languages: splitList(languages),
        availability: availability.trim() || undefined,
        rightToWork: rightToWork.trim() || undefined,
        location: location.trim() || undefined,
        workExperience: work
          .filter(w => w.title.trim() || w.employer.trim())
          .map(w => ({ ...w, title: w.title.trim(), employer: w.employer.trim(), location: w.location.trim(), bullets: w.bullets.map(b => b.trim()).filter(Boolean) })),
        education: education
          .filter(e => e.qualification.trim() || e.institution.trim())
          .map(e => ({ ...e, qualification: e.qualification.trim(), institution: e.institution.trim() })),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save your CV.') }
    finally { setSaving(false) }
  }

  const patchJob = (i: number, patch: Partial<Job>) => setWork(w => w.map((x, j) => j === i ? { ...x, ...patch } : x))
  const patchEdu = (i: number, patch: Partial<Edu>) => setEducation(e => e.map((x, j) => j === i ? { ...x, ...patch } : x))

  const shell = (body: React.ReactNode) => (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar />{body}<Footer /><PanelHost />
    </main>
  )
  if (!ready) return shell(<div style={{ textAlign: 'center', padding: 70, color: '#8a7d68', fontFamily: 'var(--font-nunito)' }}>Loading your CV…</div>)

  return shell(
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 22, fontWeight: 700, color: 'var(--dark)' }}>📄 My CV</span>
        <Link href="/account" style={{ marginLeft: 'auto', textDecoration: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#9a8b74' }}>‹ Account</Link>
      </div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#6b5d48', lineHeight: 1.6, marginBottom: 14 }}>
        This builds the CV recruiters receive when you apply. It stays anonymous — no name, photo or contact — until an employer shortlists you.
      </div>

      {/* Contact — from account, read-only here */}
      <Card title="Contact (from your account)">
        <Row label="Name" value={me?.displayName ?? '—'} />
        <Row label="Email" value={me?.email ?? '—'} />
        <Row label="Phone" value={me?.phone ?? 'Add in Account'} />
        <div style={hint}>These are only shown to an employer after they shortlist or unlock you. <Link href="/account" style={{ color: 'var(--orange)', fontWeight: 800 }}>Edit in Account</Link>.</div>
      </Card>

      <Card title="Professional summary">
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={5} placeholder="A few lines about you — experience, strengths, what you're looking for." style={{ ...field, resize: 'vertical' }} />
      </Card>

      <Card title="Work experience">
        {work.map((w, i) => (
          <div key={i} style={block}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={w.title} onChange={e => patchJob(i, { title: e.target.value })} placeholder="Job title" style={{ ...field, flex: 1, marginBottom: 8 }} />
              <button onClick={() => setWork(work.filter((_, j) => j !== i))} style={rm}>✕</button>
            </div>
            <input value={w.employer} onChange={e => patchJob(i, { employer: e.target.value })} placeholder="Employer" style={field} />
            <input value={w.location} onChange={e => patchJob(i, { location: e.target.value })} placeholder="Location" style={field} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={w.start} onChange={e => patchJob(i, { start: e.target.value })} placeholder="From (e.g. 2022)" style={{ ...field, flex: 1 }} />
              <input value={w.end} onChange={e => patchJob(i, { end: e.target.value })} placeholder="To" disabled={w.current} style={{ ...field, flex: 1, opacity: w.current ? 0.5 : 1 }} />
            </div>
            <label style={chk}><input type="checkbox" checked={w.current} onChange={e => patchJob(i, { current: e.target.checked })} style={cb} /> I currently work here</label>
            <div style={{ ...hint, marginTop: 6 }}>What you did — one point per line</div>
            {w.bullets.map((b, bi) => (
              <div key={bi} style={{ display: 'flex', gap: 8 }}>
                <input value={b} onChange={e => patchJob(i, { bullets: w.bullets.map((x, k) => k === bi ? e.target.value : x) })} placeholder="e.g. Served customers and handled cash" style={{ ...field, flex: 1 }} />
                {w.bullets.length > 1 && <button onClick={() => patchJob(i, { bullets: w.bullets.filter((_, k) => k !== bi) })} style={rm}>✕</button>}
              </div>
            ))}
            <button onClick={() => patchJob(i, { bullets: [...w.bullets, ''] })} style={addSmall}>+ Add a point</button>
          </div>
        ))}
        <button onClick={() => setWork([...work, newJob()])} style={addBtn}>+ Add a job</button>
      </Card>

      <Card title="Education">
        {education.map((ed, i) => (
          <div key={i} style={block}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={ed.qualification} onChange={e => patchEdu(i, { qualification: e.target.value })} placeholder="Qualification / course" style={{ ...field, flex: 1, marginBottom: 8 }} />
              <button onClick={() => setEducation(education.filter((_, j) => j !== i))} style={rm}>✕</button>
            </div>
            <input value={ed.institution} onChange={e => patchEdu(i, { institution: e.target.value })} placeholder="School / university" style={field} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={ed.start} onChange={e => patchEdu(i, { start: e.target.value })} placeholder="From" style={{ ...field, flex: 1 }} />
              <input value={ed.end} onChange={e => patchEdu(i, { end: e.target.value })} placeholder="To" style={{ ...field, flex: 1 }} />
            </div>
            <input value={ed.status} onChange={e => patchEdu(i, { status: e.target.value })} placeholder="Status (e.g. Completed, Ongoing)" style={field} />
          </div>
        ))}
        <button onClick={() => setEducation([...education, newEdu()])} style={addBtn}>+ Add education</button>
      </Card>

      <Card title="Skills & strengths">
        <label style={lbl}>Skills</label>
        <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Comma separated, e.g. Customer Service, Cooking, Excel" style={field} />
        <label style={lbl}>Key strengths</label>
        <input value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="e.g. Reliable, Quick learner, Team player" style={field} />
        <label style={lbl}>Languages</label>
        <input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="e.g. English (Fluent), Spanish (Basic)" style={field} />
        <label style={lbl}>Certifications & knowledge</label>
        <input value={certifications} onChange={e => setCertifications(e.target.value)} placeholder="e.g. Basic First Aid, Food Safety" style={field} />
      </Card>

      <Card title="Availability">
        <label style={lbl}>Availability</label>
        <input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="e.g. Immediate, weekends, flexible shifts" style={field} />
        <label style={lbl}>Right to work</label>
        <input value={rightToWork} onChange={e => setRightToWork(e.target.value)} placeholder="e.g. EU citizen, Work permit held" style={field} />
        <label style={lbl}>Location</label>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Las Palmas, Gran Canaria" style={field} />
      </Card>

      {err && <div style={{ background: '#fff5f5', color: '#ef4444', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
      {saved && <div style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, marginBottom: 10 }}>✓ CV saved</div>}
      <button onClick={save} disabled={saving} style={{ width: '100%', background: saving ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: saving ? 'wait' : 'pointer' }}>
        {saving ? 'Saving…' : 'Save CV'}
      </button>
      <a href="/api/cv-pdf?preview=me" target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 10, textDecoration: 'none', background: '#fff', color: '#555', border: '1.5px solid #e5dccd', borderRadius: 14, padding: 13, fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900 }}>
        📄 Preview my CV
      </a>
      <div style={{ ...hint, textAlign: 'center', marginTop: 8 }}>Save first — the preview shows what you last saved.</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f0e8', fontFamily: 'var(--font-nunito)', fontSize: 13 }}>
      <span style={{ color: '#888', fontWeight: 700 }}>{label}</span>
      <span style={{ color: 'var(--dark)', fontWeight: 800, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff', marginBottom: 8 }
const lbl: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 5, marginTop: 4 }
const hint: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', marginTop: 2, marginBottom: 6, lineHeight: 1.5 }
const block: React.CSSProperties = { border: '1px solid #f0ebe4', borderRadius: 12, padding: 12, marginBottom: 10, background: '#fcfaf6' }
const rm: React.CSSProperties = { background: '#fff', border: '1px solid #e5dccd', borderRadius: 8, padding: '0 12px', color: '#c00', cursor: 'pointer', fontSize: 15, height: 40, flexShrink: 0 }
const cb: React.CSSProperties = { width: 16, height: 16, accentColor: 'var(--orange)' }
const chk: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#444', marginBottom: 4 }
const addBtn: React.CSSProperties = { width: '100%', background: '#fff', border: '1.5px solid var(--orange)', color: 'var(--orange)', borderRadius: 10, padding: '10px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const addSmall: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '2px 0 4px' }
