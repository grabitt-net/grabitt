import InfoPage, { Band } from '@/components/marketplace/InfoPage'

export const metadata = { title: 'The Grabitt Guarantee — Grabitt' }

// Footer → Safety & trust → Grabitt Guarantee (item 9). Redesigned onto the
// standard template with a full content rewrite drawing on the platform's real
// protections. NOTE: draft copy for Steve to review.

const cardBase: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 18, padding: 'clamp(16px, 2.6vw, 24px)', boxShadow: '0 4px 18px rgba(30,43,85,0.05)' }

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f5f0e8' }}>
      <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontWeight: 900, fontSize: 15 }}>{n}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 900, color: 'var(--dark)', marginBottom: 3 }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, lineHeight: 1.6, color: '#3a3a3a' }}>{children}</div>
      </div>
    </div>
  )
}

export default function GuaranteePage() {
  return (
    <InfoPage
      title="The Grabitt Guarantee"
      topbarTitle="Grabitt Guarantee"
      intro="Every payment on Grabitt is protected. Your money is held safely until you confirm you've received your item — so you can buy and sell with confidence."
      pills={['Payments held securely', 'Confirm at handover', 'Formal disputes', 'Buyer & seller protected']}
    >
      <Band heading="Your money is protected from start to finish">
        When you buy on Grabitt, your payment doesn&apos;t go straight to the seller. It&apos;s taken securely through <strong>Stripe</strong> — a globally trusted, regulated payment processor — and <strong>held</strong> until the deal is done properly. Grabitt never touches your money directly; it stays protected in the payment system until you&apos;re happy.
      </Band>

      <div style={{ ...cardBase, marginTop: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', margin: '0 0 8px' }}>How the Guarantee works</h2>
        <Step n={1} title="You pay securely">Your payment is captured by Stripe and held — it is not released to the seller yet.</Step>
        <Step n={2} title="You meet or receive your item">At handover — whether delivered or collected — you check the item is exactly as described.</Step>
        <Step n={3} title="You scan to confirm">You scan the transaction code and choose <strong>Accept</strong> (all good) or <strong>Reject</strong> (there&apos;s a problem). Nothing is released until you do.</Step>
        <Step n={4} title="Payment releases — or is held">Accept releases the funds to the seller and completes the sale. Reject opens a <strong>formal dispute</strong> and your money stays held while it&apos;s resolved.</Step>
      </div>

      <Band reverse tint heading="Fair for buyers and sellers">
        The Guarantee protects <strong>both</strong> sides. Buyers never pay out for an item they haven&apos;t received and approved. Sellers know the buyer&apos;s money is real and waiting — so once the item is handed over and accepted, they get paid promptly and fairly. If something goes wrong, our dispute process steps in and reviews it, with the funds held safely in the meantime.
      </Band>

      <Band heading="What&apos;s always covered">
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Items that never arrive, or arrive not as described.</li>
          <li>Payments — held via Stripe until you confirm receipt.</li>
          <li>A clear, formal dispute route if you&apos;re not satisfied.</li>
          <li>Protection when you keep everything on Grabitt — chat, payment and handover.</li>
        </ul>
        <p style={{ margin: '14px 0 0', fontSize: 13.5, color: '#8a6d3b' }}>The one rule: stay on Grabitt. The moment a deal moves off-platform — cash, bank transfer or another app — the Guarantee can no longer protect you.</p>
      </Band>
    </InfoPage>
  )
}
