import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// Machine-translation proxy for user-generated content (listing titles &
// descriptions, job adverts, messages, directory listings, guides).
// Auto-translates to the viewer's site language; results are cached in the
// Translation table keyed by (hash, lang) so repeat views never re-hit a provider.
//
// Provider priority — free by default, no card required:
//   1. DeepL API Free      — set DEEPL_API_KEY (free tier: 500k chars/month, best quality)
//   2. Google Cloud (paid) — set GOOGLE_TRANSLATE_API_KEY (only if you opt in)
//   3. MyMemory            — free, no key, used automatically as the fallback
// Set MYMEMORY_EMAIL to raise MyMemory's free daily quota.
//
// POST { texts: string[], target: string } → { translations: string[] }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEEPL_KEY = process.env.DEEPL_API_KEY
const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY // NB: not the Maps key — avoids surprise billing
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || ''

const SUPPORTED = new Set(['en', 'es', 'de', 'da', 'sv', 'nl', 'fr', 'pt'])
const MAX_LEN = 5000
// Cap provider calls per request when using the per-string free API, so one page
// never fires hundreds of requests; the rest resolve from cache on later loads.
const MYMEMORY_MAX = 30

const hashOf = (s: string) => createHash('sha256').update(s).digest('hex')

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseAdmin(url, key, { auth: { persistSession: false } })
}

// ── Providers: each takes the miss list + target, returns src → translated ──────
async function viaDeepL(misses: string[], target: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const host = (DEEPL_KEY || '').endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: misses, target_lang: target === 'en' ? 'EN-GB' : target.toUpperCase() }),
  })
  if (!res.ok) return out
  const json = await res.json() as { translations?: { text?: string }[] }
  ;(json.translations ?? []).forEach((t, i) => { if (typeof t.text === 'string') out.set(misses[i], t.text) })
  return out
}

async function viaGoogle(misses: string[], target: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: misses, target, format: 'text' }),
  })
  if (!res.ok) return out
  const json = await res.json() as { data?: { translations?: { translatedText?: string }[] } }
  ;(json.data?.translations ?? []).forEach((t, i) => { if (typeof t.translatedText === 'string') out.set(misses[i], t.translatedText) })
  return out
}

async function viaMyMemory(misses: string[], target: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  // MyMemory needs a source language. The site is EN/ES-first, so assume content
  // is in the "other" launch language; default to English for any other target.
  const source = target === 'es' ? 'en' : target === 'en' ? 'es' : 'en'
  const de = MYMEMORY_EMAIL ? `&de=${encodeURIComponent(MYMEMORY_EMAIL)}` : ''
  for (const text of misses.slice(0, MYMEMORY_MAX)) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}${de}`
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json() as { responseStatus?: number; responseData?: { translatedText?: string } }
      const translated = json.responseData?.translatedText
      // MyMemory returns quota/error notices in translatedText with non-200 status.
      if (json.responseStatus === 200 && typeof translated === 'string' && translated.trim()) out.set(text, translated)
    } catch { /* skip this one */ }
  }
  return out
}

export async function POST(req: Request) {
  let body: { texts?: unknown; target?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const target = String(body.target ?? '').toLowerCase()
  const texts = Array.isArray(body.texts) ? body.texts.map(t => (typeof t === 'string' ? t : '')) : []
  if (!texts.length) return NextResponse.json({ translations: [] })
  if (!SUPPORTED.has(target)) return NextResponse.json({ translations: texts })

  const translatable = (s: string) => s.trim().length > 0 && s.length <= MAX_LEN
  const uniques = Array.from(new Set(texts.filter(translatable)))
  const result = new Map<string, string>()
  const db = admin()

  // 1) Cache lookup.
  const hashes = uniques.map(hashOf)
  const hashToText = new Map(uniques.map((t, i) => [hashes[i], t]))
  if (db && hashes.length) {
    const { data } = await db.from('Translation').select('hash, text').eq('lang', target).in('hash', hashes)
    for (const row of (data ?? []) as { hash: string; text: string }[]) {
      const src = hashToText.get(row.hash)
      if (src !== undefined) result.set(src, row.text)
    }
  }

  // 2) Translate the misses via the first configured provider (free by default).
  const misses = uniques.filter(t => !result.has(t))
  if (misses.length) {
    try {
      const fresh = DEEPL_KEY ? await viaDeepL(misses, target)
        : GOOGLE_KEY ? await viaGoogle(misses, target)
        : await viaMyMemory(misses, target)
      const rows: { hash: string; lang: string; text: string }[] = []
      for (const [src, translated] of fresh) {
        result.set(src, translated)
        rows.push({ hash: hashOf(src), lang: target, text: translated })
      }
      // 3) Persist for next time (ignore conflicts on the unique key).
      if (db && rows.length) await db.from('Translation').upsert(rows, { onConflict: 'hash,lang', ignoreDuplicates: true })
    } catch { /* provider hiccup — untranslated strings echo back below */ }
  }

  // 4) Map every input back to its translation (or itself when not translated).
  return NextResponse.json({ translations: texts.map(t => result.get(t) ?? t) })
}
