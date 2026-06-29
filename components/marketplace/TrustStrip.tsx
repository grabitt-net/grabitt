const footerLinks = [
  { icon: 'ℹ️', label: 'About Us' },
  { icon: '⭐', label: 'Why Us?' },
  { icon: '✉️', label: 'Contact Us' },
  { icon: '💬', label: 'Help Centre' },
  { icon: '📄', label: 'Terms' },
  { icon: '🏷️', label: 'Pricing' },
  { icon: '🚚', label: 'Delivery' },
  { icon: '🛡️', label: 'Scam Centre' },
  { icon: '🪙', label: 'Economic Living' },
  { icon: '✅', label: "Dos & Don'ts" },
  { icon: '💡', label: 'Suggest Ideas' },
  { icon: '🕘', label: 'Recently viewed' },
]

export default function TrustStrip() {
  return (
    <section style={{ margin: '0 14px 14px' }}>
      <div style={{
        background: 'linear-gradient(180deg,#fff,#FFF8F3)',
        border: '2px solid #FFD9B8', borderRadius: 18,
        padding: '16px 14px', boxShadow: '0 3px 14px rgba(255,140,0,0.10)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 18, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>
            <span style={{ color: 'var(--orange)' }}>Grabitt!</span>
          </div>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 10, color: '#7a6a55', fontWeight: 700, marginTop: 3 }}>
            Your Local Everything!
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {footerLinks.map(link => (
            <button key={link.label} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              background: '#fff', border: '1px solid #F0E0D0', borderRadius: 14,
              padding: '11px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11,
              fontWeight: 800, color: '#444', cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{link.icon}</span>
              {link.label}
            </button>
          ))}
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            background: '#fff', border: '1px solid #F0E0D0', borderRadius: 14,
            padding: '11px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11,
            fontWeight: 800, color: '#444', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', gridColumn: '1 / -1',
          }}>
            <span style={{ fontSize: 16 }}>🧠</span>
            Executive Suite
          </button>
        </div>
        <div style={{ marginTop: 14, fontSize: 10, color: '#777', fontFamily: 'var(--font-nunito)', textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
          © 2026 Grabitt · Canary Islands · All rights reserved
        </div>
      </div>
    </section>
  )
}
