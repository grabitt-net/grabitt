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

// Places API (New) shapes.
type GNewComponent = { longText?: string; types: string[] }
type GNewAutocomplete = {
  suggestions?: { placePrediction?: { placeId: string; text?: { text?: string } } }[]
  error?: { status?: string; message?: string }
}
type GNewDetails = {
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  addressComponents?: GNewComponent[]
  error?: { status?: string; message?: string }
}
// Classic Geocoding API (still current — not a legacy Places endpoint).
type GComponent = { long_name: string; types: string[] }

const cityFromGoogleNew = (comps?: GNewComponent[]) => {
  if (!comps) return ''
  const pick = (t: string) => comps.find(c => c.types.includes(t))?.longText
  return pick('locality') || pick('postal_town') || pick('administrative_area_level_2') || pick('administrative_area_level_1') || ''
}
const cityFromGeocode = (comps?: GComponent[]) => {
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
    // ── Resolve a picked suggestion to coordinates (Places API New details) ──
    if (placeId) {
      if (!KEY) return NextResponse.json({ address: '', city: '', lat: null, lng: null })
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`
      const res = await fetch(url, {
        headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'formattedAddress,location,addressComponents' },
        next: { revalidate: 300 },
      })
      const data = (await res.json()) as GNewDetails
      return NextResponse.json({
        address: data.formattedAddress ?? '',
        city: cityFromGoogleNew(data.addressComponents),
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
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
        return NextResponse.json({ address: first?.formatted_address ?? '', city: cityFromGeocode(first?.address_components) })
      }
      return NextResponse.json(await nominatimReverse(la, ln))
    }

    // ── Suggestions as you type ──────────────────────────────────────────────
    if (q.length < 3) return NextResponse.json({ results: [] })
    if (KEY) {
      const [lat0, lng0] = CANARY_LOCATION.split(',').map(Number)
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
        body: JSON.stringify({
          input: q,
          includedRegionCodes: ['es'],
          languageCode: 'en',
          locationBias: { circle: { center: { latitude: lat0, longitude: lng0 }, radius: CANARY_RADIUS } },
        }),
        next: { revalidate: 60 },
      })
      const data = (await res.json()) as GNewAutocomplete
      const results = (data.suggestions ?? [])
        .map(s => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
        .map(p => ({ address: p.text?.text ?? '', placeId: p.placeId }))
      // If Google errored (API not enabled, billing off, key restricted), pass
      // its status through and fall back to Nominatim so the form still works.
      if (results.length === 0 && data.error) {
        const fallback = await nominatimSearch(q)
        return NextResponse.json({ results: fallback, provider: 'nominatim', googleStatus: data.error.status ?? 'ERROR', googleError: data.error.message ?? null })
      }
      return NextResponse.json({ results, provider: 'google' })
    }
    return NextResponse.json({ results: await nominatimSearch(q), provider: 'nominatim' })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
