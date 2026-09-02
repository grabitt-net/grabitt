import React from 'react'

// Full-width category/section hero: title + tagline + blurb beside the round
// artwork (shown whole, never cropped). Used on category, Recruitment and
// Property pages so they share one look. Sits directly below the Grabitt NOW
// button, with the paid banner placements rendered beneath it.
export default function PageHero({ title, tagline, body, image, bg }: {
  title: string
  tagline?: string
  body?: string
  image?: string | null
  // Optional artwork used as a faint background behind the header. The layout is
  // unchanged (text left, round icon right) — only the background changes.
  bg?: string | null
}) {
  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 'clamp(14px, 3.5vw, 30px)',
        background: 'linear-gradient(135deg, var(--sand) 0%, #FFE9DC 100%)',
        border: '1px solid var(--sand2)', borderRadius: 20,
        padding: 'clamp(16px, 3.2vw, 26px) clamp(18px, 3.6vw, 30px)',
        boxShadow: '0 6px 22px rgba(245,84,10,0.10)',
      }}>
        {bg && (
          <>
            {/* Faint tile artwork filling the header, with a light wash over it so
                the title, tagline and icon stay clearly readable. */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18 }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,245,238,0.78), rgba(255,233,220,0.7))' }} />
          </>
        )}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 'clamp(22px, 4.4vw, 34px)', fontWeight: 700, color: 'var(--dark)', lineHeight: 1.12, margin: 0 }}>{title}</h1>
          {tagline && <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 'clamp(13px, 2vw, 16px)', fontWeight: 700, color: 'var(--terra)', marginTop: 6 }}>{tagline}</div>}
          {body && <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)', margin: '6px 0 0', maxWidth: 620 }}>{body}</p>}
        </div>
        {image && (
          <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, width: 'clamp(88px, 22vw, 150px)', aspectRatio: '1 / 1', borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 8px 22px rgba(15,23,42,0.16)' }}>
            <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
      </div>
    </div>
  )
}
