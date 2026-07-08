'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

const TYPES: [string, string][] = [
  ['Full Time', 'full_time'], ['Part Time', 'part_time'], ['Contract', 'contract'], ['Temp', 'temporary'], ['Volunteer', 'volunteer'],
]
const SECTORS = ['Hostelería', 'Retail', 'Construcción', 'Administración', 'Salud', 'Educación', 'Transporte', 'Turismo', 'Limpieza', 'Tech / IT', 'Other']

export default function PostJobPage() {
  const router = useRouter()
  const [f, setF] = useState({
    jobTitle: '', company: '', sector: '', type: 'full_time', location: '', address: '',
    salaryMin: '', salaryMax: '', salaryPeriod: 'month', payments: '', overtime: false, tips: false,
    remote: false, hours: '', startDate: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!f.jobTitle.trim() || !f.company.trim() || !f.location.trim()) {
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
        type: f.type as never,
        location: f.location.trim(),
        ...(f.address.trim() && { address: f.address.trim() }),
        ...(f.sector && { sector: f.sector }),
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
      })
      router.push(`/listings/${listing.id}`)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (/UNAUTHORIZED|FORBIDDEN|jwt|token/i.test(msg)) router.push('/auth?next=/jobs/new')
      else setError('Could not post the job. Please check the fields and try again.')
    } finally { setSaving(false) }
  }

  return (
    <main style={{ background: '#f7f4ee', minHeight: '100dvh', paddingBottom: 40 }}>
      <header style={{ background: 'var(--sand)', padding: '12px 14px', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1.5px solid var(--sand2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/jobs" style={{ textDecoration: 'none', fontSize: 22, color: 'var(--orange)', fontWeight: 700 }}>‹</Link>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>💼 Post a Job</span>
      </header>

      <form onSubmit={submit} style={{ maxWidth: 640, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Section title="The role">
          <Field label="Job title *"><input value={f.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Bar Staff" style={inp} /></Field>
          <Row>
            <Field label="Employer name *"><input value={f.company} onChange={e => set('company', e.target.value)} placeholder="e.g. The Irish Rover" style={inp} /></Field>
            <Field label="Category / sector">
              <select value={f.sector} onChange={e => set('sector', e.target.value)} style={sel}>
                <option value="">Select…</option>{SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
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

        <Section title="Location">
          <Field label="Location (town / area) *"><input value={f.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Playa del Inglés" style={inp} /></Field>
          <Field label="Full address (shown with a map on the listing)"><input value={f.address} onChange={e => set('address', e.target.value)} placeholder="Street, number, postcode, town" style={inp} /></Field>
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

        {error && <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#c62828', fontFamily: 'var(--font-ui)' }}>{error}</div>}

        <button type="submit" disabled={saving} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 20px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Posting…' : 'Post Job →'}
        </button>
      </form>
    </main>
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
