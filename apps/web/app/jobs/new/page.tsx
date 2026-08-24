'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import type { JobQuestion, JobQuestionType } from '@/lib/jobQuestions'
import { QUESTION_TYPE_LABEL } from '@/lib/jobQuestions'
import { GC_TOWNS } from '@/lib/gcTowns'
import { JOB_SECTORS, JOB_LANGUAGES } from '@/lib/jobCategories'

// Experience-required buckets — same vocabulary as the candidate profile; the
// value is the lower-bound months stored on the advert for auto-matching.
const EXP_REQUIRED: [string, number][] = [['<3m', 0], ['<6m', 3], ['<1y', 6], ['1-2y', 12], ['2+y', 24]]

const MapPicker = dynamic(() => import('@/components/marketplace/MapPicker'), { ssr: false })

const TYPES: [string, string][] = [
  ['Full Time', 'full_time'], ['Part Time', 'part_time'], ['Contract', 'contract'], ['Temp', 'temporary'], ['Volunteer', 'volunteer'],
]

export default function PostJobPage() {
  const router = useRouter()
  const [f, setF] = useState({
    jobTitle: '', company: '', establishmentType: '', sector: '', type: 'full_time', location: '', address: '',
    salaryMin: '', salaryMax: '', salaryPeriod: 'month', payments: '', overtime: false, tips: false,
    remote: false, hours: '', startDate: '', description: '',
  })
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  // Structured matching data (canonical taxonomy) captured for candidate auto-matching.
  const [roles, setRoles] = useState<string[]>([])
  const [expMonths, setExpMonths] = useState<number | null>(null)
  const [languages, setLanguages] = useState<string[]>([])
  const sectorJobs = JOB_SECTORS.find(s => s.name === f.sector)?.jobs ?? []
  const toggleRole = (r: string) => setRoles(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r])
  const toggleLang = (l: string) => setLanguages(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState<JobQuestion[]>([])
  // Only business accounts may post jobs.
  const [gate, setGate] = useState<'checking' | 'ok' | 'needbusiness'>('checking')

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/jobs/new'); return }
      try {
        const me: any = await (trpcAuthed() as any).users.me.query()
        setGate(me?.isBusiness ? 'ok' : 'needbusiness')
      } catch { router.push('/auth?next=/jobs/new') }
    })()
  }, [router])

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }))
  const addQ = () => setQuestions(qs => [...qs, { id: crypto.randomUUID().slice(0, 8), label: '', type: 'short', required: false }])
  const updateQ = (id: string, patch: Partial<JobQuestion>) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))
  const removeQ = (id: string) => setQuestions(qs => qs.filter(q => q.id !== id))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!f.jobTitle.trim() || !f.company.trim() || !f.establishmentType.trim() || !f.location.trim()) {
      setError('Job title, employer and location are required.'); return
    }
    setSaving(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/jobs/new'); return }

      const listing: any = await trpcAuthed().jobs.create.mutate({
        jobTitle: f.jobTitle.trim(),
        company: f.company.trim(),
        establishmentType: f.establishmentType.trim() || undefined,
        type: f.type as never,
        location: f.location.trim(),
        ...(f.address.trim() && { address: f.address.trim() }),
        ...(f.sector && { sector: f.sector }),
        ...(roles.length && { roles }),
        ...(languages.length && { languages }),
        ...(expMonths != null && { experienceMonths: expMonths }),
        ...(f.description.trim() && { description: f.description.trim() }),
        ...(f.salaryMin && { salaryMin: Number(f.salaryMin) }),
        ...(f.salaryMax && { salaryMax: Number(f.salaryMax) }),
        salaryPeriod: f.salaryPeriod as never,
        ...(f.payments && { payments: Number(f.payments) }),
        overtime: f.overtime,
        tips: f.tips,
        remote: f.remote,
        ...(f.hours.trim() && { hours: f.hours.trim() }),
        ...(f.startDate && { startDate: f.startDate }),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        ...(questions.some(q => q.label.trim()) ? {
          applicationQuestions: questions
            .filter(q => q.label.trim())
            .map(q => ({
              id: q.id,
              label: q.label.trim(),
              type: q.type,
              required: q.required,
              ...(q.type === 'choice' ? { options: (q.options ?? []).filter(Boolean) } : {}),
            })),
        } : {}),
      })
      // Beyond the free allowance a job is €39 — go pay, then the webhook
      // publishes it. Within allowance it's already live.
      if (listing?.pendingPayment && listing?.checkoutUrl) { window.location.href = listing.checkoutUrl; return }
      router.push(`/listings/${listing.id}`)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (/UNAUTHORIZED|FORBIDDEN|jwt|token/i.test(msg)) router.push('/auth?next=/jobs/new')
      else setError('Could not post the job. Please check the fields and try again.')
    } finally { setSaving(false) }
  }

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: '#f7f4ee', minHeight: '100dvh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Post a Job" />
      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/jobs" style={{ textDecoration: 'none', fontSize: 22, color: 'var(--orange)', fontWeight: 700 }}>‹</Link>
      </header>

      {gate === 'checking' && <div style={{ textAlign: 'center', padding: 60, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Checking your account…</div>}
      {gate === 'needbusiness' && <BusinessGate />}

      {gate === 'ok' && (
      <form onSubmit={submit} style={{ maxWidth: 640, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Section title="The role">
          <Field label="Job title *"><input value={f.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Bar Staff" style={inp} /></Field>
          <Row>
            <Field label="Employer name *"><input value={f.company} onChange={e => set('company', e.target.value)} placeholder="e.g. The Irish Rover" style={inp} /></Field>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', marginTop: -6, marginBottom: 10, lineHeight: 1.5 }}>
              🔒 Your name is not shown on the advert. Candidates see the establishment type below, and learn who you are only when you invite them to interview.
            </div>
            <Field label="Establishment type *"><input value={f.establishmentType} onChange={e => set('establishmentType', e.target.value)} placeholder="e.g. Beach bar, 4-star hotel, Family restaurant" style={inp} /></Field>
            <Field label="Category / sector">
              <select value={f.sector} onChange={e => { set('sector', e.target.value); setRoles([]) }} style={sel}>
                <option value="">Select…</option>{JOB_SECTORS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Role type">
              <select value={f.type} onChange={e => set('type', e.target.value)} style={sel}>{TYPES.map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select>
            </Field>
            <Field label="Hours of operation"><input value={f.hours} onChange={e => set('hours', e.target.value)} placeholder="e.g. Mon–Fri 9:00–17:00" style={inp} /></Field>
          </Row>
          <label style={chk}><input type="checkbox" checked={f.remote} onChange={e => set('remote', e.target.checked)} /> Remote / work from home</label>
        </Section>

        {/* Candidate matching — captured against the same taxonomy as jobseeker
            profiles, so we can auto-match this advert to people looking for work. */}
        <Section title="Candidate matching">
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 10, lineHeight: 1.5 }}>
            Tell us the exact role(s), experience and languages you need. We use this to match your advert to suitable candidates (and to power employer searches).
          </div>
          {f.sector ? (
            <Field label="Role(s) this advert covers">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {sectorJobs.map(r => {
                  const on = roles.includes(r)
                  return <button key={r} type="button" onClick={() => toggleRole(r)} style={pill(on)}>{r}</button>
                })}
              </div>
            </Field>
          ) : (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#b45309', marginBottom: 10 }}>Pick a category / sector above to choose the specific roles.</div>
          )}
          <Field label="Minimum experience required">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {EXP_REQUIRED.map(([lbl, m]) => (
                <button key={lbl} type="button" onClick={() => setExpMonths(expMonths === m ? null : m)} style={pill(expMonths === m)}>{lbl}</button>
              ))}
            </div>
          </Field>
          <Field label="Languages required">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {JOB_LANGUAGES.map(([, label]) => {
                const on = languages.includes(label)
                return <button key={label} type="button" onClick={() => toggleLang(label)} style={pill(on)}>{label}</button>
              })}
            </div>
          </Field>
        </Section>

        <Section title="Location">
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 4 }}>Give the job&apos;s address — this is where the work is, not your profile address.</div>
          <Field label="Location (town / area) *"><select value={f.location} onChange={e => set('location', e.target.value)} style={inp}><option value="">Select a town…</option>{GC_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Full address (shown with a map on the listing)"><input value={f.address} onChange={e => set('address', e.target.value)} placeholder="Street, number, postcode, town" style={inp} /></Field>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Pin the exact location on the map</label>
            <MapPicker value={coords} onChange={setCoords} />
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginTop: 6 }}>{coords ? `📍 Pinned at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Tap the map to drop a pin where the job is based.'}</div>
          </div>
        </Section>

        <Section title="Pay">
          <Row>
            <Field label="Salary from (€)"><input value={f.salaryMin} onChange={e => set('salaryMin', e.target.value)} inputMode="numeric" placeholder="1200" style={inp} /></Field>
            <Field label="Salary to (€)"><input value={f.salaryMax} onChange={e => set('salaryMax', e.target.value)} inputMode="numeric" placeholder="1400" style={inp} /></Field>
            <Field label="Per">
              <select value={f.salaryPeriod} onChange={e => set('salaryPeriod', e.target.value)} style={sel}>
                <option value="month">month</option><option value="year">year</option><option value="hour">hour</option>
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Payments / year">
              <select value={f.payments} onChange={e => set('payments', e.target.value)} style={sel}>
                <option value="">—</option><option value="12">12 payments</option><option value="14">14 payments</option>
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', paddingBottom: 8 }}>
              <label style={chk}><input type="checkbox" checked={f.overtime} onChange={e => set('overtime', e.target.checked)} /> Overtime</label>
              <label style={chk}><input type="checkbox" checked={f.tips} onChange={e => set('tips', e.target.checked)} /> Tips</label>
            </div>
          </Row>
        </Section>

        <Section title="Details">
          <Field label="Expected start date"><input type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} style={inp} /></Field>
          <Field label="Description"><textarea value={f.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Describe the role, responsibilities and requirements…" style={{ ...inp, resize: 'vertical' }} /></Field>
        </Section>

        <Section title="Screening questions">
          <div style={{ fontSize: 12, color: '#777', fontFamily: 'var(--font-ui)', marginTop: -4, marginBottom: 4 }}>Optional. Ask candidates specific questions they answer when applying.</div>
          {questions.map(q => (
            <div key={q.id} style={{ border: '1px solid #e5dccd', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={q.label} onChange={e => updateQ(q.id, { label: e.target.value })} placeholder="Question, e.g. Do you have a driving licence?" style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={() => removeQ(q.id)} style={{ background: '#fff', border: '1px solid #e5dccd', borderRadius: 8, padding: '0 12px', color: '#c00', cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={q.type} onChange={e => updateQ(q.id, { type: e.target.value as JobQuestionType })} style={{ ...inp, width: 'auto' }}>
                  {(Object.keys(QUESTION_TYPE_LABEL) as JobQuestionType[]).map(t => <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>)}
                </select>
                <label style={chk}><input type="checkbox" checked={q.required} onChange={e => updateQ(q.id, { required: e.target.checked })} /> Required</label>
              </div>
              {q.type === 'choice' && (
                <input value={(q.options ?? []).join(', ')} onChange={e => updateQ(q.id, { options: e.target.value.split(',').map(s => s.trim()) })} placeholder="Options, comma separated" style={inp} />
              )}
            </div>
          ))}
          <button type="button" onClick={addQ} style={{ background: '#fff', border: '1.5px solid var(--orange)', color: 'var(--orange)', borderRadius: 10, padding: '10px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>+ Add a question</button>
        </Section>

        {error && <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#c62828', fontFamily: 'var(--font-ui)' }}>{error}</div>}

        <button type="submit" disabled={saving} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 20px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Posting…' : 'Post Job →'}
        </button>
      </form>
      )}
      <PanelHost />
    </main>
    </PanelProvider>
  )
}

// Shown when a signed-in, non-business user tries to post a job. Jobs can only
// be posted from a Business account, so we prompt them to sign up as one.
function BusinessGate() {
  const { openPanel } = usePanel()
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🏢</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Business account required</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 18 }}>
          Job adverts can only be posted from a Grabitt Business account. Sign up as a business to post jobs, manage applicants and access your Employer Dashboard.
        </div>
        <button onClick={() => openPanel('business')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Sign up as a business →</button>
        <Link href="/jobs" style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#888', textDecoration: 'none' }}>← Back to jobs</Link>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: 14 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '9px 11px', fontFamily: 'var(--font-ui)', fontSize: 13, boxSizing: 'border-box', background: '#fff', outline: 'none' }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer', fontWeight: 700 }
const chk: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: '#555', cursor: 'pointer' }
const pill = (on: boolean): React.CSSProperties => ({ border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? '#FFF3EE' : '#fff', color: on ? 'var(--orange)' : '#555', borderRadius: 999, padding: '6px 13px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', lineHeight: 1 })
