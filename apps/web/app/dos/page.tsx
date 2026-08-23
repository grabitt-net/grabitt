import InfoPage from '@/components/marketplace/InfoPage'

export const metadata = { title: "Dos & Don'ts — Grabitt" }

// Footer → Help & guides → Dos & Don'ts (item 19). Content carried over from the
// old policy panel; redesigned into a clean two-side Do / Don't card layout in
// the hub/dashboard style.

const DOS = [
  'Be honest and accurate in your listings and messages.',
  'Keep chat, payments and arrangements on Grabitt — it protects you.',
  'Treat everyone with respect and patience.',
  "Inspect items at handover and confirm only when you're happy.",
  'Report anything that feels off — fakes, scams or rude behaviour.',
]
const DONTS = [
  "Don't share or ask for personal contact details before a purchase.",
  "Don't list fakes, replicas or anything illegal.",
  "Don't try to dodge fees by taking deals off-platform.",
  "Don't pressure, harass or abuse other members.",
]
const ZERO = ['Disrespect & harassment', 'Scams & fraud', 'Fakes & counterfeits', 'Abuse or threats', 'Circumventing Grabitt fees', 'Anything that endangers a child']
const SAFE: string[] = [
  'Meet in a busy public place in daylight — cafés, shopping centres, petrol stations.',
  'Women and younger members: never go to a private address alone — take someone with you.',
  "Keep your phone charged and tell someone where you're going and when.",
  'Trust your instincts — if it feels wrong, walk away. No deal is worth your safety.',
  'Use the QR handover at collection so the transaction is confirmed and protected.',
]

const cardBase: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 18, padding: 'clamp(16px, 2.6vw, 24px)', boxShadow: '0 4px 18px rgba(30,43,85,0.05)' }
const cardTitle = (color: string): React.CSSProperties => ({ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 900, color, margin: '0 0 12px' })

function Row({ mark, color, children }: { mark: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f5f0e8' }}>
      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, marginTop: 1 }}>{mark}</span>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, lineHeight: 1.55, color: '#2a2a2a' }}>{children}</span>
    </div>
  )
}

export default function DosPage() {
  return (
    <InfoPage
      title="Dos & Don'ts"
      topbarTitle="Dos & Don'ts"
      intro="Grabitt works because we look after each other. Please keep it friendly, honest and safe."
      pills={['Be honest', 'Stay on-platform', 'Respect others', 'Meet safely']}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(14px, 3vw, 24px)' }}>
        <div style={cardBase}>
          <h2 style={cardTitle('#16a34a')}>✓ Do</h2>
          {DOS.map(d => <Row key={d} mark="✓" color="#22c55e">{d}</Row>)}
        </div>
        <div style={cardBase}>
          <h2 style={cardTitle('#ef4444')}>✕ Don't</h2>
          {DONTS.map(d => <Row key={d} mark="✕" color="#ef4444">{d}</Row>)}
        </div>
      </div>

      {/* Zero tolerance */}
      <div style={{ ...cardBase, background: '#fff5f5', border: '1px solid #fecaca', marginTop: 18 }}>
        <h2 style={cardTitle('#b91c1c')}>🚫 Zero tolerance</h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, color: '#991b1b', lineHeight: 1.6, margin: '0 0 12px' }}>The following lead to immediate removal and a permanent ban — and may be reported to authorities:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ZERO.map(z => <span key={z} style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 999 }}>{z}</span>)}
        </div>
      </div>

      {/* Meeting up safely */}
      <div style={{ ...cardBase, background: '#eff6ff', border: '1px solid #dbeafe', marginTop: 18 }}>
        <h2 style={cardTitle('#2563eb')}>🤝 Meeting up safely</h2>
        {SAFE.map(s => <Row key={s} mark="✓" color="#3b82f6">{s}</Row>)}
      </div>
    </InfoPage>
  )
}
