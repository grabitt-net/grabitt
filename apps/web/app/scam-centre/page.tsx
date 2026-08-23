import InfoPage, { Band } from '@/components/marketplace/InfoPage'

export const metadata = { title: 'Scam Centre — Grabitt' }

// Footer → Safety & trust → Scam Centre (item 10). Redesigned onto the standard
// template with a full content rewrite. NOTE: draft copy for Steve to review.

const cardBase: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 18, padding: 'clamp(16px, 2.6vw, 24px)', boxShadow: '0 4px 18px rgba(30,43,85,0.05)' }

const SCAMS: [string, string, string][] = [
  ['🔗', 'Move off-platform', "'Let's chat on WhatsApp instead' or 'pay by bank transfer to save fees.' Moving off Grabitt removes every protection — that's exactly why they ask. Keep chat, payment and handover on Grabitt."],
  ['💸', 'Overpayment trick', "A buyer 'accidentally' overpays and asks you to refund the difference. Their original payment later bounces and you're left out of pocket. Never refund an overpayment — Grabitt handles all payments."],
  ['🧾', 'Fake payment proof', "A screenshot or email 'proving' they've paid. Only ever trust money you can see confirmed in your own Grabitt transaction — never a screenshot."],
  ['🎁', 'Too good to be true', "A brand-new phone for a fraction of its price, luxury goods dirt cheap. If a deal looks unreal, it's bait. Slow down and check."],
  ['🏷️', 'Fakes & replicas', "Counterfeit trainers, bags, watches and electronics sold as genuine. Check brand details, ask for proof of purchase, and report anything suspicious — selling fakes as real is fraud and banned on Grabitt."],
  ['🎣', 'Phishing messages', "Fake emails or texts posing as Grabitt, your bank or a courier, asking you to 'confirm details' or click a link. Don't click — open the official app or site directly."],
]

export default function ScamCentrePage() {
  return (
    <InfoPage
      title="Scam Centre"
      topbarTitle="Scam Centre"
      intro="Most scams rely on one thing: getting you off Grabitt and around our protections. Learn the common tricks, spot them early, and stay safe."
      pills={['Spot the tricks', 'Stay on-platform', 'Protected payments', 'Report fast']}
    >
      <Band heading="How Grabitt keeps you safe">
        Grabitt is built to make scams hard. Payments are held securely via <strong>Stripe</strong> until you scan to confirm you&apos;ve received your item, handovers are verified with a transaction code, and every member carries a rating. As long as you keep everything on Grabitt, the protections work for you. Scammers know this — so their whole game is talking you out of the safe path.
      </Band>

      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 900, color: 'var(--dark)', margin: '18px 0 12px', textAlign: 'center' }}>Common scams to watch for</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {SCAMS.map(([emoji, title, text]) => (
          <div key={title} style={cardBase}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>{emoji}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>{title}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, lineHeight: 1.6, color: '#3a3a3a', margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>

      <div style={{ ...cardBase, background: '#fff5f5', border: '1px solid #fecaca', marginTop: 18 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 900, color: '#b91c1c', margin: '0 0 8px' }}>Think something&apos;s wrong?</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: '#991b1b', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
          <li>Stop — don&apos;t pay, refund or hand anything over.</li>
          <li>Keep the conversation on Grabitt so there&apos;s a record.</li>
          <li>Use <strong>Report a Listing</strong> to flag it to our team.</li>
          <li>If money is already involved, open a <strong>dispute</strong> from the transaction — your funds stay held.</li>
        </ul>
      </div>
    </InfoPage>
  )
}
