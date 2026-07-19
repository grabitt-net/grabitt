// Carrier tracking links. Postal orders must use a tracked service, so every
// courier order has a number the buyer can follow. Carriers here are the ones
// actually used to and around the Canaries.

export const CARRIERS: { slug: string; name: string; url: (n: string) => string }[] = [
  { slug: 'correos', name: 'Correos', url: n => `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${encodeURIComponent(n)}` },
  { slug: 'correos_express', name: 'Correos Express', url: n => `https://www.correosexpress.com/web/correosexpress/te-informamos/seguimiento-de-envios?codigo=${encodeURIComponent(n)}` },
  { slug: 'seur', name: 'SEUR', url: n => `https://www.seur.com/livetracking/?segOnlineIdentificador=${encodeURIComponent(n)}` },
  { slug: 'mrw', name: 'MRW', url: n => `https://www.mrw.es/seguimiento_envios/MRW_seguimiento_envios.asp?enviament=${encodeURIComponent(n)}` },
  { slug: 'gls', name: 'GLS', url: n => `https://mygls.gls-spain.es/e/${encodeURIComponent(n)}` },
  { slug: 'dhl', name: 'DHL', url: n => `https://www.dhl.com/es-es/home/tracking.html?tracking-id=${encodeURIComponent(n)}` },
  { slug: 'ups', name: 'UPS', url: n => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}` },
  { slug: 'dpd', name: 'DPD', url: n => `https://tracking.dpd.de/status/en_GB/parcel/${encodeURIComponent(n)}` },
  { slug: 'tipsa', name: 'TIPSA', url: n => `https://www.tip-sa.com/localizador?n=${encodeURIComponent(n)}` },
  { slug: 'envialia', name: 'Envialia', url: n => `https://www.envialia.com/seguimiento-envio/?n=${encodeURIComponent(n)}` },
  { slug: 'other', name: 'Other carrier', url: () => '' },
]

const BY_KEY = new Map(CARRIERS.flatMap(c => [[c.slug, c], [c.name.toLowerCase(), c]] as const))

/** Tracking URL for a carrier + number, or null if we can't build one. */
export function trackingUrlFor(carrier: string, trackingNumber: string): string | null {
  const entry = BY_KEY.get(carrier.trim().toLowerCase())
  if (!entry) return null
  const url = entry.url(trackingNumber.trim())
  return url || null
}
