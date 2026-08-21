'use client'
import { useRef, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { uploadCv } from '@/lib/storage'
import { toast } from '@/lib/ui'
import { t } from '@/lib/i18n'
import { JOB_SECTORS, JOB_LANGUAGES, jobKey } from '@/lib/jobCategories'

// Recruitment profile. Jobseekers (mode="seeker") pick the roles they can do and
// how long, the languages they speak (basic/fluent), and an "About me" section;
// employers (mode="employer") pick the roles + languages they hire for. Saved to
// the account's jobProfile and bridged to the seeker profile recruiters search.

const DARK = '#1a1a1a'

// Experience buckets — click pills instead of a free-typed month count.
const EXP_BUCKETS: { key: string; label: string }[] = [
  { key: 'lt3m', label: '<3m' },
  { key: 'lt6m', label: '<6m' },
  { key: 'lt1y', label: '<1y' },
  { key: '1to2y', label: '1-2y' },
  { key: 'gt2y', label: '2+y' },
]
type Level = 'basic' | 'fluent'
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
const langLabel = (k: string) => (JOB_LANGUAGES.find(([lk]) => lk === k)?.[1]) ?? k

type About = { bio: string; location: string; nationality: string; drives?: boolean; hasCar?: boolean; canWorkGC?: boolean; allowUnlock: boolean; uploadedCvPath?: string; uploadedCvName?: string }

// Flatten everything into the seeker-profile shape the recruiter search and
// generated CV consume.
function deriveSeeker(langs: Record<string, Level>, exp: Record<string, string>, about: About) {
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
  const languages = Object.keys(langs).map(langLabel)
  const languageLevels = Object.entries(langs).map(([code, lvl]) => ({ language: langLabel(code), level: lvl === 'fluent' ? 'Fluent' : 'Basic' }))
  return {
    sectors: [...sectors], roles, experienceMonths, languages, languageLevels,
    bio: about.bio.trim(), location: about.location.trim(), nationality: about.nationality.trim(),
    drives: !!about.drives, hasCar: !!(about.drives && about.hasCar), canWorkGC: !!about.canWorkGC, allowUnlock: about.allowUnlock,
    uploadedCvPath: about.uploadedCvPath ?? null, uploadedCvName: about.uploadedCvName ?? null,
  }
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
// Sentence-case, black section headings.
const head: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: DARK, marginBottom: 8 }
const subLabel: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: DARK, marginBottom: 6 }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, color: DARK, outline: 'none', background: '#fff' }

function pill(on: boolean): React.CSSProperties {
  return { border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`, background: on ? '#FFF3EE' : '#fff', color: on ? 'var(--orange)' : DARK, borderRadius: 999, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }
}

// A yes / no toggle.
function YesNo({ value, onChange }: { value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => onChange(true)} style={pill(value === true)}>{t('Yes')}</button>
      <button onClick={() => onChange(false)} style={pill(value === false)}>{t('No')}</button>
    </div>
  )
}

export default function JobCategories({ me, onReload, mode }: { me: any; onReload: () => void; mode: 'seeker' | 'employer' }) {
  // jobProfile is stored as a JSON string.
  const jp: { languages?: unknown; experience?: Record<string, unknown>; about?: Partial<About> } = (() => {
    try { return typeof me?.jobProfile === 'string' ? JSON.parse(me.jobProfile) : (me?.jobProfile ?? {}) } catch { return {} }
  })()

  // Languages: new shape is { code: 'basic'|'fluent' }. Legacy was a string[] of
  // codes — treat those as fluent so nothing is lost.
  const [langs, setLangs] = useState<Record<string, Level>>(() => {
    const src = jp.languages
    const out: Record<string, Level> = {}
    if (Array.isArray(src)) src.forEach(c => { if (typeof c === 'string') out[c] = 'fluent' })
    else if (src && typeof src === 'object') for (const [k, v] of Object.entries(src as Record<string, unknown>)) out[k] = v === 'basic' ? 'basic' : 'fluent'
    return out
  })
  const [exp, setExp] = useState<Record<string, string>>(() => {
    const src = jp.experience && typeof jp.experience === 'object' ? jp.experience as Record<string, unknown> : {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === 'string' && EXP_BUCKETS.some(b => b.key === v)) out[k] = v
      else if (typeof v === 'number' && v > 0) out[k] = monthsToBucket(v)
    }
    return out
  })
  const a0 = jp.about ?? {}
  const [about, setAbout] = useState<About>({
    bio: typeof a0.bio === 'string' ? a0.bio : '',
    location: typeof a0.location === 'string' ? a0.location : '',
    nationality: typeof a0.nationality === 'string' ? a0.nationality : '',
    drives: typeof a0.drives === 'boolean' ? a0.drives : undefined,
    hasCar: typeof a0.hasCar === 'boolean' ? a0.hasCar : undefined,
    canWorkGC: typeof a0.canWorkGC === 'boolean' ? a0.canWorkGC : undefined,
    allowUnlock: typeof a0.allowUnlock === 'boolean' ? a0.allowUnlock : true,
    uploadedCvPath: typeof a0.uploadedCvPath === 'string' ? a0.uploadedCvPath : undefined,
    uploadedCvName: typeof a0.uploadedCvName === 'string' ? a0.uploadedCvName : undefined,
  })
  const [open, setOpen] = useState<number | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showCv, setShowCv] = useState(false)
  const [cvBusy, setCvBusy] = useState(false)
  const cvInputRef = useRef<HTMLInputElement>(null)

  const pickCv = async (file: File | null) => {
    if (!file) return
    setCvBusy(true)
    try {
      const { path } = await uploadCv(file, me?.id ?? 'me')
      patchAbout({ uploadedCvPath: path, uploadedCvName: file.name })
    } catch (e) { toast(e instanceof Error ? e.message : t('Could not upload your CV.')) }
    finally { setCvBusy(false); if (cvInputRef.current) cvInputRef.current.value = '' }
  }

  const touch = () => setState('idle')
  const setBucket = (key: string, bucket: string) => {
    touch()
    setExp(prev => { const n = { ...prev }; if (n[key] === bucket) delete n[key]; else n[key] = bucket; return n })
  }
  // Pick a language at a level; clicking the active level again removes it.
  const setLang = (code: string, level: Level) => {
    touch()
    setLangs(prev => { const n = { ...prev }; if (n[code] === level) delete n[code]; else n[code] = level; return n })
  }
  const patchAbout = (p: Partial<About>) => { touch(); setAbout(prev => ({ ...prev, ...p })) }

  const save = async () => {
    setState('saving')
    try {
      const seekerDerived = mode === 'seeker' ? deriveSeeker(langs, exp, about) : undefined
      await trpcAuthed().users.updateProfile.mutate({
        jobProfile: { languages: langs, experience: exp, ...(mode === 'seeker' ? { about } : {}) },
        ...(seekerDerived ? { seekerDerived } : {}),
      })
      onReload(); setState('saved'); setTimeout(() => setState('idle'), 2500)
    }
    catch { setState('idle'); toast(t('Could not save. Please try again.')) }
  }
  const filled = (si: number) => JOB_SECTORS[si].jobs.reduce((acc, _, ji) => acc + (exp[jobKey(si, ji)] ? 1 : 0), 0)

  return (
    <div style={card}>
      <div style={head}>{t('Recruitment')}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: DARK, lineHeight: 1.5, marginBottom: 14 }}>
        {mode === 'employer'
          ? t('Tag the roles you hire for and the experience you require, plus the languages needed.')
          : t('Pick the roles you can do and how long you have done each, and add the languages you speak.')}
      </div>

      {/* Show my CV — a profile generated from everything below */}
      {mode === 'seeker' && (
        <button onClick={() => setShowCv(true)} style={{
          width: '100%', marginBottom: 16, background: '#fff', border: '1.5px solid var(--orange)', color: 'var(--orange)',
          borderRadius: 12, padding: '11px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>📄 {t('Show my CV')}</button>
      )}

      {/* Languages — each has a Basic / Fluent choice */}
      <div style={{ marginBottom: 16 }}>
        <div style={head}>{t('Languages')}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {JOB_LANGUAGES.map(([code, label]) => {
            const cur = langs[code]
            return (
              <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: 90, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: DARK }}>{t(label)}</span>
                <button onClick={() => setLang(code, 'basic')} style={pill(cur === 'basic')}>{t('Basic')}</button>
                <button onClick={() => setLang(code, 'fluent')} style={pill(cur === 'fluent')}>{t('Fluent')}</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* About me — seekers only */}
      {mode === 'seeker' && (
        <div style={{ marginBottom: 16 }}>
          <div style={head}>{t('About me')}</div>

          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>{t('A bit about you')}</div>
            <textarea value={about.bio} onChange={e => patchAbout({ bio: e.target.value })} rows={4}
              placeholder={t('A bio about you to tell the employer why they should interview you.')}
              style={{ ...field, resize: 'vertical', minHeight: 80 }} />
          </div>

          {/* Upload your own CV — sent alongside the generated Grabitt CV on apply */}
          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>{t('Your CV (optional)')}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: DARK, lineHeight: 1.5, marginBottom: 6 }}>
              {t('Upload your own CV and it will be sent alongside your Grabitt CV whenever you apply for a job.')}
            </div>
            <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" onChange={e => pickCv(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
            {about.uploadedCvPath ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 11px' }}>
                <span style={{ fontSize: 15 }}>📎</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{about.uploadedCvName || t('CV uploaded')}</span>
                <button onClick={() => cvInputRef.current?.click()} disabled={cvBusy} style={{ background: 'none', border: 'none', color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{t('Replace')}</button>
                <button onClick={() => patchAbout({ uploadedCvPath: undefined, uploadedCvName: undefined })} style={{ background: 'none', border: 'none', color: '#c00', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{t('Remove')}</button>
              </div>
            ) : (
              <button onClick={() => cvInputRef.current?.click()} disabled={cvBusy} style={{ width: '100%', background: '#fff', color: 'var(--orange)', border: '1.5px dashed var(--orange)', borderRadius: 10, padding: '12px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, cursor: cvBusy ? 'wait' : 'pointer' }}>
                {cvBusy ? t('Uploading…') : `📎 ${t('Choose a file (PDF or Word)')}`}
              </button>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>{t('Location')}</div>
            <input value={about.location} onChange={e => patchAbout({ location: e.target.value })}
              placeholder={t('e.g. Las Palmas, Gran Canaria')} style={field} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>{t('Nationality')}</div>
            <input value={about.nationality} onChange={e => patchAbout({ nationality: e.target.value })}
              placeholder={t('e.g. Spanish, British')} style={field} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>{t('Do you drive?')}</div>
            <YesNo value={about.drives} onChange={v => patchAbout({ drives: v, ...(v ? {} : { hasCar: undefined }) })} />
          </div>

          {about.drives && (
            <div style={{ marginBottom: 12 }}>
              <div style={subLabel}>{t('Do you have a car?')}</div>
              <YesNo value={about.hasCar} onChange={v => patchAbout({ hasCar: v })} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>{t('Do you have permission to work in Gran Canaria?')}</div>
            <YesNo value={about.canWorkGC} onChange={v => patchAbout({ canWorkGC: v })} />
          </div>

          <div style={{ marginBottom: 4 }}>
            <div style={subLabel}>{t('Can employers unlock your contact details?')}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: DARK, lineHeight: 1.5, marginBottom: 6 }}>
              {t('If an employer views your profile, this lets them spend credits to reveal your name and contact details so they can get in touch.')}
            </div>
            <YesNo value={about.allowUnlock} onChange={v => patchAbout({ allowUnlock: v })} />
          </div>
        </div>
      )}

      {/* Roles — sector accordion */}
      <div style={head}>{mode === 'employer' ? t('Roles you hire for') : t('Roles you can do')}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {JOB_SECTORS.map((sec, si) => {
          const isOpen = open === si
          const n = filled(si)
          return (
            <div key={sec.name} style={{ border: '1px solid #ece3d7', borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => setOpen(isOpen ? null : si)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: isOpen ? 'var(--sand)' : '#fff', border: 'none', padding: '12px 14px', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: DARK }}>{si + 1}. {sec.name}</span>
                {n > 0 && <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 900, color: '#fff', background: 'var(--orange)', borderRadius: 999, padding: '2px 8px' }}>{n}</span>}
                <span style={{ color: DARK, fontSize: 12 }}>{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '4px 10px 12px', display: 'grid', gap: 8 }}>
                  {sec.jobs.map((job, ji) => {
                    const key = jobKey(si, ji)
                    return (
                      <div key={key} style={{ border: '1px solid #efe7db', borderRadius: 14, padding: '8px 12px', background: '#fff' }}>
                        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: DARK, marginBottom: 6 }}>{job}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {EXP_BUCKETS.map(b => (
                            <button key={b.key} onClick={() => setBucket(key, b.key)}
                              aria-pressed={exp[key] === b.key} aria-label={`${job} — ${b.label}`}
                              style={{ ...pill(exp[key] === b.key), padding: '5px 12px', fontSize: 12 }}>{b.label}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: DARK, paddingTop: 2 }}>{mode === 'employer' ? t('Experience required for each role') : t('How long you have done each role')}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={save} disabled={state === 'saving'} style={{ width: '100%', marginTop: 14, background: state === 'saved' ? 'var(--sage)' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: state === 'saving' ? 'wait' : 'pointer' }}>
        {state === 'saving' ? t('Saving…') : state === 'saved' ? t('Saved ✓') : t('Save')}
      </button>

      {showCv && <CvPreview me={me} langs={langs} exp={exp} about={about} onClose={() => setShowCv(false)} />}
    </div>
  )
}

// A read-only CV/profile generated from everything above — the same structured
// data a subscribing business matches against.
function CvPreview({ me, langs, exp, about, onClose }: { me: any; langs: Record<string, Level>; exp: Record<string, string>; about: About; onClose: () => void }) {
  const bucketLabel = (k: string) => EXP_BUCKETS.find(b => b.key === k)?.label ?? k
  const name = me?.fullName || me?.displayName || t('Candidate')
  const bySector = JOB_SECTORS.map((sec, si) => ({
    name: sec.name,
    roles: sec.jobs.map((job, ji) => ({ job, bucket: exp[jobKey(si, ji)] })).filter(r => r.bucket),
  })).filter(s => s.roles.length > 0)
  const langEntries = Object.entries(langs)
  const facts: [string, string][] = []
  if (about.location.trim()) facts.push([t('Location'), about.location.trim()])
  if (about.nationality.trim()) facts.push([t('Nationality'), about.nationality.trim()])
  if (about.drives !== undefined) facts.push([t('Drives'), about.drives ? (about.hasCar ? t('Yes — has a car') : t('Yes')) : t('No')])
  if (about.canWorkGC !== undefined) facts.push([t('Permission to work in GC'), about.canWorkGC ? t('Yes') : t('No')])
  const empty = bySector.length === 0 && langEntries.length === 0 && !about.bio.trim() && facts.length === 0

  const sh: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: DARK, marginBottom: 8 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,25,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderBottom: '1px solid #efe7db', position: 'sticky', top: 0, background: '#fff', borderRadius: '18px 18px 0 0' }}>
          <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 17, fontWeight: 700, color: DARK }}>📄 {t('My CV')}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: DARK, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '16px 18px 22px' }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: DARK }}>{name}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: me?.openToWork ? '#16a34a' : DARK, marginTop: 2 }}>
            {me?.openToWork ? `● ${t('Open to work')}` : t('Not currently looking')}
          </div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: DARK, marginTop: 6, lineHeight: 1.5 }}>
            {t('Anonymous until an employer unlocks you — no name or contact is shown to recruiters until then.')}
          </div>

          {empty && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: DARK, marginTop: 18, textAlign: 'center', padding: '20px 0' }}>{t('Fill in your details below, then reopen to see your CV.')}</div>}

          {about.bio.trim() && (
            <div style={{ marginTop: 18 }}>
              <div style={sh}>{t('About me')}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, color: DARK, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{about.bio.trim()}</div>
            </div>
          )}

          {facts.length > 0 && (
            <div style={{ marginTop: 18 }}>
              {facts.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #f5f0e8' }}>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: DARK }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: DARK, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {langEntries.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={sh}>{t('Languages')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {langEntries.map(([code, lvl]) => <span key={code} style={{ background: '#FFF3EE', border: '1px solid #f3d3c2', color: 'var(--orange)', borderRadius: 999, padding: '4px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>{langLabel(code)} · {lvl === 'fluent' ? t('Fluent') : t('Basic')}</span>)}
              </div>
            </div>
          )}

          {bySector.map(sec => (
            <div key={sec.name} style={{ marginTop: 18 }}>
              <div style={sh}>{sec.name}</div>
              {sec.roles.map(r => (
                <div key={r.job} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f0e8' }}>
                  <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 800, color: DARK }}>{r.job}</span>
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
