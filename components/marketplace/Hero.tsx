import Link from 'next/link'

export default function Hero() {
  return (
    <section style={{
      margin: '14px 12px 0',
      borderRadius: 24,
      background: 'linear-gradient(135deg, #C1440E 0%, #FF4500 50%, #FF7A00 100%)',
      padding: '28px 20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.18)', borderRadius: 50,
        padding: '4px 12px', fontSize: 11, fontWeight: 700,
        color: 'rgba(255,255,255,0.9)', marginBottom: 10, letterSpacing: 0.5,
      }}>
        🌴 Gran Canaria&apos;s #1 Marketplace
      </div>

      <h1 style={{
        fontFamily: 'Georgia, serif',
        fontSize: 30, fontWeight: 900,
        color: '#fff', lineHeight: 1.15, marginBottom: 8,
      }}>
        Buy, Sell &amp;<br />Discover Locally
      </h1>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 18 }}>
        From handmade crafts to professional services — everything Gran Canaria has to offer.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <Link href="/listings/new" style={{ flex: 1, textDecoration: 'none' }}>
          <button style={{
            width: '100%', background: '#fff', color: 'var(--orange)',
            border: 'none', borderRadius: 50, padding: '11px 22px',
            fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
          }}>
            Start Selling
          </button>
        </Link>
        <Link href="/listings" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 50,
            padding: '11px 18px', fontFamily: 'var(--font-nunito)',
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>
            Browse
          </button>
        </Link>
      </div>

      <div style={{
        display: 'flex', gap: 0, marginTop: 18, paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.2)',
      }}>
        {[
          { num: '2,400+', lbl: 'Listings' },
          { num: '840+', lbl: 'Sellers' },
          { num: '4.8★', lbl: 'Avg Rating' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.2)' : undefined,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{s.num}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
