'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GC_CENTER } from '@/lib/gcGeo'

export type PropertyPoint = { id: string; title: string; price: string; location: string; lat: number; lng: number }

// Map of property listings (Leaflet + OpenStreetMap, no API key). Drops a 🏠 pin
// per property and, when the viewer's location is known, draws the search-radius
// circle centred on them.
export default function PropertyMap({ points, centre, radiusKm }: { points: PropertyPoint[]; centre: [number, number] | null; radiusKm: number }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView(centre ?? GC_CENTER, centre ? 12 : 10)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapRef.current = null }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    if (centre) {
      L.circleMarker(centre, { radius: 7, color: '#1B6CA8', fillColor: '#1B6CA8', fillOpacity: 0.9, weight: 2 }).addTo(layer).bindPopup('You are here')
      L.circle(centre, { radius: radiusKm * 1000, color: '#FF4500', weight: 1.5, fillColor: '#FF8C00', fillOpacity: 0.06 }).addTo(layer)
    }

    const seen = new Map<string, number>()
    const markers: L.Marker[] = []
    for (const p of points) {
      const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
      const n = seen.get(key) ?? 0
      seen.set(key, n + 1)
      const jitter = n === 0 ? [0, 0] : [Math.cos(n) * 0.004 * n, Math.sin(n) * 0.004 * n]
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:34px;height:44px;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">
          <div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#1B6CA8,#2193b0);border:2.5px solid #fff;"></div>
          <div style="position:absolute;top:5px;left:0;width:34px;height:28px;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;">🏠</div>
        </div>`,
        iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -40],
      })
      const m = L.marker([p.lat + jitter[0], p.lng + jitter[1]], { icon }).addTo(layer)
      m.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:150px">
          <div style="font-weight:800;font-size:13px;color:#1a1a1a">${escapeHtml(p.title)}</div>
          <div style="font-size:11px;color:#666;margin:2px 0">${escapeHtml(p.location)}</div>
          <div style="font-weight:800;font-size:13px;color:#FF4500">${escapeHtml(p.price)}</div>
          <a href="/listings/${p.id}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:800;color:#FF4500">View property ›</a>
        </div>`,
      )
      markers.push(m)
    }

    if (centre) map.setView(centre, radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 25 ? 11 : 10)
    else if (markers.length === 1) map.setView(markers[0].getLatLng(), 13)
    else if (markers.length > 1) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2))
  }, [points, centre, radiusKm])

  return <div ref={elRef} style={{ width: '100%', height: 420, borderRadius: 14, overflow: 'hidden', border: '1px solid #ece3d7', zIndex: 0 }} />
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
