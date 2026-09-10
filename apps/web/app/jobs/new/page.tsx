'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import Footer from '@/components/marketplace/Footer'
import type { JobQuestion, JobQuestionType } from '@/lib/jobQuestions'
import { QUESTION_TYPE_LABEL } from '@/lib/jobQuestions'
import { GC_TOWNS } from '@/lib/gcTowns'
import { JOB_SECTORS, JOB_LANGUAGES } from '@/lib/jobCategories'
import { Section, Row, Field, Input, Textarea, Select, Pill, Check, FormError, StepTabs, SubmitButton } from '@/components/marketplace/FormKit'
import type { IconName } from '@/components/marketplace/Icon'
import PromoField from '@/components/marketplace/PromoField'
import { JOBS_PRICING, PRICES } from '@grabitt/design-tokens'

const eur = (c: number) => `€${(c / 100).toFixed(2)}`
const FEATURED_PER_WEEK_CENTS = Math.round(PRICES.featuredPerWeek * 100)

// Experience-required buckets — same vocabulary as the candidate profile; the
// value is the lower-bound months stored on the advert for auto-matching.
// Minimum experience the employer requires (lower-bound months stored on the
// advert). Phrased as a minimum ("+"), with an explicit no-experience option.
const EXP_REQUIRED: [string, number][] = [['No experience needed', 0], ['3+ months', 3], ['6+ months', 6], ['1+ year', 12], ['2+ years', 24]]

const MapPicker = dynamic(() => import('@/components/marketplace/MapPicker'), { ssr: false })

const TYPES: [string, string][] = [
  ['Full Time', 'full_time'], ['Part Time', 'part_time'], ['Contract', 'contract'], ['Temp', 'temporary'], ['Volunteer', 'volunteer'],
]

// Job requirements the employer can attach to the advert — shown to candidates
// so expectations are clear up front.
const REQUIREMENTS: string[] = [
  'Right to work in Spain/EU', 'Valid work visa / permit', 'NIE & social security number',
  'Driving licence', 'Own vehicle / transport', 'Minimum age 18+',
  'Fluent Spanish', 'Fluent English', 'Other language (see description)',
  'Criminal record check', 'Own tools / equipment', 'Food hygiene certificate',
  'Relevant qualification / certificate', 'References required',
  'Available weekends', 'Available evenings / nights', 'Able to lift / physically fit',
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
  const [requirements, setRequirements] = useState<string[]>([])
  // Candidate Matching is a paid add-on offered on the final step.
  const [matchingOptIn, setMatchingOptIn] = useState(false)
  const [featuredWeeks, setFeaturedWeeks] = useState(0)
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountCents: number } | null>(null)
  const sectorJobs = JOB_SECTORS.find(s => s.name === f.sector)?.jobs ?? []
  const toggleRole = (r: string) => setRoles(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r])
  const toggleLang = (l: string) => setLanguages(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])
  const toggleReq = (r: string) => setRequirements(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState<JobQuestion[]>([])
  // Only business accounts may post jobs.
  const [gate, setGate] = useState<'checking' | 'ok' | 'needbusiness'>('checking')

  // Auto-save draft — never lose a half-written advert. Saved to the browser as
  // you type; offered back on return; cleared once the job is posted.
  const JOB_DRAFT_KEY = 'grabitt_job_draft'
  const [draftFound, setDraftFound] = useState<any | null>(null)
  const draftBody = JSON.stringify({ f, roles, expMonths, languages, requirements })
  useEffect(() => {
    if (f.jobTitle.trim() || f.company.trim() || f.description.trim()) {
      try { localStorage.setItem(JOB_DRAFT_KEY, draftBody) } catch {}
    }
  }, [draftBody, f.jobTitle, f.company, f.description])
  useEffect(() => {
    try { const raw = localStorage.getItem(JOB_DRAFT_KEY); if (raw) { const d = JSON.parse(raw); if (d?.f && (d.f.jobTitle || d.f.company)) setDraftFound(d) } } catch {}
  }, [])
  const restoreDraft = () => {
    const d = draftFound; if (!d) return
    if (d.f) setF(d.f)
    if (Array.isArray(d.roles)) setRoles(d.roles)
    if (typeof d.expMonths === 'number' || d.expMonths === null) setExpMonths(d.expMonths)
    if (Array.isArray(d.languages)) setLanguages(d.languages)
    if (Array.isArray(d.requirements)) setRequirements(d.requirements)
    setDraftFound(null)
  }
  const discardDraft = () => { try { localStorage.removeItem(JOB_DRAFT_KEY) } catch {}; setDraftFound(null) }

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

  // Tabs — each part of the advert is a tab you can move between freely, or step
  // through with Next. The final tab (Upgrades) carries the Post a Job button.
  const STEP_TITLES = ['The role', 'Screening', 'Job Requirements', 'Location', 'Salary', 'Details', 'Upgrades']
  const STEP_ICONS: IconName[] = ['briefcase', 'clipboard', 'user', 'mapPin', 'coins', 'file', 'sparkle']
  const [step, setStep] = useState(0)
  const isFinal = step === STEP_TITLES.length - 1
  const goTab = (i: number) => { setError(''); setStep(Math.max(0, Math.min(STEP_TITLES.length - 1, i))); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const next = () => goTab(step + 1)

  function onFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Enter / the footer button advances through the tabs; only the final tab
    // actually posts the job.
    if (!isFinal) { next(); return }
    postJob()
  }

  async function postJob() {
    setError('')
    // Validate required fields and jump to the tab that needs attention.
    if (!f.jobTitle.trim() || !f.company.trim() || !f.establishmentType.trim()) {
      setError('Job title, employer and establishment type are required.'); goTab(0); return
    }
    if (!f.location.trim()) { setError('Please choose the job location.'); goTab(3); return }
    setSaving(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/jobs/new'); return }

      // If no exact pin/address was given, drop the map pin in the centre of the
      // selected town so the listing map still shows the right area.
      let pin = coords
      if (!pin && !f.address.trim() && f.location.trim()) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${f.location}, Gran Canaria, Canary Islands, Spain`)}`, { headers: { 'Accept': 'application/json' } })
          const j = await r.json()
          if (Array.isArray(j) && j[0]?.lat && j[0]?.lon) pin = { lat: Number(j[0].lat), lng: Number(j[0].lon) }
        } catch { /* non-fatal — listing still lists the town */ }
      }

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
        ...(requirements.length && { requirements }),
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
        ...(pin ? { lat: pin.lat, lng: pin.lng } : {}),
        ...(matchingOptIn ? { candidateMatching: true } : {}),
        ...(featuredWeeks > 0 ? { featuredWeeks } : {}),
        ...(appliedPromo?.code ? { discountCode: appliedPromo.code } : {}),
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
      try { localStorage.removeItem(JOB_DRAFT_KEY) } catch {}
      // Beyond the free allowance a job is €29 — go pay, then the webhook
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
    <main className="app-shell" style={{ background: '#E4E7EE', minHeight: '100dvh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="Post a Job" />
      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/jobs" style={{ textDecoration: 'none', fontSize: 22, color: 'var(--orange)', fontWeight: 700 }}>‹</Link>
      </header>

      {gate === 'checking' && <div style={{ textAlign: 'center', padding: 60, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Checking your account…</div>}
      {gate === 'needbusiness' && <BusinessGate />}

      {gate === 'ok' && draftFound && (
        <div style={{ maxWidth: 640, margin: '10px auto 0', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#fff6e6', border: '1px solid #f0e0bd', borderRadius: 12, padding: '11px 14px' }}>
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-ui)', fontSize: 13, color: '#8a6d3b', fontWeight: 700 }}>📝 You have an unfinished job advert{draftFound.f?.jobTitle ? ` — “${draftFound.f.jobTitle}”` : ''}.</span>
            <button type="button" onClick={restoreDraft} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>Resume</button>
            <button type="button" onClick={discardDraft} style={{ background: '#fff', color: '#8a6d3b', border: '1px solid #e0d8d0', borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Discard</button>
          </div>
        </div>
      )}

      {gate === 'ok' && (
      <form onSubmit={onFormSubmit} className="gform">
        <StepTabs steps={STEP_TITLES} icons={STEP_ICONS} current={step} onSelect={goTab} />
        {step === 0 && <Section title="The role">
          <Field label="Job title" required><Input value={f.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Bar Staff" /></Field>
          <Field label="Employer name" required help="🔒 Your name is not shown on the advert. Candidates see the establishment type below, and learn who you are only when you invite them to interview."><Input value={f.company} onChange={e => set('company', e.target.value)} placeholder="e.g. The Irish Rover" /></Field>
          <Row>
            <Field label="Establishment type" required><Input value={f.establishmentType} onChange={e => set('establishmentType', e.target.value)} placeholder="e.g. Beach bar, 4-star hotel" /></Field>
            <Field label="Category / sector">
              <Select value={f.sector} onChange={e => { set('sector', e.target.value); setRoles([]) }}>
                <option value="">Select…</option>{JOB_SECTORS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Role type">
              <Select value={f.type} onChange={e => set('type', e.target.value)}>{TYPES.map(([l, v]) => <option key={v} value={v}>{l}</option>)}</Select>
            </Field>
            <Field label="Working Hours"><Input value={f.hours} onChange={e => set('hours', e.target.value)} placeholder="e.g. Mon–Fri 9:00–17:00" /></Field>
          </Row>
          <Check label="Remote / work from home" checked={f.remote} onChange={v => set('remote', v)} />
        </Section>}

        {/* Screening — moved to the second tab. */}
        {step === 1 && <Section title="Screening questions" sub="Optional. Add your own questions for candidates to answer when they apply — e.g. “Do you have a driving licence?” or “How many years' experience do you have?”. Their answers appear alongside each application so you can shortlist faster.">
          {questions.map(q => (
            <div key={q.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input value={q.label} onChange={e => updateQ(q.id, { label: e.target.value })} placeholder="Question, e.g. Do you have a driving licence?" style={{ flex: 1 }} />
                <button type="button" onClick={() => removeQ(q.id)} style={{ background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '0 12px', color: 'var(--danger)', cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Select value={q.type} onChange={e => updateQ(q.id, { type: e.target.value as JobQuestionType })} style={{ width: 'auto' }}>
                  {(Object.keys(QUESTION_TYPE_LABEL) as JobQuestionType[]).map(t => <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>)}
                </Select>
                <Check label="Required" checked={q.required} onChange={v => updateQ(q.id, { required: v })} />
              </div>
              {q.type === 'choice' && (
                <Input value={(q.options ?? []).join(', ')} onChange={e => updateQ(q.id, { options: e.target.value.split(',').map(s => s.trim()) })} placeholder="Options, comma separated" />
              )}
            </div>
          ))}
          <button type="button" onClick={addQ} style={{ background: 'var(--cream)', border: '1.5px solid var(--orange)', color: 'var(--orange)', borderRadius: 'var(--radius-sm)', padding: '10px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>+ Add a question</button>
        </Section>}

        {/* Job Requirements — what the candidate must have. Selection boxes the
            employer ticks; also captures roles/experience/languages for matching. */}
        {step === 2 && <Section title="Job Requirements" sub="Tick everything a candidate needs for this role. These are shown on the advert so applicants know what's expected before they apply.">
          <Field label="Requirements">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {REQUIREMENTS.map(r => <Pill key={r} on={requirements.includes(r)} onClick={() => toggleReq(r)}>{r}</Pill>)}
            </div>
          </Field>
          {f.sector ? (
            <Field label="Role(s) this advert covers">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {sectorJobs.map(r => <Pill key={r} on={roles.includes(r)} onClick={() => toggleRole(r)}>{r}</Pill>)}
              </div>
            </Field>
          ) : (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--terra)' }}>Pick a category / sector on “The role” tab to choose the specific roles.</div>
          )}
          <Field label="Minimum experience required">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {EXP_REQUIRED.map(([lbl, m]) => (
                <Pill key={lbl} on={expMonths === m} onClick={() => setExpMonths(expMonths === m ? null : m)}>{lbl}</Pill>
              ))}
            </div>
          </Field>
          <Field label="Languages required">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {JOB_LANGUAGES.map(([, label]) => (
                <Pill key={label} on={languages.includes(label)} onClick={() => toggleLang(label)}>{label}</Pill>
              ))}
            </div>
          </Field>
        </Section>}

        {step === 3 && <Section title="Location" sub="Give the job's address — this is where the work is, not your profile address.">
          <Field label="Location (town / area)" required><Select value={f.location} onChange={e => set('location', e.target.value)}><option value="">Select a town…</option>{GC_TOWNS.map(t => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <Field label="Full address (shown with a map on the listing)"><Input value={f.address} onChange={e => set('address', e.target.value)} placeholder="Street, number, postcode, town" /></Field>
          <Field label="Pin the exact location on the map" help={coords ? `📍 Pinned at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Tap the map to drop a pin where the job is based.'}>
            <MapPicker value={coords} onChange={setCoords} />
          </Field>
        </Section>}

        {step === 4 && <Section title="Salary">
          <Row>
            <Field label="Salary from (€)"><Input value={f.salaryMin} onChange={e => set('salaryMin', e.target.value)} inputMode="numeric" placeholder="1200" /></Field>
            <Field label="Salary to (€)"><Input value={f.salaryMax} onChange={e => set('salaryMax', e.target.value)} inputMode="numeric" placeholder="1400" /></Field>
            <Field label="Per">
              <Select value={f.salaryPeriod} onChange={e => set('salaryPeriod', e.target.value)}>
                <option value="month">month</option><option value="year">year</option><option value="hour">hour</option>
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Payments / year">
              <Select value={f.payments} onChange={e => set('payments', e.target.value)}>
                <option value="">—</option><option value="12">12 payments</option><option value="14">14 payments</option>
              </Select>
            </Field>
            <Field label="Extras">
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingTop: 4 }}>
                <Check label="Overtime" checked={f.overtime} onChange={v => set('overtime', v)} />
                <Check label="Tips" checked={f.tips} onChange={v => set('tips', v)} />
              </div>
            </Field>
          </Row>
        </Section>}

        {step === 5 && <Section title="Details">
          <Field label="Expected start date"><Input type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} /></Field>
          <Field label="Description"><Textarea value={f.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Describe the role, responsibilities and requirements…" /></Field>
        </Section>}

        {/* Upgrades — the paid Candidate Matching add-on, charged before go-live. */}
        {step === 6 && <Section title="Upgrades" sub="Optional extras to help you hire faster.">
          <div style={{ border: `2px solid ${matchingOptIn ? 'var(--orange)' : 'var(--line)'}`, background: matchingOptIn ? '#FFF3EE' : 'var(--bg)', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>🎯 Candidate Matching</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>{eur(JOBS_PRICING.candidateMatchingCents)}</div>
            </div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, color: '#3a3a3a', margin: '8px 0 12px' }}>
              Don't wait for applications to arrive. Candidate Matching searches Grabitt's registered jobseekers against this advert's requirements and shows you the people who fit — so you can reach out first. A one-off {eur(JOBS_PRICING.candidateMatchingCents)} for this advert (paid before it goes live, and it only applies to this job). Unlocking a candidate's full CV and contact details is then charged per candidate.
            </p>
            <Check label={`Add Candidate Matching — ${eur(JOBS_PRICING.candidateMatchingCents)}`} checked={matchingOptIn} onChange={v => { setMatchingOptIn(v); if (!v) setAppliedPromo(null) }} />
          </div>

          {/* Featured boost — same rule as items: €1.99/week in the homepage
              Featured strip. Paid before the advert goes live. */}
          <div style={{ border: `2px solid ${featuredWeeks > 0 ? 'var(--orange)' : 'var(--line)'}`, background: featuredWeeks > 0 ? '#FFF3EE' : 'var(--bg)', borderRadius: 14, padding: 16, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>⭐ Feature this advert</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>{eur(FEATURED_PER_WEEK_CENTS)} / week</div>
            </div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, color: '#3a3a3a', margin: '8px 0 12px' }}>
              Show your advert in the Featured carousel on the homepage for more views. Choose how many weeks:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {[0, 1, 2, 3, 4].map(w => (
                <button key={w} type="button" onClick={() => setFeaturedWeeks(w)} style={{ padding: '10px 4px', borderRadius: 12, border: `2px solid ${featuredWeeks === w ? 'var(--orange)' : '#e0d8d0'}`, background: featuredWeeks === w ? '#FFF3EE' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 800, color: featuredWeeks === w ? 'var(--orange)' : 'var(--dark)' }}>{w === 0 ? 'Off' : `${w}wk`}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 2 }}>{w === 0 ? '—' : eur(FEATURED_PER_WEEK_CENTS * w)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Discount code — held in Grabitt and applied to the total before it's
              sent to Stripe (a 100%-off code posts the advert free). */}
          <div style={{ marginTop: 14 }}>
            <Field label="Discount code (optional)">
              <PromoField
                kind="job"
                category="job"
                amountCents={(matchingOptIn ? JOBS_PRICING.candidateMatchingCents : JOBS_PRICING.perJobCents) + featuredWeeks * FEATURED_PER_WEEK_CENTS}
                onApplied={setAppliedPromo}
              />
            </Field>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8a6d3b', background: '#fff8e6', border: '1px solid #f0e0bd', borderRadius: 10, padding: '9px 12px', marginTop: 8 }}>
              Your job advert may be free within your monthly business allowance. Any fee — the €{(JOBS_PRICING.perJobCents / 100).toFixed(0)} advert (over allowance) and/or the {eur(JOBS_PRICING.candidateMatchingCents)} Candidate Matching add-on — is calculated at checkout, with your discount taken off before payment. If the total comes to €0 the advert posts straight away with no card needed.
            </div>
          </div>
        </Section>}

        {/* Footer — Next steps through the tabs; the final tab posts the job. */}
        <FormError>{error}</FormError>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {step > 0 && <button type="button" onClick={() => goTab(step - 1)} style={{ background: '#fff', color: '#555', border: '1.5px solid var(--line)', borderRadius: 12, padding: '13px 22px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>Back</button>}
          {isFinal
            ? <SubmitButton type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? 'Posting…' : 'Post a Job'}</SubmitButton>
            : <button type="button" onClick={next} style={{ flex: 1, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Next</button>}
        </div>
      </form>
      )}
      <Footer />
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
        <button onClick={() => openPanel('business')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Sign up as a business</button>
        <Link href="/jobs" style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#888', textDecoration: 'none' }}>Back to jobs</Link>
      </div>
    </div>
  )
}

