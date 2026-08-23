import InfoPage, { Band } from '@/components/marketplace/InfoPage'

export const metadata = { title: 'Delivery & Collection — Grabitt' }

// Footer → Trading → Delivery (item 6). Redesigned onto the standard template.
// The mandatory scan-to-complete notice at the top uses Steve's exact copy.

const cardBase: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 18, padding: 'clamp(16px, 2.6vw, 24px)', boxShadow: '0 4px 18px rgba(30,43,85,0.05)' }

export default function DeliveryPage() {
  return (
    <InfoPage
      title="Delivery & Collection"
      topbarTitle="Delivery"
      intro="However you hand over — delivered or collected — the buyer confirms at handover to release payment. Here's how it works."
      pills={['Scan at handover', 'Accept or Reject', 'Funds held securely', 'Buyer protected']}
    >
      {/* Mandatory notice — exact copy */}
      <div style={{ ...cardBase, borderLeft: '5px solid var(--orange)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(18px, 2.6vw, 22px)', fontWeight: 900, color: 'var(--dark)', margin: '0 0 12px' }}>
          Important: Confirmation of Receipt Is Required to Complete Your Transaction
        </h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.7, color: '#2a2a2a', margin: '0 0 12px' }}>
          Whether your item is delivered or collected, the buyer must scan the transaction code at the point of handover to confirm the outcome. This step is mandatory and is required to complete the transaction and release payment.
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.7, color: '#2a2a2a', margin: '0 0 10px', fontWeight: 800 }}>The buyer will be presented with two options:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 900, color: '#16a34a', marginBottom: 4 }}>✅ Accept</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, color: '#3a3a3a' }}>Confirm the item has been received safely and in good condition. This completes the transaction and releases payment to the seller.</div>
          </div>
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 900, color: '#ef4444', marginBottom: 4 }}>✕ Reject</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, color: '#3a3a3a' }}>Confirm the item is being rejected and state the reason. This opens a formal dispute, and payment remains securely held pending resolution.</div>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.7, color: '#2a2a2a', margin: 0 }}>
          Payment is only released once the buyer has scanned to accept. Until the transaction is confirmed, all funds remain protected and held securely.
        </p>
      </div>

      <Band reverse tint heading="Collection in person">
        Meet in a safe, busy public place. The seller shows their handover QR code (or the 6-character code beneath it). The buyer scans or types it, checks the item, and chooses Accept or Reject. Payment releases only on Accept.
      </Band>

      <Band heading="Delivery by the seller">
        If the seller delivers in person, the same scan happens on arrival — the buyer scans the code at the door and confirms Accept or Reject. Nothing is released until they do.
      </Band>

      <Band reverse tint heading="Tracked courier">
        For items sent by a tracked courier, there&apos;s no code to scan — funds release automatically once tracking shows the item delivered, and the buyer has a short window to report a problem and open a dispute if needed.
      </Band>
    </InfoPage>
  )
}
