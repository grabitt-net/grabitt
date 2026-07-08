'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GC_CENTER } from '@/lib/gcGeo'

export type JobPoint = { id: string; title: string; salary: string; company: string; location: string; lat: number; lng: number }

// Live job map (Leaflet + OpenStreetMap, no API key). Plots a pin per job;
// clicking a pin shows the job with a link to its listing. Pins at the same
// town are nudged slightly so they don't fully overlap.
export default function JobsMap({ points }: { points: JobPoint[] }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView(GC_CENTER, 10)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18,
    }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (points.length === 0) return

    const seen = new Map<string, number>()
    const markers: L.Marker[] = []
    for (const p of points) {
      const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
      const n = seen.get(key) ?? 0
      seen.set(key, n + 1)
      // spiral-ish nudge for overlapping pins
      const jitter = n === 0 ? [0, 0] : [Math.cos(n) * 0.004 * n, Math.sin(n) * 0.004 * n]
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:26px;height:26px;transform:translate(-50%,-100%);display:flex;align-items:center;justify-content:center;font-size:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">📍</div>`,
        iconSize: [26, 26], iconAnchor: [13, 26],
      })
      const m = L.marker([p.lat + jitter[0], p.lng + jitter[1]], { icon }).addTo(layer)
      m.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:150px">
          <div style="font-weight:800;font-size:13px;color:#1a1a1a">${escapeHtml(p.title)}</div>
          <div style="font-size:11px;color:#666;margin:2px 0">${escapeHtml(p.company)} · ${escapeHtml(p.location)}</div>
          <div style="font-weight:800;font-size:13px;color:#FF4500">${escapeHtml(p.salary)}</div>
          <a href="/listings/${p.id}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:800;color:#FF4500">View job ›</a>
        </div>`,
      )
      markers.push(m)
    }
    if (markers.length === 1) map.setView(markers[0].getLatLng(), 13)
    else map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2))
  }, [points])

  return <div ref={elRef} style={{ width: '100%', height: 380, borderRadius: 14, overflow: 'hidden', border: '1px solid #ece3d7', zIndex: 0 }} />
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
