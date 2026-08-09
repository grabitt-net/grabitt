'use client'
import { useEffect, useRef, useState } from 'react'
import { toast } from '@/lib/ui'
import { trpcAuthed } from '@/lib/authToken'
import { uploadCv } from '@/lib/storage'
import { LANGUAGE_LEVELS, formatLanguage, parseLanguages, type LanguageEntry } from '@/lib/jobSkills'
import { JOB_LANGUAGES, JOB_ATTRIBUTES, EXP_OPTIONS } from './FindStaffPanel'
import type { JobQuestion } from '@/lib/jobQuestions'

// Robust candidate application: standard recruitment data (prefilled from the
// applicant's profile / prior application), the employer's screening questions,
// and the applicant's Grabitt CV — generated from their profile and snapshotted
// server-side on apply (no file upload). Collected as owned data on consent.

const ORANGE = '#FF4500'
type AnswerVal = string | boolean | number

const LABEL: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, color: '#555', textTransform: 'uppercase', marginBottom: 5 }
const FIELD: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 11px', fontFamily: 'var(--font-comfortaa)', fontSize: 13, outline: 'none', background: '#fff' }

export default function ApplyModal({ listingId, userId, onClose, onApplied }: { listingId: string; userId: string; onClose: () => void; onApplied: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [questions, setQuestions] = useState<JobQuestion[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [hasCv, setHasCv] = useState<boolean | null>(null) // null = still loading

  const [f, setF] = useState({
    fullName: '', email: '', phone: '', location: '', rightToWork: '', currentRole: '',
    expectedSalary: '', availability: '', linkedinUrl: '', coverNote: '',
    experienceMonths: '0',
  })
  const [langs, setLangs] = useState<LanguageEntry[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerVal>>({})
  const [consent, setConsent] = useState(false)

  // Own CV: the applicant may attach their own file alongside the generated
  // Grabitt CV. Asked plainly rather than assumed either way.
  const [cvChoice, setCvChoice] = useState<'grabitt' | 'own' | null>(null)
  const [cvPath, setCvPath] = useState<string | null>(null)
  const [cvName, setCvName] = useState('')
  const [cvBusy, setCvBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // A short personal summary, prefilled from their CV so most people can leave
  // it alone.
  const [summary, setSummary] = useState('')
  const [strengths, setStrengths] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => {
    trpcAuthed().jobs.applyInfo.query({ listingId }).then((info: any) => {
      setJobTitle(info.jobTitle)
      setQuestions(info.questions as JobQuestion[])
      const p = info.prefill
      setF(s => ({
        ...s,
        fullName: p.fullName || '', email: p.email || '', phone: p.phone || '', location: p.location || '',
        rightToWork: p.rightToWork || '', currentRole: p.currentRole || '', availability: p.availability || '',
        linkedinUrl: p.linkedinUrl || '', coverNote: p.coverNote || '',
        expectedSalary: p.expectedSalary != null ? String(p.expectedSalary) : '',
        experienceMonths: String(p.experienceMonths ?? 0),
      }))
      setLangs(parseLanguages(p.languages || []))
      setAnswers((p.answers as Record<string, AnswerVal>) || {})
      setLoaded(true)
    }).catch(() => setLoaded(true))
    // Everything already captured — summary, skills, strengths, languages and
    // any CV file previously uploaded — is pulled in rather than re-asked.
    trpcAuthed().seekers.myProfile.query().then((p: any) => {
      setHasCv(!!(p && (p.summary || (p.workExperience?.length) || (p.skills?.length) || (p.education?.length))))
      if (p?.summary) setSummary(p.summary)
      if (p?.keyStrengths?.length) setStrengths(p.keyStrengths)
      if (p?.skills?.length) setSkills(p.skills)
      if (p?.languageLevels?.length) setLangs(p.languageLevels)
    }).catch(() => setHasCv(false))
  }, [listingId])

  const set = (k: keyof typeof f, v: string) => setF(s => ({ ...s, [k]: v }))
  const toggleLang = (l: string) =>
    setLangs(p => p.some(x => x.language === l) ? p.filter(x => x.language !== l) : [...p, { language: l, level: 'Conversational' }])

  const pickCv = async (file: File | null) => {
    if (!file) return
    setCvBusy(true)
    try {
      const { path } = await uploadCv(file, userId)
      setCvPath(path)
      setCvName(file.name)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not upload that file.')
    } finally { setCvBusy(false) }
  }

  const submit = async () => {
    if (!f.fullName.trim()) { toast('Please enter your name.'); return }
    if (!consent) { toast('Please agree to share your details with the employer to apply.'); return }
    if (cvChoice === null) { toast('Please tell us whether you have your own CV to attach.'); return }
    if (cvChoice === 'own' && !cvPath) { toast('Please upload your CV, or choose to send your Grabitt CV instead.'); return }
    for (const q of questions) {
      const a = answers[q.id]
      if (q.required && (a === undefined || a === '' )) { toast(`Please answer: ${q.label}`); return }
    }
    setSubmitting(true)
    try {
      await trpcAuthed().jobs.applyToJob.mutate({
        listingId,
        coverNote: f.coverNote.trim() || undefined,
        fullName: f.fullName.trim(),
        email: f.email.trim() || undefined,
        phone: f.phone.trim() || undefined,
        location: f.location.trim() || undefined,
        rightToWork: f.rightToWork || undefined,
        languages: langs.map(formatLanguage),
        cvUrl: cvPath ?? undefined,
        experienceMonths: Number(f.experienceMonths) || 0,
        currentRole: f.currentRole.trim() || undefined,
        expectedSalary: f.expectedSalary ? Number(f.expectedSalary) : undefined,
        availability: f.availability || undefined,
        linkedinUrl: f.linkedinUrl.trim() || undefined,
        answers: Object.keys(answers).length ? answers : undefined,
        dataConsent: consent,
      })
      // Keep the profile in step with anything edited here, so the next
      // application starts from the improved version.
      if (summary.trim()) {
        await trpcAuthed().seekers.upsertProfile.mutate({
          summary: summary.trim(),
          languages: langs.map(formatLanguage),
          languageLevels: langs,
        }).catch(() => { /* the application is already in — don't fail on this */ })
      }
      onApplied()
    } catch (e: any) { toast(e?.message || 'Could not send your application.') }
    finally { setSubmitting(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>Apply {jobTitle ? `· ${jobTitle}` : ''}</div>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 15, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 18, flex: 1 }}>
          {!loaded ? <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-nunito)' }}>Loading…</div> : (
            <>
              <div style={{ marginBottom: 12 }}><div style={LABEL}>Full name *</div><input value={f.fullName} onChange={e => set('fullName', e.target.value)} style={FIELD} /></div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}><div style={LABEL}>Email</div><input value={f.email} onChange={e => set('email', e.target.value)} type="email" style={FIELD} /></div>
                <div style={{ flex: 1 }}><div style={LABEL}>Phone</div><input value={f.phone} onChange={e => set('phone', e.target.value)} style={FIELD} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}><div style={LABEL}>Current / recent role</div><input value={f.currentRole} onChange={e => set('currentRole', e.target.value)} style={FIELD} /></div>
                <div style={{ flex: 1 }}><div style={LABEL}>Location</div>
                  <select value={f.location} onChange={e => set('location', e.target.value)} style={FIELD}><option value="">—</option>{JOB_ATTRIBUTES.location.map(o => <option key={o}>{o}</option>)}</select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}><div style={LABEL}>Experience</div>
                  <select value={f.experienceMonths} onChange={e => set('experienceMonths', e.target.value)} style={FIELD}>{EXP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </div>
                <div style={{ flex: 1 }}><div style={LABEL}>Availability</div>
                  <select value={f.availability} onChange={e => set('availability', e.target.value)} style={FIELD}><option value="">—</option>{JOB_ATTRIBUTES.availability.map(o => <option key={o}>{o}</option>)}</select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}><div style={LABEL}>Right to work</div>
                  <select value={f.rightToWork} onChange={e => set('rightToWork', e.target.value)} style={FIELD}><option value="">—</option>{JOB_ATTRIBUTES.rightToWork.map(o => <option key={o}>{o}</option>)}</select>
                </div>
                <div style={{ flex: 1 }}><div style={LABEL}>Expected salary (€/mo)</div><input value={f.expectedSalary} onChange={e => set('expectedSalary', e.target.value)} inputMode="numeric" style={FIELD} /></div>
              </div>

              <div style={{ marginBottom: 12 }}><div style={LABEL}>Languages</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {JOB_LANGUAGES.map(l => {
                    const on = langs.some(x => x.language === l)
                    return <span key={l} onClick={() => toggleLang(l)} style={{ background: on ? ORANGE : '#f8f9fa', color: on ? '#fff' : '#1a1a1a', borderRadius: 50, padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-nunito)', fontWeight: 700, cursor: 'pointer' }}>{on ? '\u2713 ' : ''}{l}</span>
                  })}
                </div>
                {langs.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {langs.map(entry => (
                      <div key={entry.language} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{entry.language}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {LANGUAGE_LEVELS.map(lvl => (
                            <span key={lvl} onClick={() => setLangs(prev => prev.map(x => x.language === entry.language ? { ...x, level: lvl } : x))}
                              style={{ background: entry.level === lvl ? ORANGE : '#f8f9fa', color: entry.level === lvl ? '#fff' : '#666', border: '1px solid #eee', borderRadius: 50, padding: '4px 10px', fontSize: 10, fontFamily: 'var(--font-nunito)', fontWeight: 700, cursor: 'pointer' }}>{lvl}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Personal summary — prefilled from their CV, editable here, and
                  saved back so the next application starts improved. */}
              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Personal summary</div>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3}
                  placeholder="A few lines about you — experience, strengths, what you're looking for."
                  style={{ ...FIELD, resize: 'vertical', minHeight: 70 }} />
              </div>

              {/* Pulled from the profile — shown so the applicant can see what
                  the employer will receive. */}
              {(skills.length > 0 || strengths.length > 0) && (
                <div style={{ marginBottom: 12, background: '#f8f9fa', borderRadius: 10, padding: '10px 11px' }}>
                  {skills.length > 0 && (
                    <div style={{ marginBottom: strengths.length ? 7 : 0 }}>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 800, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Skills from your profile</div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#555' }}>{skills.join(' · ')}</div>
                    </div>
                  )}
                  {strengths.length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9.5, fontWeight: 800, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Key strengths</div>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#555' }}>{strengths.join(' · ')}</div>
                    </div>
                  )}
                  <a href="/cv" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 7, color: ORANGE, fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800 }}>Edit in My CV →</a>
                </div>
              )}

              <div style={{ marginBottom: 12 }}><div style={LABEL}>LinkedIn / portfolio (optional)</div><input value={f.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://…" style={FIELD} /></div>

              {/* Asked outright rather than assumed: plenty of people already
                  have a CV they'd rather send, and plenty don't. Either way the
                  generated Grabitt CV goes too, anonymised until interview. */}
              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Do you have your own CV? *</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: cvChoice ? 10 : 0 }}>
                  <button type="button" onClick={() => setCvChoice('own')} style={{ flex: 1, background: cvChoice === 'own' ? ORANGE : '#f8f9fa', color: cvChoice === 'own' ? '#fff' : '#555', border: '1px solid #eee', borderRadius: 10, padding: '10px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    Yes — attach it
                  </button>
                  <button type="button" onClick={() => { setCvChoice('grabitt'); setCvPath(null); setCvName('') }} style={{ flex: 1, background: cvChoice === 'grabitt' ? ORANGE : '#f8f9fa', color: cvChoice === 'grabitt' ? '#fff' : '#555', border: '1px solid #eee', borderRadius: 10, padding: '10px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    No — send my Grabitt CV
                  </button>
                </div>

                {cvChoice === 'own' && (
                  <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '11px 12px' }}>
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={e => pickCv(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                    {cvPath ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>📎</span>
                        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cvName}</span>
                        <button type="button" onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: ORANGE, fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Replace</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={cvBusy} style={{ width: '100%', background: '#fff', color: ORANGE, border: `1.5px dashed ${ORANGE}`, borderRadius: 10, padding: '12px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: cvBusy ? 'wait' : 'pointer' }}>
                        {cvBusy ? 'Uploading…' : '📎 Choose a file (PDF or Word)'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={LABEL}>Your Grabitt CV</div>
                {hasCv === false ? (
                  <div style={{ background: '#FFF7ED', border: '1px solid #FFD4A0', borderRadius: 10, padding: '11px 12px' }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#9a5b1a', lineHeight: 1.5, marginBottom: 8 }}>
                      You haven&apos;t built your CV yet. Employers receive a formatted Grabitt CV when you apply — add your experience so yours stands out.
                    </div>
                    <a href="/cv" target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: ORANGE, color: '#fff', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, textDecoration: 'none' }}>📄 Build my CV</a>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 11px' }}>
                    <span style={{ fontSize: 15 }}>📄</span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#16a34a' }}>Your CV will be sent (anonymous until they shortlist you)</span>
                    <a href="/cv" target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#16a34a', textDecoration: 'none' }}>Edit</a>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}><div style={LABEL}>Cover note (optional)</div>
                <textarea value={f.coverNote} onChange={e => set('coverNote', e.target.value)} placeholder="Why you're a great fit…" style={{ ...FIELD, minHeight: 80, resize: 'vertical' }} />
              </div>

              {/* Employer screening questions */}
              {questions.length > 0 && (
                <div style={{ marginTop: 4, marginBottom: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: ORANGE, marginBottom: 10 }}>Questions from the employer</div>
                  {questions.map(q => (
                    <div key={q.id} style={{ marginBottom: 12 }}>
                      <div style={LABEL}>{q.label}{q.required ? ' *' : ''}</div>
                      {q.type === 'long' ? (
                        <textarea value={String(answers[q.id] ?? '')} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} style={{ ...FIELD, minHeight: 70, resize: 'vertical' }} />
                      ) : q.type === 'number' ? (
                        <input value={String(answers[q.id] ?? '')} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} inputMode="numeric" style={FIELD} />
                      ) : q.type === 'boolean' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['Yes', 'No'].map(opt => (
                            <button key={opt} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))} style={{ flex: 1, border: `1.5px solid ${answers[q.id] === opt ? ORANGE : '#e5dccd'}`, background: answers[q.id] === opt ? '#FFF3EE' : '#fff', color: answers[q.id] === opt ? ORANGE : '#555', borderRadius: 10, padding: 10, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{opt}</button>
                          ))}
                        </div>
                      ) : q.type === 'choice' ? (
                        <select value={String(answers[q.id] ?? '')} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} style={FIELD}>
                          <option value="">Select…</option>
                          {(q.options ?? []).map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input value={String(answers[q.id] ?? '')} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} style={FIELD} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: '#f8f9fa', borderRadius: 10, padding: '10px 12px', marginBottom: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ width: 16, height: 16, accentColor: ORANGE, marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#555', lineHeight: 1.5 }}>I agree to share these details with the employer and for Grabitt to store them to power my profile and job matches.</span>
              </label>
            </>
          )}
        </div>

        <div style={{ padding: '12px 18px 18px', borderTop: '1px solid #f0f0f0' }}>
          <button onClick={submit} disabled={submitting || !loaded} style={{ width: '100%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Sending…' : 'Send application →'}</button>
        </div>
      </div>
    </div>
  )
}
