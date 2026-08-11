// Pre-launch holding page shown to the public while MAINTENANCE_MODE is on.
// No data fetching, no chrome — just a branded "coming soon" message. Admins and
// preview-secret holders never see this (the middleware lets them through).
//
// This deliberately mirrors the holding page that was live on grabitt.net before
// the Vercel cut-over: cream background, two faint orange blobs, the Grabitt
// wordmark, and the "Exciting things coming soon" line, so the switch-over is
// visually seamless.
export const metadata = {
  title: 'Grabitt — Coming Soon',
  description: 'Grabitt is launching soon in Gran Canaria.',
}

const ACCENT = 'rgb(243, 113, 33)'

export default function ComingSoon() {
  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#FFF9F4',
        padding: 24,
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Faint decorative blobs — 7% orange, exactly as on the previous site */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: -200, left: -200, width: 600, height: 600,
          borderRadius: '50%', background: ACCENT, opacity: 0.07, pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', bottom: -150, right: -100, width: 400, height: 400,
          borderRadius: '50%', background: ACCENT, opacity: 0.07, pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', textAlign: 'center', maxWidth: 460, width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/grabitt-logo.png"
          alt="Grabitt"
          width={260}
          style={{ width: 260, maxWidth: '80%', height: 'auto', margin: '0 auto 28px' }}
        />
        <h1
          style={{
            fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px',
            color: 'rgb(58, 58, 60)', margin: '0 0 12px', lineHeight: 1.2,
          }}
        >
          Exciting things <span style={{ color: ACCENT }}>coming soon</span>
        </h1>
        <p style={{ fontSize: 16, color: 'rgb(107, 107, 109)', margin: 0 }}>
          We&apos;re putting the finishing touches on something great.
        </p>
        <div
          style={{ width: 140, height: 6, borderRadius: 6, background: ACCENT, margin: '28px auto 0' }}
        />
      </div>
    </main>
  )
}
