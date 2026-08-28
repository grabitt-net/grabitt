// Hashtag extraction shared across items and news. A hashtag is `#word` where
// word is letters/numbers/underscore (2–30 chars). Returned lowercased, without
// the leading #, deduped — ready to store in a `tags` array for search.
export function extractHashtags(...texts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const text of texts) {
    if (!text) continue
    const matches = text.match(/#([\p{L}\p{N}_]{2,30})/gu) ?? []
    for (const m of matches) {
      const tag = m.slice(1).toLowerCase()
      if (!seen.has(tag)) { seen.add(tag); out.push(tag) }
    }
  }
  return out
}
