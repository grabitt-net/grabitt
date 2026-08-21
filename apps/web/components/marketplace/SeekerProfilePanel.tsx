'use client'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/ui'
import { trpcAuthed } from '@/lib/authToken'
import { JOB_SECTORS, JOB_LANGUAGES, JOB_ATTRIBUTES, EXP_OPTIONS } from './FindStaffPanel'
import { skillsForSectors, LANGUAGE_LEVELS, formatLanguage, parseLanguages, type LanguageEntry } from '@/lib/jobSkills'

// "List yourself for work" — a job-seeker's available-for-work profile. Employers
// find these anonymously via Find Staff and spend credits to unlock contact.

const ORANGE = 'var(--orange)'
const GC_TOWNS = ['Las Palmas', 'Maspalomas', 'Playa del Ingl\u00e9s', 'Puerto Rico', 'Arucas', 'Telde',
  'Santa Luc\u00eda', 'Ingenio', 'Ag\u00fcimes', 'G\u00e1ldar', 'Mog\u00e1n', 'San Bartolom\u00e9 de Tirajana',
  'Vecindario', 'Tejeda', 'Puerto de Mog\u00e1n', 'Meloneras', 'Other']
// Shown alongside whatever the member already picked in Attributes.
const SKILL_SUGGESTIONS = ['Customer Service', 'Bar & Waiting', 'Cooking/Chef', 'Cleaning', 'Driving',
  'Sales', 'Admin/Office', 'Languages', 'Construction/Trades', 'Childcare', 'IT/Tech', 'Security']
const LABEL: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', marginBottom: 6 }
const SELECT: React.CSSProperties = { width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff', outline: 'none', boxSizing: 'border-box' }

export default function SeekerProfilePanel({ onClose }: { onClose: () => void }) {
  const [headline, setHeadline] = useState('')
  // Sectors stay selected as you pick more — someone can offer themselves for
  // bar work and cleaning, and the roles they picked earlier must survive
  // choosing a second sector.
  const [sectors, setSectors] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [exp, setExp] = useState('0')
  // Each language carries a level — "some Spanish" and "native Spanish" are not
  // the same hire, and employers filter on it.
  const [langs, setLangs] = useState<LanguageEntry[]>([])
  const [hours, setHours] = useState<string[]>([])
  const [availability, setAvailability] = useState('')
  const [rightToWork, setRightToWork] = useState('')
  const [location, setLocation] = useState('')
  const [town, setTown] = useState('')
  const [areaDetail, setAreaDetail] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [profileSkills, setProfileSkills] = useState<string[]>([])
  const [hasWork, setHasWork] = useState(true)
  const [hasEducation, setHasEducation] = useState(true)
  const [active, setActive] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Loaded one after the other rather than in a Promise.all — combining two
    // tRPC query types blows TypeScript's instantiation depth.
    const c = trpcAuthed()
    const load = async () => {
      const p: any = await c.seekers.myProfile.query().catch(() => null)
      // Skills the member already picked in Attributes — no reason to ask twice.
      const u: any = await c.users.me.query().catch(() => null)
      return { p, u }
    }
    load().then(({ p, u }) => {
      if (p) {
        setHeadline(p.headline || '')
        setSectors(p.sectors?.length ? p.sectors : (p.sector ? [p.sector] : []))
        setRoles(p.roles || [])
        setExp(String(p.experienceMonths || 0))
        setLangs(p.languageLevels?.length ? p.languageLevels : parseLanguages(p.languages || []))
        setHours(p.hours || [])
        setAvailability(p.availability || ''); setRightToWork(p.rightToWork || '')
        setLocation(p.location || ''); setTown(p.town || ''); setAreaDetail(p.areaDetail || '')
        setSkills(p.skills || [])
        setHasWork(!!(p.workExperience?.length))
        setHasEducation(!!(p.education?.length))
        setActive(p.active)
      }
      const mine: string[] = u?.skills ?? []
      setProfileSkills(mine)
      // First time here: start from what they already told us.
      if (!p?.skills?.length && mine.length) setSkills(mine)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const save = async () => {
    if (!sectors.length) { toast('Pick at least one sector so employers can find you.'); return }
    // A work profile with no history behind it is not worth an employer's time,
    // and the generated CV would come out empty. Checked here rather than after
    // an employer has already seen a thin profile.
    if (!hasWork) {
      toast('Please add at least one job to your work experience before listing yourself — employers see this as your CV.')
      window.open('/account?section=employment', '_blank')
      return
    }
    if (!hasEducation) {
      toast('Please add your education before listing yourself for work.')
      window.open('/account?section=employment', '_blank')
      return
    }
    setSaving(true)
    try {
      await trpcAuthed().seekers.upsertProfile.mutate({
        headline: headline.trim() || undefined,
        sectors, roles, skills,
        experienceMonths: Number(exp) || 0,
        // Stored flat for search and the CV, structured for the form.
        languages: langs.map(formatLanguage),
        languageLevels: langs,
        hours,
        availability: availability || undefined,
        rightToWork: rightToWork || undefined,
        location: location || undefined,
        town: town || undefined,
        areaDetail: areaDetail.trim() || undefined,
        active,
      })
      toast('Your work profile is live. Employers can now find you. 🙌')
      onClose()
    } catch { toast('Could not save your profile. Please sign in and try again.') }
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
                <div style={LABEL}>Sectors (pick any)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.keys(JOB_SECTORS).map(sec => (
                    <span key={sec} onClick={() => toggle(sectors, setSectors, sec)} style={{ background: sectors.includes(sec) ? ORANGE : '#f0f0f0', color: sectors.includes(sec) ? '#fff' : '#555', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{sectors.includes(sec) ? '\u2713 ' : ''}{sec}</span>
                  ))}
                </div>
              </div>

              {sectors.map(sec => (
                <div key={sec} style={{ marginBottom: 12 }}>
                  <div style={LABEL}>{sec} roles</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(JOB_SECTORS[sec] ?? []).map(r => (
                      <span key={r} onClick={() => toggle(roles, setRoles, r)} style={{ background: roles.includes(r) ? ORANGE : '#f0f0f0', color: roles.includes(r) ? '#fff' : '#555', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{roles.includes(r) ? '\u2713 ' : ''}{r}</span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Key skills for the sectors chosen — what an employer actually
                  filters on, and what suitability scores against. */}
              {sectors.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL}>Key skills for your sectors</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {skillsForSectors(sectors).map(sk => (
                      <span key={sk} onClick={() => toggle(skills, setSkills, sk)} style={{ background: skills.includes(sk) ? ORANGE : '#fff', color: skills.includes(sk) ? '#fff' : '#555', border: '1px solid #e5dccd', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{skills.includes(sk) ? '\u2713 ' : ''}{sk}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills — prefilled from the member's Attributes so they aren't
                  asked for the same thing twice. */}
              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Other skills</div>
                {profileSkills.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888', marginBottom: 6 }}>
                    Pulled in from your profile — tap to add or remove.
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from(new Set([...profileSkills, ...skills, ...SKILL_SUGGESTIONS])).map(sk => (
                    <span key={sk} onClick={() => toggle(skills, setSkills, sk)} style={{ background: skills.includes(sk) ? ORANGE : '#f8f9fa', color: skills.includes(sk) ? '#fff' : '#1a1a1a', border: '1px solid #eee', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>{skills.includes(sk) ? '\u2713 ' : ''}{sk}</span>
                  ))}
                </div>
                {profileSkills.length === 0 && (
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888', marginTop: 6 }}>
                    Tip: set your skills once in Account → Attributes and they\u2019ll appear here automatically.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Experience</div>
                <select value={exp} onChange={e => setExp(e.target.value)} style={SELECT}>
                  {EXP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Languages</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {JOB_LANGUAGES.map(l => {
                    const on = langs.some(x => x.language === l)
                    return (
                      <span key={l}
                        onClick={() => setLangs(prev => on ? prev.filter(x => x.language !== l) : [...prev, { language: l, level: 'Conversational' }])}
                        style={{ background: on ? ORANGE : '#f8f9fa', color: on ? '#fff' : '#1a1a1a', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>
                        {on ? '\u2713 ' : ''}{l}
                      </span>
                    )
                  })}
                </div>
                {langs.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {langs.map(entry => (
                      <div key={entry.language} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{entry.language}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {LANGUAGE_LEVELS.map(lvl => (
                            <span key={lvl}
                              onClick={() => setLangs(prev => prev.map(x => x.language === entry.language ? { ...x, level: lvl } : x))}
                              style={{ background: entry.level === lvl ? ORANGE : '#f8f9fa', color: entry.level === lvl ? '#fff' : '#666', border: '1px solid #eee', borderRadius: 50, padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 700, cursor: 'pointer' }}>
                              {lvl}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div style={LABEL}>Area</div>
                  <select value={location} onChange={e => setLocation(e.target.value)} style={SELECT}>
                    <option value="">—</option>
                    {JOB_ATTRIBUTES.location.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Employers hire locally, so a broad area on its own isn't much
                  use — narrow it to a town and, if it helps, a district. */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={LABEL}>Town</div>
                  <select value={town} onChange={e => setTown(e.target.value)} style={SELECT}>
                    <option value="">—</option>
                    {GC_TOWNS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={LABEL}>Specific area (optional)</div>
                  <input value={areaDetail} onChange={e => setAreaDetail(e.target.value)} placeholder="e.g. Vegueta, Bahía Feliz" style={SELECT} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={LABEL}>Right to Work</div>
                <select value={rightToWork} onChange={e => setRightToWork(e.target.value)} style={SELECT}>
                  <option value="">—</option>
                  {JOB_ATTRIBUTES.rightToWork.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Told up front, not sprung on them at save. */}
              {(!hasWork || !hasEducation) && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FFD4A0', borderRadius: 10, padding: '11px 12px', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#9a5b1a', marginBottom: 4 }}>Finish your CV first</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#9a5b1a', lineHeight: 1.5, marginBottom: 8 }}>
                    Employers see your work history and education as your CV, so both are needed before you can be listed.
                    Still to add: {[!hasWork && 'work experience', !hasEducation && 'education'].filter(Boolean).join(' and ')}.
                  </div>
                  <a href="/account?section=employment" target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: ORANGE, color: '#fff', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, textDecoration: 'none' }}>📄 My work profile</a>
                </div>
              )}

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
