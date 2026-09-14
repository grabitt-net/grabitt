'use client'
import { useEffect, useState } from 'react'
import { LAUNCH_LANGS, langLabel, getLanguage, setLanguage, type Lang } from '@/lib/i18n'

// Footer language switcher. Lists the languages we launch with (EN/ES) and,
// on change, stores the choice and reloads so the whole UI re-renders in it —
// `t()` isn't reactive, so a reload is how the app already applies a language.
// Extend LAUNCH_LANGS in lib/i18n once more languages are fully translated.
export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(getLanguage()) }, [])

  const change = (next: Lang) => {
    if (next === getLanguage()) return
    setLanguage(next)
    window.location.reload()
  }

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#1a1a1a' }}>
      <span aria-hidden>🌐</span>
      <select
        value={lang}
        onChange={e => change(e.target.value as Lang)}
        aria-label="Language"
        style={{ border: '1px solid var(--sand2, #e8dcc0)', background: '#fff', borderRadius: 8, padding: '5px 10px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer' }}
      >
        {LAUNCH_LANGS.map(l => <option key={l} value={l}>{langLabel(l)}</option>)}
      </select>
    </label>
  )
}
