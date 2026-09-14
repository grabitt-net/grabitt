'use client'
import { useEffect, useState } from 'react'
import { getLanguage } from './i18n'

// Machine translation for user-generated content (listing titles/descriptions,
// job adverts, messages). The dictionary `t()` covers the fixed UI; this covers
// the free text users write, auto-translated to the viewer's site language with
// no "show original" toggle. Results are cached server-side (Translation table)
// and in-memory here so a title translated once isn't re-fetched.

// key = `${lang}\n${source}` -> translated
const memo = new Map<string, string>()

async function fetchTranslations(texts: string[], target: string): Promise<string[]> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, target }),
    })
    if (!res.ok) return texts
    const json = await res.json() as { translations?: string[] }
    const out = json.translations
    return Array.isArray(out) && out.length === texts.length ? out : texts
  } catch {
    return texts
  }
}

// Translate an arbitrary list of strings to `target`, using the in-memory cache
// and only asking the server for the misses. Returns the list in input order.
export async function translateTexts(texts: string[], target = getLanguage()): Promise<string[]> {
  if (!texts.length) return texts
  const misses = Array.from(new Set(texts.filter(t => t && !memo.has(`${target}\n${t}`))))
  if (misses.length) {
    const got = await fetchTranslations(misses, target)
    misses.forEach((src, i) => memo.set(`${target}\n${src}`, got[i] ?? src))
  }
  return texts.map(t => (t ? memo.get(`${target}\n${t}`) ?? t : t))
}

// React hook: pass the source strings, get back the translated ones. Renders the
// originals first, then swaps to translations once they resolve. Stable across
// re-renders via the joined-source dependency.
export function useTranslated(texts: (string | null | undefined)[]): string[] {
  const clean = texts.map(t => t ?? '')
  const [out, setOut] = useState<string[]>(clean)
  const lang = getLanguage()
  const dep = clean.join('')

  useEffect(() => {
    let live = true
    // English is the site's source language for most content; skip the round
    // trip and let Google detect+translate only when the viewer isn't on English.
    if (lang === 'en') { setOut(clean); return }
    translateTexts(clean, lang).then(res => { if (live) setOut(res) })
    return () => { live = false }
  }, [dep, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  return out
}

// Convenience for a single string.
export function useTranslatedText(text: string | null | undefined): string {
  return useTranslated([text])[0]
}
