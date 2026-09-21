'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Read-only location map for a single business directory listing (Leaflet +
// OpenStreetMap, no API key). Drops one pin at the business coords.
export default function DirectoryMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView([lat, lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map)
    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:34px;height:44px;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">
        <div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#f5540a,#ff8a3d);border:2.5px solid #fff;"></div>
        <div style="position:absolute;top:5px;left:0;width:34px;height:28px;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;">🏢</div>
      </div>`,
      iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -40],
    })
    L.marker([lat, lng], { icon }).addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [lat, lng, name])

  return <div ref={elRef} style={{ width: '100%', height: 240, borderRadius: 12, overflow: 'hidden', border: '1px solid #ece3d7' }} />
}
