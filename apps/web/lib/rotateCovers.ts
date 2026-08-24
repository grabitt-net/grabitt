// Cycle the cover among the first 3 photos (the designated front covers),
// leaving the rest of the gallery in place. [a,b,c,...rest] -> [b,c,a,...rest].
// Used by the weekly refresh + relist crons to keep listings looking fresh.
export function rotateCovers(images: string[]): string[] {
  if (!Array.isArray(images)) return images
  if (images.length >= 3) return [images[1], images[2], images[0], ...images.slice(3)]
  if (images.length > 1) return [...images.slice(1), images[0]]
  return images
}
