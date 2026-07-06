import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Grabitt' }

export default function TermsPage() {
  return (
    <main style={wrap}>
      <div style={card}>
        <Link href="/" style={back}>‹ Back to Grabitt</Link>
        <h1 style={h1}>Terms of Service</h1>
        <p style={muted}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <p style={p}>These terms govern your use of <strong>Grabitt</strong>, a digital marketplace operating in Gran Canaria, Canary Islands, Spain. By creating an account or using the service you agree to them.</p>

        <h2 style={h2}>1. Grabitt is a marketplace, not the seller</h2>
        <p style={p}>Grabitt connects buyers and sellers. We do not own, hold, inspect or handle the goods listed. The contract of sale is between the buyer and the seller directly; Grabitt is not a party to it.</p>

        <h2 style={h2}>2. Right of withdrawal — exemption</h2>
        <p style={p}><strong>Sales made on Grabitt are exempt from the EU right of withdrawal.</strong> Because Grabitt is a digital marketplace that does not hold the physical goods, any request to withdraw from, cancel or return a sale is the sole responsibility of the buying and selling parties, to be arranged between them directly. You accept this exemption when you accept the right-to-withdraw notice on first use.</p>

        <h2 style={h2}>3. Payments &amp; escrow</h2>
        <p style={p}>Payments are processed by Stripe. For protected purchases, funds are held in <strong>escrow</strong> and released to the seller on confirmed handover (QR code for collection/in-person delivery) or, for tracked courier delivery, once the item is shown as in transit. Grabitt&apos;s fees are shown before you list or buy and are calculated server-side.</p>

        <h2 style={h2}>4. Keep dealings on Grabitt</h2>
        <p style={p}>To protect both parties and enable the Grabitt Guarantee, you must keep communication and payment on the platform. Sharing phone numbers, emails or off-platform payment details in messages is not allowed, and such content may be automatically hidden.</p>

        <h2 style={h2}>5. Your responsibilities</h2>
        <ul style={ul}>
          <li>Provide accurate listings and act in good faith.</li>
          <li>Do not list illegal, counterfeit, unsafe or prohibited items.</li>
          <li>Comply with applicable law, including consumer and tax obligations that apply to you as a seller.</li>
          <li>Do not misuse, defraud, or attempt to circumvent the platform or its safety features.</li>
        </ul>

        <h2 style={h2}>6. Subscriptions</h2>
        <p style={p}>Paid plans (e.g. Business) renew automatically until cancelled. You can manage or cancel a subscription at any time from your Account via the billing portal. Trial periods, prices and features are shown at sign-up.</p>

        <h2 style={h2}>7. Liability</h2>
        <p style={p}>As a marketplace intermediary, Grabitt is not liable for the quality, safety, legality or delivery of items, which are the responsibility of the transacting parties. Nothing in these terms limits liability that cannot be excluded by law.</p>

        <h2 style={h2}>8. Data</h2>
        <p style={p}>Our handling of your personal data is described in the <Link href="/privacy" style={a}>Privacy Policy</Link>, including your right to delete your account data.</p>

        <h2 style={h2}>9. Governing law &amp; contact</h2>
        <p style={p}>These terms are governed by Spanish law, with the courts of Las Palmas de Gran Canaria having jurisdiction, subject to any mandatory consumer protections. Questions: <a href="mailto:support@grabitt.net" style={a}>support@grabitt.net</a>.</p>
      </div>
    </main>
  )
}

const wrap: React.CSSProperties = { minHeight: '100vh', background: 'var(--cream, #FBF7F0)', padding: '32px 16px' }
const card: React.CSSProperties = { maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 30px rgba(0,0,0,0.06)' }
const back: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }
const h1: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 32, fontWeight: 700, color: 'var(--dark)', margin: '16px 0 4px' }
const h2: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', margin: '26px 0 8px' }
const p: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 14.5, color: '#444', lineHeight: 1.7, margin: '0 0 10px' }
const ul: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 14.5, color: '#444', lineHeight: 1.7, paddingLeft: 20, margin: '0 0 10px' }
const muted: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#999' }
const a: React.CSSProperties = { color: 'var(--orange)', fontWeight: 700 }
