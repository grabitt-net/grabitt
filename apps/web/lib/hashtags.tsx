import React from 'react'
import Link from 'next/link'

// Render plain text with #hashtags turned into links to the unified /tag page.
// A hashtag is `#word` (letters/numbers/underscore, 2–30 chars). Everything else
// is preserved verbatim, including line breaks (the caller sets white-space).
const HASHTAG = /#([\p{L}\p{N}_]{2,30})/gu

export function renderWithHashtags(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? null
  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  HASHTAG.lastIndex = 0
  let i = 0
  while ((m = HASHTAG.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tag = m[1].toLowerCase()
    out.push(
      <Link
        key={`h${i++}`}
        href={`/tag/${encodeURIComponent(tag)}`}
        style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}
      >{m[0]}</Link>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
