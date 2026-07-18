import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Grabitt' }

export default function PrivacyPage() {
  return (
    <main style={wrap}>
      <div style={card}>
        <Link href="/" style={back}>‹ Back to Grabitt</Link>
        <h1 style={h1}>Privacy Policy</h1>
        <p style={muted}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <p style={p}>This policy explains how <strong>Grabitt</strong> (&quot;we&quot;, &quot;us&quot;) collects and uses your personal data, in line with the EU General Data Protection Regulation (GDPR) and Spanish data-protection law (LOPDGDD). Grabitt operates in Gran Canaria, Canary Islands, Spain.</p>

        {/* 1 */}
        <h2 style={h2}>1. Who is the controller</h2>
        <p style={p}>Grabitt is the <strong>data controller</strong> for the personal data described here. For any privacy matter, contact <a href="mailto:privacy@grabitt.net" style={a}>privacy@grabitt.net</a>.</p>
        <p style={p}>Where you sell to, buy from or message another user, that user may also process your data for their own purposes (for example, a business seller keeping a sales record). In those cases they act as an independent controller and are responsible for their own compliance.</p>

        {/* 2 */}
        <h2 style={h2}>2. What we collect</h2>
        <ul style={ul}>
          <li><strong>Account data</strong> — name, email, phone, password (held by our authentication provider, never in plain text), profile photo, language.</li>
          <li><strong>Marketplace data</strong> — listings, photographs, offers, orders, handover records, reviews, messages, favourites and saved searches.</li>
          <li><strong>Location data</strong> — the town and any map pin you choose to add to a listing. We do not track your device location in the background.</li>
          <li><strong>Payment &amp; payout data</strong> — processed by Stripe. We store transaction records and Stripe identifiers; <strong>we never see or store full card numbers</strong>.</li>
          <li><strong>Recruitment data</strong> (if you apply for a job or list yourself for work) — your work profile, CV, right-to-work status, languages, availability and answers to employer questions. You choose what to provide.</li>
          <li><strong>Consent records</strong> — what you accepted, when, and the IP address and device used.</li>
          <li><strong>Technical data</strong> — device/browser information, log data and basic usage needed to run and secure the service.</li>
        </ul>

        {/* 3 */}
        <h2 style={h2}>3. Why we use it, and our legal basis</h2>
        <table style={table}>
          <thead><tr><th style={th}>Purpose</th><th style={th}>Legal basis</th></tr></thead>
          <tbody>
            <tr><td style={td}>Creating your account and providing the marketplace</td><td style={td}>Performance of a contract</td></tr>
            <tr><td style={td}>Processing orders, escrow and payouts</td><td style={td}>Performance of a contract</td></tr>
            <tr><td style={td}>Messaging between users</td><td style={td}>Performance of a contract</td></tr>
            <tr><td style={td}>Job applications and candidate matching</td><td style={td}>Consent (given when you apply or publish a work profile)</td></tr>
            <tr><td style={td}>Fraud prevention, safety and platform security</td><td style={td}>Legitimate interests</td></tr>
            <tr><td style={td}>Service emails (order updates, alerts you enable)</td><td style={td}>Performance of a contract</td></tr>
            <tr><td style={td}>Marketing emails</td><td style={td}>Consent — withdrawable at any time</td></tr>
            <tr><td style={td}>Accounting, tax and dispute records</td><td style={td}>Legal obligation</td></tr>
          </tbody>
        </table>
        <p style={p}>Where we rely on <strong>legitimate interests</strong>, we have considered your rights and interests and concluded ours do not override them; you may object at any time (section 8).</p>

        {/* 4 */}
        <h2 style={h2}>4. What other people can see</h2>
        <p style={p}>Your display name, profile photo, grade, ratings and listings are <strong>public</strong>. Your email address, phone number and collection address are <strong>not</strong> public: contact details are shared with the other party only when a transaction requires it (for example, a completed collection sale). A candidate&apos;s CV and contact details are released to an employer only when that employer unlocks the profile or the candidate applies to their job.</p>

        {/* 5 */}
        <h2 style={h2}>5. Who processes your data for us</h2>
        <p style={p}>We use trusted processors, bound by contract to act only on our instructions:</p>
        <ul style={ul}>
          <li><strong>Supabase</strong> — database, authentication and file storage.</li>
          <li><strong>Stripe</strong> — payments, escrow and seller payouts (Stripe is also an independent controller for its own compliance purposes).</li>
          <li><strong>Resend</strong> — transactional email delivery.</li>
          <li><strong>Vercel</strong> — application hosting.</li>
        </ul>
        <p style={p}>We do not sell your personal data.</p>

        {/* 6 */}
        <h2 style={h2}>6. International transfers</h2>
        <p style={p}>Some processors may handle data outside the European Economic Area. Where they do, transfers are protected by an adequacy decision or by the European Commission&apos;s <strong>Standard Contractual Clauses</strong> together with additional safeguards. You can ask us for details.</p>

        {/* 7 */}
        <h2 style={h2}>7. How long we keep it</h2>
        <table style={table}>
          <thead><tr><th style={th}>Data</th><th style={th}>Retention</th></tr></thead>
          <tbody>
            <tr><td style={td}>Account &amp; profile</td><td style={td}>While your account is active</td></tr>
            <tr><td style={td}>Transactions, invoices &amp; tax records</td><td style={td}>As required by Spanish law (generally up to 6 years)</td></tr>
            <tr><td style={td}>Messages relating to a transaction</td><td style={td}>Retained with the transaction record</td></tr>
            <tr><td style={td}>Job applications &amp; CVs</td><td style={td}>Until you withdraw them or delete your account</td></tr>
            <tr><td style={td}>Consent records</td><td style={td}>Kept as evidence of the consent given</td></tr>
            <tr><td style={td}>Security &amp; fraud logs</td><td style={td}>Up to 12 months</td></tr>
          </tbody>
        </table>
        <p style={p}>When you request erasure we delete or irreversibly anonymise your personal account data. <strong>Transaction records are retained</strong> where the law requires it and to protect the other party to a sale — but they are detached from your identifying profile.</p>

        {/* 8 */}
        <h2 style={h2}>8. Your rights</h2>
        <p style={p}>Under the GDPR you have the right to:</p>
        <ul style={ul}>
          <li><strong>Access</strong> a copy of your personal data.</li>
          <li><strong>Rectify</strong> data that is inaccurate or incomplete.</li>
          <li><strong>Erase</strong> your data (&quot;right to be forgotten&quot;), subject to our legal retention duties.</li>
          <li><strong>Restrict</strong> or <strong>object to</strong> processing, including processing based on legitimate interests.</li>
          <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
          <li><strong>Withdraw consent</strong> at any time, without affecting processing already carried out.</li>
        </ul>
        <p style={p}>You can delete your account and personal data yourself from your <strong>Account</strong> page. To exercise any other right, email <a href="mailto:privacy@grabitt.net" style={a}>privacy@grabitt.net</a>. We respond within one month. We may ask you to verify your identity first.</p>

        {/* 9 */}
        <h2 style={h2}>9. Automated decisions</h2>
        <p style={p}>We do not make decisions producing legal or similarly significant effects about you by automated means alone. Automated checks may flag content or activity for review, but a person decides on suspensions and disputes.</p>

        {/* 10 */}
        <h2 style={h2}>10. Cookies &amp; similar technologies</h2>
        <p style={p}>We use cookies and local storage that are <strong>strictly necessary</strong> to run the service — keeping you signed in, holding your basket and securing forms. These do not require consent. If we later add analytics or advertising cookies, we will ask for your consent first and give you a way to change it.</p>

        {/* 11 */}
        <h2 style={h2}>11. Children</h2>
        <p style={p}>Grabitt is not intended for under-18s and we do not knowingly collect their data. If you believe a minor has an account, tell us and we will remove it.</p>

        {/* 12 */}
        <h2 style={h2}>12. Security &amp; breaches</h2>
        <p style={p}>We use encryption in transit, access controls and audited administrative access to protect your data. No system is perfectly secure; if a breach is likely to result in a high risk to your rights, we will notify you and the supervisory authority as the GDPR requires.</p>

        {/* 13 */}
        <h2 style={h2}>13. Complaints</h2>
        <p style={p}>Please raise any concern with us first at <a href="mailto:privacy@grabitt.net" style={a}>privacy@grabitt.net</a>. You also have the right to lodge a complaint with the Spanish data-protection authority, the <strong>Agencia Española de Protección de Datos</strong> (<a href="https://www.aepd.es" style={a} target="_blank" rel="noreferrer">aepd.es</a>).</p>

        {/* 14 */}
        <h2 style={h2}>14. Changes</h2>
        <p style={p}>We may update this policy. For material changes we will give reasonable notice before they take effect.</p>

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
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', margin: '0 0 12px', fontFamily: 'var(--font-ui)', fontSize: 13.5 }
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', background: '#faf7f2', color: '#666', fontWeight: 900, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid #ece3d7' }
const td: React.CSSProperties = { padding: '8px 10px', color: '#444', borderBottom: '1px solid #f4efe8', lineHeight: 1.55, verticalAlign: 'top' }
