import React from 'react'

// A bespoke, aspirational hero used ONLY on the Home & Garden category page
// (for review). Full-bleed lifestyle image on the right that fades into a warm
// botanical gradient, an eyebrow label, a big editorial headline, supporting
// copy and a row of trust chips. Self-contained — no external assets beyond the
// category artwork already in /public.
export default function HomeGardenHero({ image }: { image?: string | null }) {
  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 24,
          minHeight: 'clamp(230px, 33vw, 300px)',
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #e6ddcf',
          boxShadow: '0 12px 34px rgba(31,79,45,0.16)',
          background:
            'radial-gradient(120% 140% at 100% 0%, #dff0dd 0%, rgba(223,240,221,0) 46%),' +
            'linear-gradient(135deg, #fbf3ea 0%, #f3ead9 46%, #e9f2df 100%)',
        }}
      >
        {/* Full-height lifestyle image bleeding off the right, softly masked so it
            melts into the gradient rather than sitting in a hard box. */}
        {image && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '0 0 0 auto',
              width: 'clamp(150px, 46%, 460px)',
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 34%)',
              maskImage: 'linear-gradient(90deg, transparent 0%, #000 34%)',
            }}
          />
        )}

        {/* Soft colour blooms for depth. */}
        <div aria-hidden style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,170,90,0.20), transparent 70%)', filter: 'blur(6px)' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: -70, left: '30%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,84,10,0.10), transparent 70%)', filter: 'blur(8px)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(20px, 3.4vw, 40px)', maxWidth: 'min(60%, 540px)' }}>
          <span
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-nunito)',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              color: '#2f6d3b',
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(47,109,59,0.22)',
              borderRadius: 999,
              padding: '5px 12px',
              marginBottom: 14,
            }}
          >
            🌿 Home &amp; Garden
          </span>

          <h1
            style={{
              fontFamily: 'var(--font-comfortaa)',
              fontSize: 'clamp(26px, 4.6vw, 42px)',
              fontWeight: 700,
              lineHeight: 1.08,
              color: '#20321f',
              margin: 0,
              textShadow: '0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            Make every room feel<br />like a fresh start.
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-nunito)',
              fontSize: 'clamp(13px, 1.5vw, 15.5px)',
              lineHeight: 1.55,
              fontWeight: 600,
              color: '#4a4335',
              margin: '12px 0 0',
              maxWidth: 440,
            }}
          >
            From statement sofas to sun-loving plants — discover pre-loved treasures
            from sellers across the Canary Islands, and turn the pieces you&apos;ve
            outgrown into someone else&apos;s perfect find.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {['Island-wide sellers', 'Pre-loved &amp; unique', 'Save up to 70%'].map(t => (
              <span
                key={t}
                style={{
                  fontFamily: 'var(--font-nunito)',
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: '#2f6d3b',
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px solid rgba(47,109,59,0.2)',
                  borderRadius: 999,
                  padding: '6px 12px',
                }}
                dangerouslySetInnerHTML={{ __html: `<span style="color:#7bad5a">●</span>&nbsp;${t}` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
