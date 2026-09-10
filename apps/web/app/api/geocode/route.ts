import { NextResponse } from 'next/server'

// Server-side geocoding proxy for the address autocomplete. Calling Nominatim
// from the browser is unreliable (per-user rate limits, missing User-Agent,
// occasional blocks); doing it here with a proper identifying User-Agent is the
// recommended, dependable approach. Biased to the Canary Islands.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type NominatimResult = { display_name: string; lat: string; lon: string; address?: Record<string, string> }

const townFrom = (a?: Record<string, string>) =>
  a?.town || a?.city || a?.village || a?.municipality || a?.suburb || a?.county || ''

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 3) return NextResponse.json({ results: [] })
  try {
    // Bias to the Canary Islands (viewbox) within Spain, but don't hard-bound —
    // so partial/edge matches still return.
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=es&viewbox=-18.3,29.5,-13.2,27.4&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Grabitt/1.0 (https://www.grabitt.net; support@grabitt.net)',
        'Accept-Language': 'en',
        'Accept': 'application/json',
      },
      // Cache identical lookups briefly to ease load and speed repeat keystrokes.
      next: { revalidate: 60 },
    })
    if (!res.ok) return NextResponse.json({ results: [] })
    const data = (await res.json()) as NominatimResult[]
    const results = (Array.isArray(data) ? data : []).map(r => ({
      address: r.display_name,
      city: townFrom(r.address),
      lat: Number(r.lat),
      lng: Number(r.lon),
    }))
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
