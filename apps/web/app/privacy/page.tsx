import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Grabitt' }

export default function PrivacyPage() {
  return (
    <main style={wrap}>
      <div style={card}>
        <Link href="/" style={back}>‹ Back to Grabitt</Link>
        <h1 style={h1}>Privacy Policy</h1>
        <p style={muted}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <p style={p}>This policy explains how <strong>Grabitt</strong> (&quot;we&quot;, &quot;us&quot;) collects and uses your personal data when you use our marketplace, in line with the EU General Data Protection Regulation (GDPR) and Spanish data-protection law. Grabitt operates in Gran Canaria, Canary Islands, Spain.</p>

        <h2 style={h2}>1. What we collect</h2>
        <ul style={ul}>
          <li><strong>Account data</strong> — name, email, and login credentials (managed by our authentication provider).</li>
          <li><strong>Marketplace data</strong> — your listings, offers, orders, messages, reviews and payout details.</li>
          <li><strong>Payment data</strong> — processed by Stripe; we do not store card numbers.</li>
          <li><strong>Consent records</strong> — the date, time and IP address at which you accept this policy and our terms.</li>
          <li><strong>Technical data</strong> — device/browser information and basic usage needed to run and secure the service.</li>
        </ul>

        <h2 style={h2}>2. Why we use it (legal basis)</h2>
        <ul style={ul}>
          <li><strong>To provide the service</strong> (contract) — creating listings, processing orders, holding funds in escrow and enabling messaging.</li>
          <li><strong>With your consent</strong> — where you accept this policy on first use, and for optional communications.</li>
          <li><strong>Legitimate interests</strong> — preventing fraud, keeping the platform safe, and improving the service.</li>
          <li><strong>Legal obligation</strong> — retaining transaction records required by law.</li>
        </ul>

        <h2 style={h2}>3. Who processes your data</h2>
        <p style={p}>We use trusted processors to run Grabitt: <strong>Supabase</strong> (database &amp; authentication), <strong>Stripe</strong> (payments &amp; payouts), and <strong>Resend</strong> (transactional email). These providers process data only on our instructions.</p>

        <h2 style={h2}>4. Retention</h2>
        <p style={p}>We keep your account data for as long as your account is active. When you request erasure, we delete your personal account data immediately. <strong>Sales and purchase records are retained</strong> where required by law and to protect the other party to a transaction; consent records are retained as evidence of the consents you gave.</p>

        <h2 style={h2}>5. Your rights</h2>
        <p style={p}>Under the GDPR you can access, correct, export, restrict or object to the processing of your data, and request erasure. You can permanently delete your account and personal data at any time from your <strong>Account</strong> page (&quot;Delete my account &amp; data&quot;). To exercise any other right, contact us below.</p>

        <h2 style={h2}>6. Contact</h2>
        <p style={p}>For any privacy request or question, email <a href="mailto:privacy@grabitt.net" style={a}>privacy@grabitt.net</a>. You also have the right to lodge a complaint with the Spanish data-protection authority (AEPD).</p>

        <p style={{ ...muted, marginTop: 28 }}>See also our <Link href="/terms" style={a}>Terms of Service</Link>.</p>
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
