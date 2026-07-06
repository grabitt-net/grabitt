import { decode } from 'base64-arraybuffer'
import { supabase } from './supabase'

const BUCKET = 'photos'

// Uploads a picked image (base64) to Supabase Storage; returns the public URL.
export async function uploadListingPhoto(base64: string): Promise<string> {
  const path = `listings/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
    contentType: 'image/jpeg', upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
