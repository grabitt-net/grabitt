import { prisma } from 'server/src/db'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Housekeeping for the Sell flow: photos are uploaded to storage the moment
// they're added to a listing draft, so a listing that's started and abandoned
// leaves orphaned images under `photos/listings/<id>/…`. This removes any such
// image that is older than the grace window AND is not referenced by a live
// listing. Triggered by Vercel Cron (see vercel.json); protected by CRON_SECRET.
const BUCKET = 'photos'
const PREFIX = 'listings'
const GRACE_HOURS = 48
const MAX_FOLDERS = 800 // safety cap per run

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return Response.json({ ok: false, error: 'Storage not configured' }, { status: 500 })

  const admin = createSupabaseAdmin(url, serviceKey)
  const cutoff = Date.now() - GRACE_HOURS * 3600 * 1000

  try {
    // Every storage path still referenced by a listing (so it must be kept).
    const listings = await prisma.listing.findMany({ select: { images: true } })
    const referenced = new Set<string>()
    for (const l of listings) {
      for (const img of (l.images ?? [])) {
        const path = String(img).split('/photos/')[1]
        if (path) referenced.add(path)
      }
    }

    // Walk each listing/<id> folder and delete stale, unreferenced files.
    const folders = await listAll(admin, PREFIX)
    let scanned = 0, deleted = 0
    for (const folder of folders.slice(0, MAX_FOLDERS)) {
      const dir = `${PREFIX}/${folder}`
      const toDelete: string[] = []
      const { data: entries } = await admin.storage.from(BUCKET).list(dir, { limit: 1000 })
      for (const e of entries ?? []) {
        if (!e.name) continue
        const full = `${dir}/${e.name}`
        scanned++
        const created = e.created_at ? new Date(e.created_at).getTime() : 0
        if (created && created > cutoff) continue        // still within grace window
        if (referenced.has(full)) continue                // used by a live listing
        toDelete.push(full)
      }
      if (toDelete.length) {
        const { error } = await admin.storage.from(BUCKET).remove(toDelete)
        if (!error) deleted += toDelete.length
      }
    }

    return Response.json({ ok: true, folders: folders.length, scanned, deleted })
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}

// List immediate children (names) of a storage prefix.
async function listAll(admin: any, prefix: string): Promise<string[]> {
  const out: string[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 100, offset })
    if (error || !data || data.length === 0) break
    for (const d of data) if (d.name) out.push(d.name)
    if (data.length < 100) break
    offset += 100
  }
  return out
}
