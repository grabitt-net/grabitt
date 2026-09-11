import { NextResponse } from 'next/server'

// Server-side geocoding proxy for address autocomplete + the map pin.
//
// Prefers Google when GOOGLE_MAPS_API_KEY is set (accurate, proper autocomplete)
// and transparently falls back to Nominatim (OpenStreetMap) when it isn't, so
// the feature keeps working before the key is configured. The key stays on the
// server — it is never exposed to the browser.
//
// Three modes, chosen by query param:
//   ?q=<text>          → suggestions:   { results: [{ address, placeId? , lat?, lng?, city? }] }
//   ?placeId=<id>      → resolve a pick: { address, city, lat, lng }
//   ?lat=&lng=         → reverse geocode a dropped pin: { address, city }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEY = process.env.GOOGLE_MAPS_API_KEY
// Bias suggestions toward the Canary Islands (centre + ~300km radius) within Spain.
const CANARY_LOCATION = '28.3,-16.0'
const CANARY_RADIUS = 300000

type GAutocomplete = { predictions?: { description: string; place_id: string }[]; status: string }
type GComponent = { long_name: string; types: string[] }
type GDetails = {
  result?: { formatted_address?: string; geometry?: { location?: { lat: number; lng: number } }; address_components?: GComponent[] }
  status: string
}

const cityFromGoogle = (comps?: GComponent[]) => {
  if (!comps) return ''
  const pick = (t: string) => comps.find(c => c.types.includes(t))?.long_name
  return pick('locality') || pick('postal_town') || pick('administrative_area_level_2') || pick('administrative_area_level_1') || ''
}

// ── Nominatim fallback (no Google key configured) ────────────────────────────
type NominatimResult = { display_name: string; lat: string; lon: string; address?: Record<string, string> }
const townFromOsm = (a?: Record<string, string>) =>
  a?.town || a?.city || a?.village || a?.municipality || a?.suburb || a?.county || ''

async function nominatimSearch(q: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=es&viewbox=-18.3,29.5,-13.2,27.4&q=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Grabitt/1.0 (https://www.grabitt.net; support@grabitt.net)', 'Accept-Language': 'en', 'Accept': 'application/json' },
    next: { revalidate: 60 },
  })
  if (!res.ok) return []
  const data = (await res.json()) as NominatimResult[]
  return (Array.isArray(data) ? data : []).map(r => ({ address: r.display_name, city: townFromOsm(r.address), lat: Number(r.lat), lng: Number(r.lon) }))
}

async function nominatimReverse(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Grabitt/1.0 (https://www.grabitt.net; support@grabitt.net)', 'Accept-Language': 'en', 'Accept': 'application/json' },
    next: { revalidate: 60 },
  })
  if (!res.ok) return { address: '', city: '' }
  const r = (await res.json()) as NominatimResult
  return { address: r.display_name ?? '', city: townFromOsm(r.address) }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const q = params.get('q')?.trim() ?? ''
  const placeId = params.get('placeId')?.trim() ?? ''
  const lat = params.get('lat')
  const lng = params.get('lng')

  try {
    // ── Resolve a picked suggestion to coordinates (Google Place Details) ────
    if (placeId) {
      if (!KEY) return NextResponse.json({ address: '', city: '', lat: null, lng: null })
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry/location,address_component&language=en&key=${KEY}`
      const res = await fetch(url, { next: { revalidate: 300 } })
      const data = (await res.json()) as GDetails
      const loc = data.result?.geometry?.location
      return NextResponse.json({
        address: data.result?.formatted_address ?? '',
        city: cityFromGoogle(data.result?.address_components),
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      })
    }

    // ── Reverse geocode a dropped pin ────────────────────────────────────────
    if (lat && lng) {
      const la = Number(lat), ln = Number(lng)
      if (Number.isNaN(la) || Number.isNaN(ln)) return NextResponse.json({ address: '', city: '' })
      if (KEY) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${la},${ln}&language=en&key=${KEY}`
        const res = await fetch(url, { next: { revalidate: 300 } })
        const data = (await res.json()) as { results?: { formatted_address: string; address_components: GComponent[] }[] }
        const first = data.results?.[0]
        return NextResponse.json({ address: first?.formatted_address ?? '', city: cityFromGoogle(first?.address_components) })
      }
      return NextResponse.json(await nominatimReverse(la, ln))
    }

    // ── Suggestions as you type ──────────────────────────────────────────────
    if (q.length < 3) return NextResponse.json({ results: [] })
    if (KEY) {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&components=country:es&location=${CANARY_LOCATION}&radius=${CANARY_RADIUS}&language=en&key=${KEY}`
      const res = await fetch(url, { next: { revalidate: 60 } })
      const data = (await res.json()) as GAutocomplete
      const results = (data.predictions ?? []).map(p => ({ address: p.description, placeId: p.place_id }))
      return NextResponse.json({ results, provider: 'google' })
    }
    return NextResponse.json({ results: await nominatimSearch(q), provider: 'nominatim' })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
