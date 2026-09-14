'use client'
import { useEffect } from 'react'
import { detectBrowserLang, setLanguage } from '@/lib/i18n'

// First-visit language detection. If the visitor hasn't chosen a language yet,
// pick it from their browser and (for a non-English browser) reload once so the
// UI renders in that language — `t()` reads the stored value. A session guard
// prevents any reload loop; an explicit choice (stored value) is never touched.
export default function LangBoot() {
  useEffect(() => {
    try {
      if (localStorage.getItem('grabitt_lang')) return
      const lang = detectBrowserLang()
      setLanguage(lang)
      if (lang !== 'en' && !sessionStorage.getItem('grabitt_lang_init')) {
        sessionStorage.setItem('grabitt_lang_init', '1')
        window.location.reload()
      }
    } catch { /* storage blocked — stays English */ }
  }, [])
  return null
}
