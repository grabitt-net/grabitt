// Pre-launch holding page shown to the public while MAINTENANCE_MODE is on.
// No data fetching, no chrome — just a branded "coming soon" message. Admins and
// preview-secret holders never see this (the middleware lets them through).
export const metadata = {
  title: 'Grabitt — Coming Soon',
  description: 'Grabitt is launching soon in Gran Canaria.',
}

export default function ComingSoon() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#FF4500,#FF7A00)', padding: 24, fontFamily: 'Nunito, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 440, width: '100%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 24, padding: '40px 28px', textAlign: 'center', backdropFilter: 'blur(6px)' }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🛒</div>
        <h1 style={{ fontFamily: 'Comfortaa, system-ui, sans-serif', fontSize: 34, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>Grabitt</h1>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Launching soon in Gran Canaria</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.92)', margin: 0 }}>
          Buy, sell, hire and discover — local to the Canaries. We&apos;re putting the finishing touches in place. Check back very soon.
        </p>
      </div>
    </main>
  )
}
