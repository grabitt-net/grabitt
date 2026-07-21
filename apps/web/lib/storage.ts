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

export const CVS_BUCKET = 'cvs'
export const DISPUTE_BUCKET = 'dispute-evidence'

/**
 * Uploads a dispute evidence photo to the PRIVATE `dispute-evidence` bucket.
 * Evidence often includes receipts and correspondence, so it is not public.
 * Returns the storage path (stored on the dispute) plus a short-lived signed
 * URL so the uploader can preview it. The other party and admins read it via
 * /api/dispute-evidence, which authorises server-side.
 */
export async function uploadDisputeEvidence(file: File, userId: string): Promise<{ path: string; previewUrl: string | null }> {
  if (!file.type.startsWith('image/')) throw new Error('Evidence must be an image')
  if (file.size > 10 * 1024 * 1024) throw new Error('Each photo must be under 10 MB')

  // Reuse the listing-photo compressor: evidence only needs to be legible.
  const blob = await compressImage(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const client = createClient()
  const { error } = await client.storage.from(DISPUTE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  const { data } = await client.storage.from(DISPUTE_BUCKET).createSignedUrl(path, 600)
  return { path, previewUrl: data?.signedUrl ?? null }
}

/**
 * Uploads a candidate CV (PDF/DOC/DOCX) to the PRIVATE `cvs` bucket. Returns the
 * storage path (stored on the application) plus a short-lived signed URL for the
 * uploader's own preview. Employers view CVs via the /api/cv route, which mints
 * a signed URL after authorising the request server-side. Max 5 MB.
 */
export async function uploadCv(file: File, userId: string): Promise<{ path: string; previewUrl: string | null }> {
  const okTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!okTypes.includes(file.type)) throw new Error('CV must be a PDF or Word document')
  if (file.size > 5 * 1024 * 1024) throw new Error('CV must be under 5 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const client = createClient()
  const { error } = await client.storage.from(CVS_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`CV upload failed: ${error.message}`)
  // Owner-only signed URL for an immediate preview (RLS lets the owner read).
  const { data } = await client.storage.from(CVS_BUCKET).createSignedUrl(path, 600)
  return { path, previewUrl: data?.signedUrl ?? null }
}

export const VERIFICATION_BUCKET = 'verification'

/**
 * Uploads an ID or proof-of-address document (image or PDF) to the PRIVATE
 * `verification` bucket. Returns the storage path, which the caller records via
 * users.submitVerificationDoc. Admins review it through /api/verification-doc,
 * which authorises the request and mints a signed URL. Max 8 MB.
 */
export async function uploadVerificationDoc(file: File, userId: string, kind: 'id' | 'address'): Promise<string> {
  const okTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
  if (!okTypes.includes(file.type)) throw new Error('Upload a photo (JPG/PNG) or PDF')
  if (file.size > 8 * 1024 * 1024) throw new Error('File must be under 8 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`
  const client = createClient()
  const { error } = await client.storage.from(VERIFICATION_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
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
