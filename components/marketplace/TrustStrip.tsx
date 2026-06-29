'use client'
import { usePanel } from '@/context/PanelContext'

const footerLinks = [
  { icon: 'ℹ️', label: 'About Us', key: 'about' },
  { icon: '⭐', label: 'Why Us?', key: 'why' },
  { icon: '✉️', label: 'Contact Us', key: 'contact' },
  { icon: '💬', label: 'Help Centre', key: 'help' },
  { icon: '📄', label: 'Terms', key: 'terms' },
  { icon: '🏷️', label: 'Pricing', key: 'pricing' },
  { icon: '🚚', label: 'Delivery', key: 'collection' },
  { icon: '🛡️', label: 'Scam Centre', key: 'scams' },
  { icon: '🪙', label: 'Economic Living', key: 'economic' },
  { icon: '✅', label: "Dos & Don'ts", key: 'policy' },
  { icon: '💡', label: 'Suggest Ideas', key: 'suggest' },
  { icon: '🕘', label: 'Recently viewed', key: 'recent' },
]

export default function TrustStrip() {
  const { openPanel } = usePanel()

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
            <button
              key={link.label}
              onClick={() => link.key === 'recent' ? openPanel('justlisted') : openPanel('footer', { key: link.key })}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                background: '#fff', border: '1px solid #F0E0D0', borderRadius: 14,
                padding: '11px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11,
                fontWeight: 800, color: '#444', cursor: 'pointer', textAlign: 'left',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{link.icon}</span>
              {link.label}
            </button>
          ))}
          <button
            onClick={() => window.location.href = '/admin'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              background: '#fff', border: '1px solid #F0E0D0', borderRadius: 14,
              padding: '11px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11,
              fontWeight: 800, color: '#444', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)', gridColumn: '1 / -1',
            }}
          >
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
