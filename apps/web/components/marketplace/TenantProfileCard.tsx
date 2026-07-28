'use client'
import { useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { t } from '@/lib/i18n'

export type TenantProfile = {
  tenantBudget: number | null
  tenantMoveIn: string | null
  tenantOccupants: number | null
  tenantEmployment: string | null
  tenantHasPets: boolean
  tenantSmoker: boolean
  tenantAbout: string | null
}

const EMPLOYMENT = ['', 'Employed', 'Self-employed', 'Student', 'Retired', 'Other']

// A short, plain-text summary of a tenant profile, used when a renter enquires
// about a rental so the agent can pre-qualify them.
export function tenantSummary(p: Partial<TenantProfile>): string {
  const lines: string[] = []
  if (p.tenantBudget) lines.push(`Budget: up to €${p.tenantBudget}/mo`)
  if (p.tenantMoveIn) lines.push(`Move-in: ${p.tenantMoveIn}`)
  if (p.tenantOccupants) lines.push(`Occupants: ${p.tenantOccupants}`)
  if (p.tenantEmployment) lines.push(`Employment: ${p.tenantEmployment}`)
  lines.push(`Pets: ${p.tenantHasPets ? 'Yes' : 'No'} · Smoker: ${p.tenantSmoker ? 'Yes' : 'No'}`)
  if (p.tenantAbout) lines.push(`About: ${p.tenantAbout}`)
  return lines.join('\n')
}

// Tenant profile editor for the account page.
export default function TenantProfileCard() {
  const [loaded, setLoaded] = useState(false)
  const [f, setF] = useState<TenantProfile>({ tenantBudget: null, tenantMoveIn: null, tenantOccupants: null, tenantEmployment: null, tenantHasPets: false, tenantSmoker: false, tenantAbout: null })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = <K extends keyof TenantProfile>(k: K, v: TenantProfile[K]) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    (trpcAuthed() as any).users.me.query().then((me: any) => {
      setF({
        tenantBudget: me?.tenantBudget ?? null,
        tenantMoveIn: me?.tenantMoveIn ?? null,
        tenantOccupants: me?.tenantOccupants ?? null,
        tenantEmployment: me?.tenantEmployment ?? null,
        tenantHasPets: !!me?.tenantHasPets,
        tenantSmoker: !!me?.tenantSmoker,
        tenantAbout: me?.tenantAbout ?? null,
      })
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      await (trpcAuthed() as any).users.updateTenantProfile.mutate({
        tenantBudget: f.tenantBudget ?? null,
        tenantMoveIn: f.tenantMoveIn ?? null,
        tenantOccupants: f.tenantOccupants ?? null,
        tenantEmployment: f.tenantEmployment ?? null,
        tenantHasPets: f.tenantHasPets,
        tenantSmoker: f.tenantSmoker,
        tenantAbout: f.tenantAbout ?? null,
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  if (!loaded) return null

  return (
    <div style={card}>
      <div style={title}>🏠 {t('Tenant profile')}</div>
      <p style={hint}>{t('Fill this in once and share it with agents when you enquire about a rental — it helps you stand out.')}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={f.tenantBudget ?? ''} onChange={e => set('tenantBudget', e.target.value ? Number(e.target.value) : null)} inputMode="numeric" placeholder={t('Budget €/mo')} style={{ ...inp, flex: 1 }} />
        <input value={f.tenantOccupants ?? ''} onChange={e => set('tenantOccupants', e.target.value ? Number(e.target.value) : null)} inputMode="numeric" placeholder={t('Occupants')} style={{ ...inp, flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={f.tenantMoveIn ?? ''} onChange={e => set('tenantMoveIn', e.target.value || null)} placeholder={t('Move-in (e.g. ASAP)')} style={{ ...inp, flex: 1 }} />
        <select value={f.tenantEmployment ?? ''} onChange={e => set('tenantEmployment', e.target.value || null)} style={{ ...inp, flex: 1, background: '#fff' }}>
          {EMPLOYMENT.map(x => <option key={x} value={x}>{x || t('Employment')}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <label style={toggle}><input type="checkbox" checked={f.tenantHasPets} onChange={e => set('tenantHasPets', e.target.checked)} /> {t('Pets')}</label>
        <label style={toggle}><input type="checkbox" checked={f.tenantSmoker} onChange={e => set('tenantSmoker', e.target.checked)} /> {t('Smoker')}</label>
      </div>
      <textarea value={f.tenantAbout ?? ''} onChange={e => set('tenantAbout', e.target.value || null)} rows={3} placeholder={t('A short intro — who you are, references available, etc.')} style={{ ...inp, resize: 'vertical' }} />
      <button onClick={save} disabled={saving} style={btn}>{saving ? t('Saving…') : saved ? t('Saved ✓') : t('Save tenant profile')}</button>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }
const title: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }
const hint: React.CSSProperties = { fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#777', lineHeight: 1.5, margin: 0 }
const toggle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 700, color: '#555', cursor: 'pointer' }
const inp: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff', color: 'var(--dark)', minWidth: 0, boxSizing: 'border-box' }
const btn: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 16px', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, cursor: 'pointer' }
