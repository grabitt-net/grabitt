import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// Machine-translation proxy for user-generated content (listing titles &
// descriptions, job adverts, messages). Auto-translates to the viewer's site
// language; results are cached in the Translation table keyed by (hash, lang)
// so repeat views never re-hit Google. The API key stays on the server.
//
// POST { texts: string[], target: string } → { translations: string[] }
// The response array is aligned to the input order. When no key is configured,
// or the target is unsupported, the original texts are returned unchanged so the
// site keeps working.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Google Cloud Translation API (v2, API-key auth). Reuses the Maps key when a
// dedicated translate key isn't set — enable "Cloud Translation API" on it.
const KEY = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_MAPS_API_KEY
// The site's supported languages (mirrors lib/i18n Lang).
const SUPPORTED = new Set(['en', 'es', 'de', 'da', 'sv', 'nl', 'fr', 'pt'])
// Don't send anything huge to the API; skip oversized blobs (returned as-is).
const MAX_LEN = 5000

const hashOf = (s: string) => createHash('sha256').update(s).digest('hex')

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseAdmin(url, key, { auth: { persistSession: false } })
}

export async function POST(req: Request) {
  let body: { texts?: unknown; target?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const target = String(body.target ?? '').toLowerCase()
  const texts = Array.isArray(body.texts) ? body.texts.map(t => (typeof t === 'string' ? t : '')) : []
  if (!texts.length) return NextResponse.json({ translations: [] })

  // Nothing to do (or can't): echo the input so callers can use the result
  // unconditionally.
  if (!KEY || !SUPPORTED.has(target)) return NextResponse.json({ translations: texts })

  // Work on the unique, non-trivial strings only — many inputs repeat (same
  // title in a list) or are empty / too long to translate.
  const translatable = (s: string) => s.trim().length > 0 && s.length <= MAX_LEN
  const uniques = Array.from(new Set(texts.filter(translatable)))
  const result = new Map<string, string>() // source text -> translated

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

  // 2) Translate the misses via Google, in one batched call.
  const misses = uniques.filter(t => !result.has(t))
  if (misses.length) {
    try {
      const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: misses, target, format: 'text' }),
      })
      if (res.ok) {
        const json = await res.json() as { data?: { translations?: { translatedText?: string }[] } }
        const out = json.data?.translations ?? []
        const rows: { hash: string; lang: string; text: string }[] = []
        misses.forEach((src, i) => {
          const translated = out[i]?.translatedText
          if (typeof translated === 'string') {
            result.set(src, translated)
            rows.push({ hash: hashOf(src), lang: target, text: translated })
          }
        })
        // 3) Persist for next time (ignore conflicts on the unique key).
        if (db && rows.length) {
          await db.from('Translation').upsert(rows, { onConflict: 'hash,lang', ignoreDuplicates: true })
        }
      }
    } catch { /* provider hiccup — fall through, untranslated strings echo back */ }
  }

  // 4) Map every input back to its translation (or itself when not translated).
  const translations = texts.map(t => result.get(t) ?? t)
  return NextResponse.json({ translations })
}
