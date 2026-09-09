// Auto-fill "distance to nearest…" fields for a property from its map location,
// using OpenStreetMap's Overpass API (no key — same OSM stack as our maps and
// address search). Returns straight-line metres to the nearest shops, school,
// beach and town. Best-effort: on any failure it returns {} and the form keeps
// whatever the user typed.

type Dists = { distShops?: number; distSchools?: number; distBeach?: number; distTown?: number }

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

type OverpassEl = { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

// Overpass has several public endpoints; we try them in order until one answers.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

async function overpass(q: string): Promise<OverpassEl[] | null> {
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const ctrl = new AbortController()
      const to = setTimeout(() => ctrl.abort(), 20000)
      const res = await fetch(url, {
        method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctrl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      clearTimeout(to)
      if (!res.ok) continue
      const data = await res.json() as { elements?: OverpassEl[] }
      if (Array.isArray(data.elements)) return data.elements
    } catch { /* try the next endpoint */ }
  }
  return null
}

export async function autoFillDistances(lat: number, lng: number): Promise<Dists> {
  // One combined query; we categorise each returned element by its tags.
  const around = (r: number, f: string) => `node(around:${r},${lat},${lng})${f};way(around:${r},${lat},${lng})${f};`
  const q = `[out:json][timeout:25];(
    ${around(4000, '[shop~"supermarket|convenience|mall|greengrocer|bakery"]')}
    ${around(6000, '[amenity=school]')}
    ${around(15000, '[natural=beach]')}
    ${around(30000, '[place~"town|city"]')}
  );out center 300;`
  const els = await overpass(q)
  if (!els) return {}
  let shops = Infinity, schools = Infinity, beach = Infinity, town = Infinity
  for (const e of els) {
    const p = e.center ?? (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null)
    if (!p) continue
    const d = haversineM(lat, lng, p.lat, p.lon)
    if (d < 5) continue // skip the property's own point
    const t = e.tags ?? {}
    if (t.shop) shops = Math.min(shops, d)
    else if (t.amenity === 'school') schools = Math.min(schools, d)
    else if (t.natural === 'beach') beach = Math.min(beach, d)
    else if (t.place === 'town' || t.place === 'city') town = Math.min(town, d)
  }
  const m = (v: number) => (Number.isFinite(v) ? Math.round(v) : undefined)
  return { distShops: m(shops), distSchools: m(schools), distBeach: m(beach), distTown: m(town) }
}
