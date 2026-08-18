// Sponsorship & advertising packages. Shared so the exact same content renders
// both in the advertise panel and inline on the For Business page (/employers),
// where it needs to be prominent rather than hidden behind a link.

const PACKAGES = [
  { name: '🥇 Headline Sponsor', price: '€299/month', desc: 'Your brand on the homepage hero + a Featured Partner badge across Grabitt.' },
  { name: '🤝 Department Sponsor', price: '€149/month', desc: 'Own a department page (e.g. Motors, Property) with your banner + badge.' },
  { name: '⭐ Featured Partner', price: '€79/month', desc: 'Listed on the Sponsors & Partners page with logo, blurb and link.' },
]
const ADDONS = [
  { name: '⭐ Featured Listing', price: '€1.99/week', desc: 'Boost visibility in search & department pages' },
  { name: '🏷️ Banner Ad (300×600)', price: '€49/month', desc: 'Sidebar slot on department and search panels' },
  { name: '📧 Eshot Campaign', price: '€99/blast', desc: 'Direct email to opted-in members in your area' },
]

// `showIntro` adds the hero heading (used in the panel). Inline on a page the
// section already has its own heading, so it's turned off there.
export default function SponsorshipContent({ showIntro = true }: { showIntro?: boolean }) {
  return (
    <div>
      {showIntro && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🤝</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>Sponsor Grabitt &amp; reach the island</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Thousands of daily active buyers across the Canary Islands</div>
        </div>
      )}

      <div style={sectionLabel}>Sponsorship packages</div>
      {PACKAGES.map((p, i) => (
        <div key={i} style={{ background: '#fff', border: '2px solid #FFD9B8', borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div style={rowTop}>
            <div style={name}>{p.name}</div>
            <div style={price}>{p.price}</div>
          </div>
          <div style={desc}>{p.desc}</div>
        </div>
      ))}

      <div style={{ ...sectionLabel, margin: '18px 0 8px' }}>Advertising add-ons</div>
      {ADDONS.map((p, i) => (
        <div key={i} style={{ background: '#fff', border: '1.5px solid #e8e0d5', borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div style={rowTop}>
            <div style={name}>{p.name}</div>
            <div style={price}>{p.price}</div>
          </div>
          <div style={desc}>{p.desc}</div>
        </div>
      ))}

      <a href="mailto:ads@grabitt.net?subject=Grabitt%20Sponsorship%20enquiry" style={{ display: 'block', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none', width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 6 }}>Enquire about sponsorship →</a>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', textAlign: 'center', marginTop: 8 }}>
        Our team will confirm availability and set you up: ads@grabitt.net
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }
const rowTop: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }
const name: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }
const price: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--orange)' }
const desc: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }
