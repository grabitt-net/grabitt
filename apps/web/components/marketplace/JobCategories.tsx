'use client'
import { useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { toast } from '@/lib/ui'
import { t } from '@/lib/i18n'
import { JOB_SECTORS, JOB_LANGUAGES, jobKey } from '@/lib/jobCategories'

// Recruitment job taxonomy picker. Jobseekers (mode="seeker") enter how many
// months in total they've done each role; employers (mode="employer") set the
// months of experience they require. A languages filter applies across all
// sectors. Saved to the account's jobProfile.

// Experience buckets — click pills instead of a free-typed month count.
const EXP_BUCKETS: { key: string; label: string }[] = [
  { key: 'lt3m', label: '<3m' },
  { key: 'lt6m', label: '<6m' },
  { key: 'lt1y', label: '<1y' },
  { key: '1to2y', label: '1-2y' },
  { key: 'gt2y', label: '2+y' },
]
// Map any legacy stored month count onto the nearest bucket.
function monthsToBucket(m: number): string {
  if (m < 3) return 'lt3m'
  if (m < 6) return 'lt6m'
  if (m < 12) return 'lt1y'
  if (m < 24) return '1to2y'
  return 'gt2y'
}
// Lower-bound months each bucket represents — used so the seeker profile's
// single "experienceMonths" (max across ticked roles) drives recruiter filters.
const BUCKET_MONTHS: Record<string, number> = { lt3m: 0, lt6m: 3, lt1y: 6, '1to2y': 12, gt2y: 24 }

// Flatten the ticked roles/experience/languages into the seeker-profile shape
// the recruiter search and generated CV consume.
function deriveSeeker(languages: string[], exp: Record<string, string>) {
  const sectors = new Set<string>()
  const roles: string[] = []
  let experienceMonths = 0
  JOB_SECTORS.forEach((sec, si) => {
    sec.jobs.forEach((job, ji) => {
      const bucket = exp[jobKey(si, ji)]
      if (!bucket) return
      sectors.add(sec.name)
      roles.push(job)
      experienceMonths = Math.max(experienceMonths, BUCKET_MONTHS[bucket] ?? 0)
    })
  })
  const langLabels = languages.map(k => (JOB_LANGUAGES.find(([lk]) => lk === k)?.[1]) ?? k)
  return { sectors: [...sectors], roles, experienceMonths, languages: langLabels }
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }

export default function JobCategories({ me, onReload, mode }: { me: any; onReload: () => void; mode: 'seeker' | 'employer' }) {
  // jobProfile is stored as a JSON string. Experience is a bucket per job.
  const jp: { languages?: string[]; experience?: Record<string, unknown> } = (() => {
    try { return typeof me?.jobProfile === 'string' ? JSON.parse(me.jobProfile) : (me?.jobProfile ?? {}) } catch { return {} }
  })()
  const [languages, setLanguages] = useState<string[]>(Array.isArray(jp.languages) ? jp.languages : [])
  const [exp, setExp] = useState<Record<string, string>>(() => {
    const src = jp.experience && typeof jp.experience === 'object' ? jp.experience as Record<string, unknown> : {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(src)) {
      // New format = a bucket key; legacy format = a number of months → map to a bucket.
      if (typeof v === 'string' && EXP_BUCKETS.some(b => b.key === v)) out[k] = v
      else if (typeof v === 'number' && v > 0) out[k] = monthsToBucket(v)
    }
    return out
  })
  const [open, setOpen] = useState<number | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showCv, setShowCv] = useState(false)

  const setBucket = (key: string, bucket: string) => {
    setState('idle')
    setExp(prev => {
      const n = { ...prev }
      if (n[key] === bucket) delete n[key] // click the active pill again to clear
      else n[key] = bucket
      return n
    })
  }
  const toggleLang = (l: string) => { setState('idle'); setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]) }
  const save = async () => {
    setState('saving')
    try {
      // Jobseekers: also send a flattened form so the seeker profile that
      // recruiters search and the generated CV render stays in step. (Employers
      // pick roles to hire for — they must not be indexed as candidates.)
      const seekerDerived = mode === 'seeker' ? deriveSeeker(languages, exp) : undefined
      await trpcAuthed().users.updateProfile.mutate({ jobProfile: { languages, experience: exp }, ...(seekerDerived ? { seekerDerived } : {}) })
      onReload(); setState('saved'); setTimeout(() => setState('idle'), 2500)
    }
    catch { setState('idle'); toast(t('Could not save. Please try again.')) }
  }
  const filled = (si: number) => JOB_SECTORS[si].jobs.reduce((a, _, ji) => a + (exp[jobKey(si, ji)] ? 1 : 0), 0)

  return (
    <div style={card}>
      <div style={cardHead}>{t('Recruitment — Job Categories')}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#666', lineHeight: 1.5, marginBottom: 14 }}>
        {mode === 'employer'
          ? t('Tag the roles you hire for and the experience you require, plus the languages needed.')
          : t('Pick the roles you can do and how long you have done each, and add the languages you speak.')}
      </div>

      {/* Show my CV — a profile generated from the ticked roles/experience/languages */}
      {mode === 'seeker' && (
        <button onClick={() => setShowCv(true)} style={{
          width: '100%', marginBottom: 16, background: '#fff', border: '1.5px solid var(--orange)', color: 'var(--orange)',
          borderRadius: 12, padding: '11px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>📄 {t('Show my CV')}</button>
      )}

      {/* Languages filter — applies across all sectors */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t('Languages')} · {mode === 'employer' ? t('required') : t('spoken')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {JOB_LANGUAGES.map(([k, l]) => {
            const on = languages.includes(k)
            return (
              <button key={k} onClick={() => toggleLang(k)} style={{
                border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? '#FFF3EE' : '#fff', color: on ? 'var(--orange)' : '#7a6a55',
                borderRadius: 999, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
              }}>{t(l)}</button>
            )
          })}
        </div>
      </div>

      {/* Sectors — accordion */}
      <div style={{ display: 'grid', gap: 8 }}>
        {JOB_SECTORS.map((sec, si) => {
          const isOpen = open === si
          const n = filled(si)
          return (
            <div key={sec.name} style={{ border: '1px solid #ece3d7', borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => setOpen(isOpen ? null : si)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: isOpen ? 'var(--sand)' : '#fff', border: 'none', padding: '12px 14px', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{si + 1}. {sec.name}</span>
                {n > 0 && <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 900, color: '#fff', background: 'var(--orange)', borderRadius: 999, padding: '2px 8px' }}>{n}</span>}
                <span style={{ color: '#9a8f7f', fontSize: 12 }}>{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '4px 10px 12px', display: 'grid', gap: 8 }}>
                  {sec.jobs.map((job, ji) => {
                    const key = jobKey(si, ji)
                    return (
                      <div key={key} style={{ border: '1px solid #efe7db', borderRadius: 14, padding: '8px 12px', background: '#fff' }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', marginBottom: 6 }}>{job}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {EXP_BUCKETS.map(b => {
                            const on = exp[key] === b.key
                            return (
                              <button key={b.key} onClick={() => setBucket(key, b.key)}
                                aria-pressed={on} aria-label={`${job} — ${b.label}`}
                                style={{ border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? '#FFF3EE' : '#fff', color: on ? 'var(--orange)' : '#7a6a55',
                                  borderRadius: 999, padding: '5px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>{b.label}</button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#aaa', paddingTop: 2 }}>{mode === 'employer' ? t('Experience required for each role') : t('How long you have done each role')}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={save} disabled={state === 'saving'} style={{ width: '100%', marginTop: 14, background: state === 'saved' ? 'var(--sage)' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: state === 'saving' ? 'wait' : 'pointer' }}>
        {state === 'saving' ? t('Saving…') : state === 'saved' ? t('Saved ✓') : t('Save')}
      </button>

      {showCv && <CvPreview me={me} languages={languages} exp={exp} onClose={() => setShowCv(false)} />}
    </div>
  )
}

// A read-only CV/profile generated from the ticked roles, experience and
// languages — the same structured data a subscribing business matches against.
function CvPreview({ me, languages, exp, onClose }: { me: any; languages: string[]; exp: Record<string, string>; onClose: () => void }) {
  const bucketLabel = (k: string) => EXP_BUCKETS.find(b => b.key === k)?.label ?? k
  const langLabel = (k: string) => (JOB_LANGUAGES.find(([lk]) => lk === k)?.[1]) ?? k
  const name = me?.fullName || me?.displayName || t('Candidate')
  // Group the ticked roles under their sector.
  const bySector = JOB_SECTORS.map((sec, si) => ({
    name: sec.name,
    roles: sec.jobs.map((job, ji) => ({ job, bucket: exp[jobKey(si, ji)] })).filter(r => r.bucket),
  })).filter(s => s.roles.length > 0)
  const empty = bySector.length === 0 && languages.length === 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,25,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderBottom: '1px solid #efe7db', position: 'sticky', top: 0, background: '#fff', borderRadius: '18px 18px 0 0' }}>
          <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 17, fontWeight: 700, color: 'var(--dark)' }}>📄 {t('My CV')}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '16px 18px 22px' }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>{name}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: me?.openToWork ? '#16a34a' : '#999', marginTop: 2 }}>
            {me?.openToWork ? `● ${t('Open to work')}` : t('Not currently looking')}
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#aaa', marginTop: 6, lineHeight: 1.5 }}>
            {t('Anonymous until an employer unlocks you — no name or contact is shown to recruiters until then.')}
          </div>

          {empty && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#888', marginTop: 18, textAlign: 'center', padding: '20px 0' }}>{t('Tick some roles and languages below, then reopen to see your CV.')}</div>}

          {languages.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t('Languages')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {languages.map(l => <span key={l} style={{ background: '#FFF3EE', border: '1px solid #f3d3c2', color: 'var(--orange)', borderRadius: 999, padding: '4px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>{langLabel(l)}</span>)}
              </div>
            </div>
          )}

          {bySector.map(sec => (
            <div key={sec.name} style={{ marginTop: 18 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{sec.name}</div>
              {sec.roles.map(r => (
                <div key={r.job} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f0e8' }}>
                  <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 800, color: 'var(--dark)' }}>{r.job}</span>
                  <span style={{ background: '#f4f6fb', color: '#3b6fd4', borderRadius: 999, padding: '3px 11px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 900, whiteSpace: 'nowrap' }}>{bucketLabel(r.bucket!)} {t('exp')}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
