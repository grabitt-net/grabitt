'use client'
import { useRef, useState } from 'react'
import { compressAndUpload, cmsImagePath } from '@/lib/storage'

// Reusable image picker for the homepage builder / banners. Upload a file
// (compressed + stored in Supabase, §10.2) and it fills in the URL — no need to
// paste a link. A URL field is still offered as a fallback.
export default function ImageUploadField({
  value, onChange, label, kind = 'homepage', hint,
}: {
  value: string
  onChange: (url: string) => void
  label: string
  kind?: string
  hint?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showUrl, setShowUrl] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    setError(''); setUploading(true)
    try {
      const url = await compressAndUpload(file, cmsImagePath(kind))
      onChange(url)
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label style={labelStyle}>{label}</label>

      {value ? (
        <div style={{ position: 'relative', marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
          <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => fileRef.current?.click()} style={overlayBtn}>Replace</button>
            <button type="button" onClick={() => onChange('')} style={{ ...overlayBtn, color: '#ef4444' }}>Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%', border: '1.5px dashed #d8c9b4', background: '#fffdf9', borderRadius: 10,
            padding: '18px 12px', cursor: uploading ? 'default' : 'pointer', color: '#8a7a63',
            fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, marginBottom: 6,
          }}
        >
          {uploading ? 'Uploading…' : '⬆️  Upload an image'}
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

      {hint && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#b3a48c', marginBottom: 4 }}>{hint}</div>}
      {error && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#c0392b', marginBottom: 4 }}>{error}</div>}

      <button type="button" onClick={() => setShowUrl(v => !v)} style={{ background: 'none', border: 'none', color: '#b0a189', fontFamily: 'var(--font-ui)', fontSize: 10, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
        {showUrl ? 'Hide URL field' : 'Or paste an image URL'}
      </button>
      {showUrl && (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://…"
          style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 12.5, boxSizing: 'border-box', marginTop: 4 }}
        />
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }
const overlayBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer', color: '#555' }
