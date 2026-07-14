'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GC_CENTER } from '@/lib/gcGeo'

// Drag-a-pin location picker (Leaflet + OpenStreetMap, no API key). Click the map
// or drag the marker to set the exact location; reports lat/lng via onChange.
export default function MapPicker({ value, onChange, height = 260 }: {
  value?: { lat: number; lng: number } | null
  onChange: (c: { lat: number; lng: number }) => void
  height?: number
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const start: [number, number] = value ? [value.lat, value.lng] : GC_CENTER
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView(start, value ? 14 : 10)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map)
    mapRef.current = map

    const icon = L.divIcon({ className: '', html: '<div style="width:28px;height:28px;transform:translate(-50%,-100%);font-size:24px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">📍</div>', iconSize: [28, 28], iconAnchor: [14, 28] })
    const place = (lat: number, lng: number, fire: boolean) => {
      if (markerRef.current) markerRef.current.setLatLng([lat, lng])
      else {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
        markerRef.current.on('dragend', () => { const p = markerRef.current!.getLatLng(); onChangeRef.current({ lat: p.lat, lng: p.lng }) })
      }
      if (fire) onChangeRef.current({ lat, lng })
    }
    if (value) place(value.lat, value.lng, false)
    map.on('click', (e: L.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng, true))

    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={elRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #ece3d7', zIndex: 0 }} />
}
