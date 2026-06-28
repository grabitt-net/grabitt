export default function TrustStrip() {
  const items = [
    { icon: '🔒', title: 'Secure Payments', desc: 'Funds held in escrow until delivery confirmed' },
    { icon: '✅', title: 'Verified Sellers', desc: 'ID-checked members with ratings' },
    { icon: '🛡️', title: 'Buyer Protection', desc: 'Full refund if item not as described' },
    { icon: '📞', title: '7-Day Support', desc: 'Local team, real people, fast responses' },
  ]

  return (
    <section style={{
      margin: '10px 12px 0',
      background: 'var(--dark)',
      borderRadius: 20,
      padding: '18px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h3 style={{
        fontFamily: 'Georgia, serif', fontSize: 18, color: '#fff', fontWeight: 700,
      }}>
        Why Grabitt?
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
              <strong style={{ color: '#fff', display: 'block', fontSize: 11, marginBottom: 1 }}>{item.title}</strong>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
