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

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }

export default function JobCategories({ me, onReload, mode }: { me: any; onReload: () => void; mode: 'seeker' | 'employer' }) {
  const jp = me?.jobProfile ?? {}
  const [languages, setLanguages] = useState<string[]>(Array.isArray(jp.languages) ? jp.languages : [])
  const [exp, setExp] = useState<Record<string, number>>(jp.experience && typeof jp.experience === 'object' ? { ...jp.experience } : {})
  const [open, setOpen] = useState<number | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const setMonths = (key: string, v: string) => {
    setState('idle')
    setExp(prev => {
      const n = { ...prev }
      const num = parseInt(v, 10)
      if (!v || isNaN(num) || num <= 0) delete n[key]
      else n[key] = Math.min(num, 999)
      return n
    })
  }
  const toggleLang = (l: string) => { setState('idle'); setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]) }
  const save = async () => {
    setState('saving')
    try { await trpcAuthed().users.updateProfile.mutate({ jobProfile: { languages, experience: exp } }); onReload(); setState('saved'); setTimeout(() => setState('idle'), 2500) }
    catch { setState('idle'); toast(t('Could not save. Please try again.')) }
  }
  const filled = (si: number) => JOB_SECTORS[si].jobs.reduce((a, _, ji) => a + (exp[jobKey(si, ji)] ? 1 : 0), 0)

  return (
    <div style={card}>
      <div style={cardHead}>{t('Recruitment — Job Categories')}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#666', lineHeight: 1.5, marginBottom: 14 }}>
        {mode === 'employer'
          ? t('Tag the roles you hire for and the months of experience you require, plus the languages needed.')
          : t('Pick the roles you can do and how many months in total you have ever done each, and add the languages you speak.')}
      </div>

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
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #efe7db', borderRadius: 999, padding: '6px 8px 6px 14px', background: '#fff' }}>
                        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job}</span>
                        <input type="number" min={0} max={999} value={exp[key] ?? ''} onChange={e => setMonths(key, e.target.value)} placeholder="0"
                          aria-label={`${job} — ${mode === 'employer' ? 'months required' : 'months done'}`}
                          style={{ width: 56, textAlign: 'center', border: '1.5px solid #e5dccd', borderRadius: 999, padding: '5px 6px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', outline: 'none' }} />
                        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, color: '#9a8f7f', paddingRight: 4 }}>{t('mo')}</span>
                      </div>
                    )
                  })}
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#aaa', paddingTop: 2 }}>{mode === 'employer' ? t('Months of experience required') : t('Total months you have done each role')}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={save} disabled={state === 'saving'} style={{ width: '100%', marginTop: 14, background: state === 'saved' ? 'var(--sage)' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: state === 'saving' ? 'wait' : 'pointer' }}>
        {state === 'saving' ? t('Saving…') : state === 'saved' ? t('Saved ✓') : t('Save')}
      </button>
    </div>
  )
}
