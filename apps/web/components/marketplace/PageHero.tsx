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
    // Same centred footprint as the News page header (InfoPage): max-width 1000,
    // centred with side gutters — NOT full-bleed — so every category/section hero
    // is the same size as the News header, and the paid banner beneath it (also
    // constrained to this width) lines up to a matching height.
    <div style={{ maxWidth: 1000, margin: '18px auto 6px', padding: '0 18px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 24px)',
        background: 'linear-gradient(135deg, var(--sand) 0%, #FFE9DC 100%)',
        border: '1px solid var(--sand2)', borderRadius: 20,
        // Compacted so the hero reads as the same tidy height as the News header.
        padding: 'clamp(12px, 2.2vw, 20px) clamp(16px, 3.2vw, 30px)',
        boxShadow: '0 6px 22px rgba(245,84,10,0.10)',
      }}>
        {bg && (
          <>
            {/* Faint tile artwork filling the header, with a light wash over it so
                the title, tagline and icon stay clearly readable. */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.45 }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,245,238,0.62), rgba(255,233,220,0.5))' }} />
          </>
        )}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 'clamp(19px, 3.6vw, 27px)', fontWeight: 700, color: 'var(--dark)', lineHeight: 1.1, margin: 0 }}>{title}</h1>
          {tagline && <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 'clamp(12px, 1.8vw, 15px)', fontWeight: 700, color: 'var(--terra)', marginTop: 4 }}>{tagline}</div>}
          {body && <p style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, lineHeight: 1.4, color: 'var(--ink-2)', margin: '4px 0 0', maxWidth: 620 }}>{body}</p>}
        </div>
        {image && (
          <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, width: 'clamp(78px, 15vw, 116px)', aspectRatio: '1 / 1', borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 8px 22px rgba(15,23,42,0.16)' }}>
            <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
      </div>
    </div>
  )
}
