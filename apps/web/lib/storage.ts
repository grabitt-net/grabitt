import { createClient } from './supabase'

const MAX_DIM = 1200
const JPEG_QUALITY = 0.82
export const PHOTOS_BUCKET = 'photos'

/**
 * Compresses `file` to max 1200px on the longest edge (client-side, Canvas API),
 * then uploads to Supabase Storage. Returns the public URL.
 * Photo compression MUST happen before upload — §10.2 security rule.
 */
export async function compressAndUpload(file: File, path: string): Promise<string> {
  const blob = await compressImage(file)
  const client = createClient()

  const { error } = await client.storage
    .from(PHOTOS_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = client.storage.from(PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Generates a storage path for a listing photo.
 * Pattern: listings/{listingId}/{uuid}.jpg
 */
export function listingPhotoPath(listingId: string): string {
  const uuid = crypto.randomUUID()
  return `listings/${listingId}/${uuid}.jpg`
}

/**
 * Generates a storage path for a CMS/homepage image (hero slides, banners).
 * Pattern: cms/{kind}/{uuid}.jpg
 */
export function cmsImagePath(kind: string): string {
  const uuid = crypto.randomUUID()
  return `cms/${kind}/${uuid}.jpg`
}

/**
 * Uploads a candidate CV (PDF/DOC/DOCX) to Supabase Storage and returns the
 * public URL. Max 5 MB. Stored under an unguessable path so it's not listable.
 */
export async function uploadCv(file: File, userId: string): Promise<string> {
  const okTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!okTypes.includes(file.type)) throw new Error('CV must be a PDF or Word document')
  if (file.size > 5 * 1024 * 1024) throw new Error('CV must be under 5 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const path = `cvs/${userId}/${crypto.randomUUID()}.${ext}`
  const client = createClient()
  const { error } = await client.storage.from(PHOTOS_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`CV upload failed: ${error.message}`)
  const { data } = client.storage.from(PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const scale = Math.min(1, MAX_DIM / Math.max(width, height))
      const w = Math.round(width * scale)
      const h = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas unavailable')); return }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        JPEG_QUALITY,
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}
