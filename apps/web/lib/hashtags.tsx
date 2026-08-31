import React from 'react'
import Link from 'next/link'

// Render plain text with #hashtags turned into links to the unified /tag page.
// A hashtag is `#word` (letters/numbers/underscore, 2–30 chars). Everything else
// is preserved verbatim, including line breaks (the caller sets white-space).
const HASHTAG = /#([\p{L}\p{N}_]{2,30})/gu

// Render a CMS article body. New posts are HTML (from the rich-text editor);
// legacy posts are plain text. HTML is lightly sanitised (script/style/on*/js:
// stripped — authors are exec-only) and hashtags in its text are linkified.
const HTMLISH = /<\/?[a-z][\s\S]*>/i
export function renderArticleBody(body: string | null | undefined): React.ReactNode {
  if (!body) return null
  if (!HTMLISH.test(body)) {
    return <div className="article-body" style={{ whiteSpace: 'pre-wrap' }}>{renderWithHashtags(body)}</div>
  }
  const safe = body
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .split(/(<[^>]+>)/)
    .map((seg, i) => (i % 2 === 1 ? seg : seg.replace(HASHTAG, (_m, w) => `<a href="/tag/${encodeURIComponent(String(w).toLowerCase())}">#${w}</a>`)))
    .join('')
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: safe }} />
}

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
