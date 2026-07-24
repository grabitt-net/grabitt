'use client'
import { useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { DEPT_LABEL } from '@/lib/listingMap'
import { t } from '@/lib/i18n'

// Attributes & preferences, as the prototype captured them: what you're
// interested in buying, what you do for fun, and what you can do for work.
//
// These aren't decoration — interests and sub-interests drive alerts and
// e-shot segmentation, and skills feed job matching. Marketing may only use
// them where the member has also given marketing consent.

const HOBBIES = [
  'Cooking', 'Cycling', 'Swimming', 'Restaurants', 'Cafes', 'Hiking', 'Reading', 'Gaming',
  'Photography', 'Gardening', 'Football', 'Yoga', 'Running', 'Music', 'Art & Crafts',
  'Fishing', 'Beach', 'Travel', 'DIY', 'Dancing',
]

const SKILLS = [
  'Hospitality/Catering', 'Bar & Waiting', 'Cooking/Chef', 'Cleaning', 'Childcare', 'Driving',
  'Sales', 'Customer Service', 'Admin/Office', 'Languages', 'Construction/Trades', 'Plumbing',
  'Electrical', 'Carpentry', 'Gardening', 'Mechanics', 'IT/Tech', 'Marketing',
  'Healthcare/Care', 'Teaching/Tutoring', 'Beauty/Hair', 'Security',
]

const DEPARTMENTS = Object.values(DEPT_LABEL).filter(d => d !== 'Jobs' && d !== 'Other')

export type Attributes = { interests: string[]; hobbies: string[]; skills: string[] }

export default function AttributesCard({ compact, onSaved }: { compact?: boolean; onSaved?: () => void }) {
  const [attrs, setAttrs] = useState<Attributes | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    trpcAuthed().users.me.query()
      .then(u => {
        const me = u as unknown as Attributes
        setAttrs({ interests: me.interests ?? [], hobbies: me.hobbies ?? [], skills: me.skills ?? [] })
      })
      .catch(() => setAttrs({ interests: [], hobbies: [], skills: [] }))
  }, [])

  if (!attrs) return null

  const toggle = (key: keyof Attributes, value: string) => {
    setSaved(false)
    setAttrs(a => {
      if (!a) return a
      const list = a[key]
      return { ...a, [key]: list.includes(value) ? list.filter(x => x !== value) : [...list, value] }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await trpcAuthed().users.updateProfile.mutate(attrs)
      setSaved(true)
      onSaved?.()
    } catch { /* the button stays available to retry */ }
    finally { setSaving(false) }
  }

  const count = attrs.interests.length + attrs.hobbies.length + attrs.skills.length

  return (
    <div id="attributes" style={card}>
      <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between' }}>
        <span>🎯 {t('Attributes & preferences')}</span>
        {count > 0 && <span style={{ color: 'var(--orange)' }}>{count} {t('selected')}</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#666', lineHeight: 1.55, marginBottom: 14 }}>
        {t('These shape what we show you, which alerts you get, and which jobs match you.')}
      </div>

      <Group label={t('MY INTERESTS')} hint={t('Departments you want to hear about')} options={DEPARTMENTS} selected={attrs.interests} onToggle={v => toggle('interests', v)} compact={compact} />
      <Group label={t('MY HOBBIES')} hint={t('What you enjoy outside work')} options={HOBBIES} selected={attrs.hobbies} onToggle={v => toggle('hobbies', v)} compact={compact} />
      <Group label={t('MY SKILLS')} hint={t('What you can be matched to for work')} options={SKILLS} selected={attrs.skills} onToggle={v => toggle('skills', v)} compact={compact} />

      <button onClick={save} disabled={saving} style={{
        width: '100%', marginTop: 6, border: 'none', borderRadius: 12, padding: 12, cursor: saving ? 'wait' : 'pointer',
        background: saved ? '#e8f5e9' : 'linear-gradient(135deg,var(--orange),var(--orange2))',
        color: saved ? '#16a34a' : '#fff', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900,
      }}>
        {saving ? t('Saving…') : saved ? `✓ ${t('Saved')}` : t('Save attributes')}
      </button>
    </div>
  )
}

function Group({ label, hint, options, selected, onToggle, compact }: {
  label: string; hint: string; options: string[]; selected: string[]; onToggle: (v: string) => void; compact?: boolean
}) {
  const [open, setOpen] = useState(!compact)
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 6, textAlign: 'left' }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: 'var(--orange)', letterSpacing: 0.4 }}>{label}</span>
        {selected.length > 0 && <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: 'var(--orange)' }}>({selected.length})</span>}
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, color: '#999', flex: 1 }}>{hint}</span>
        <span style={{ fontSize: 11, color: '#999' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {options.map(o => {
            const on = selected.includes(o)
            return (
              <button key={o} onClick={() => onToggle(o)} style={{
                border: `1.5px solid ${on ? 'var(--orange)' : '#e5dccd'}`,
                background: on ? 'var(--orange)' : '#fff', color: on ? '#fff' : '#666',
                borderRadius: 50, padding: '6px 12px', cursor: 'pointer',
                fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800,
              }}>{on ? '✓ ' : ''}{o}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }
