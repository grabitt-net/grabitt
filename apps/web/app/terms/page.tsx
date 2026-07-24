import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Grabitt' }

export default function TermsPage() {
  return (
    <main className="app-shell" style={wrap}>
      <div style={card}>
        <Link href="/" style={back}>‹ Back to Grabitt</Link>
        <h1 style={h1}>Terms of Service</h1>
        <p style={muted}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <p style={p}>These terms govern your use of <strong>Grabitt</strong>, a digital marketplace operating in Gran Canaria, Canary Islands, Spain. By creating an account or using the service you agree to them. Please read section 7 (right of withdrawal) carefully — it affects your legal rights.</p>

        {/* 1 */}
        <h2 style={h2}>1. Who we are &amp; what Grabitt is</h2>
        <p style={p}>Grabitt operates an online marketplace and classified-listings platform connecting buyers, sellers, employers, job-seekers, landlords, agents and tradespeople in Gran Canaria. Contact: <a href="mailto:support@grabitt.net" style={a}>support@grabitt.net</a>.</p>
        <p style={p}><strong>Grabitt is an intermediary, not the seller.</strong> We do not own, hold, inspect, store or handle the goods or property listed, and we do not employ the people who advertise services or jobs. The contract of sale or engagement is formed <strong>directly between the buyer and the seller</strong> (or employer and applicant); Grabitt is not a party to it.</p>

        {/* 2 */}
        <h2 style={h2}>2. Eligibility &amp; your account</h2>
        <ul style={ul}>
          <li>You must be at least 18 and legally able to enter contracts.</li>
          <li>You must give accurate registration details and keep them up to date.</li>
          <li>You are responsible for activity under your account and for keeping your credentials secure.</li>
          <li>One person, one account, unless we agree otherwise in writing.</li>
        </ul>

        {/* 3 */}
        <h2 style={h2}>3. Consumer or trader — this matters</h2>
        <p style={p}>Your legal obligations depend on your status:</p>
        <ul style={ul}>
          <li><strong>Private (consumer) sellers</strong> sell occasionally from their own possessions and are not acting for business purposes.</li>
          <li><strong>Traders</strong> act for purposes relating to their trade, business, craft or profession — including anyone selling regularly or at volume, and all <strong>Business accounts</strong>.</li>
        </ul>
        <p style={p}>If you act as a trader you must say so, comply with consumer-protection, tax, invoicing and (where relevant) licensing law, and honour the statutory rights of consumers who buy from you — including the right of withdrawal in section 7.2. Selling regularly may make you a trader in law <em>even if</em> your account is a personal one; determining your own status is your responsibility.</p>

        {/* 4 */}
        <h2 style={h2}>4. Buying on Grabitt</h2>
        <p style={p}>Listings are invitations to treat. A contract forms when payment is authorised and the seller accepts. Payments are processed by <strong>Stripe</strong>. For protected purchases, funds are held in <strong>escrow</strong> and released to the seller on confirmed handover (QR code for collection or in-person delivery) or, for tracked courier delivery, once the item shows as in transit.</p>
        <p style={p}>Buyers should inspect items at handover wherever possible. Descriptions, photographs and condition grades are supplied by sellers, not by Grabitt.</p>

        {/* 5 */}
        <h2 style={h2}>5. Selling on Grabitt</h2>
        <ul style={ul}>
          <li>Describe items accurately, including faults, and use genuine photographs.</li>
          <li>You must own the item or be authorised to sell it, and it must be legal to sell.</li>
          <li>Complete sales you accept, hand over promptly, and use the platform&apos;s handover confirmation.</li>
          <li>Job adverts and property listings may only be posted from a <strong>Business account</strong>.</li>
          <li>You are responsible for your own tax obligations arising from sales.</li>
        </ul>

        {/* 6 */}
        <h2 style={h2}>6. Fees, credits &amp; subscriptions</h2>
        <p style={p}><strong>Commission.</strong> We charge sellers a commission on completed sales, shown before you list and calculated server-side. The rate depends on your seller grade.</p>
        <p style={p}><strong>Paid options.</strong> Promotions (e.g. Featured, Grab It Now), listing credits and add-ons are charged at the prices displayed at the time of purchase.</p>
        <p style={p}><strong>Credits</strong> have no cash value, are not exchangeable for money, are non-refundable once spent, and may expire or be withheld/reversed where obtained through abuse, error or fraud.</p>
        <p style={p}><strong>Subscriptions</strong> (e.g. Business) renew automatically for successive periods until cancelled. You may cancel at any time from your Account; cancellation takes effect at the end of the current paid period and does not refund the period already started, except where the law requires otherwise.</p>

        {/* 7 — the important one */}
        <h2 style={h2}>7. Right of withdrawal (14-day &quot;cooling-off&quot;)</h2>
        <p style={p}>The EU right of withdrawal (Directive 2011/83/EU; in Spain, Real Decreto Legislativo 1/2007) applies to <strong>distance contracts between a trader and a consumer</strong>. How it applies on Grabitt depends on who you are buying from:</p>

        <h3 style={h3}>7.1 Buying from a private seller — no withdrawal right</h3>
        <p style={p}>Where the seller is a <strong>private individual</strong> and not acting for business purposes, the statutory right of withdrawal <strong>does not apply</strong>, because it exists only against traders. This is a consequence of the law, not a term we impose. Any return, refund or cancellation in a private sale is a matter to be agreed <strong>directly between buyer and seller</strong>. Grabitt may assist through the dispute process (section 10) but is not obliged to refund you.</p>

        <h3 style={h3}>7.2 Buying from a business/trader seller — the right applies</h3>
        <p style={p}>Where the seller is a <strong>trader or Business account</strong> and you are a consumer, you generally have <strong>14 days</strong> to withdraw from the contract without giving a reason, starting the day you (or someone you nominate) receive the goods. That right <strong>cannot be excluded or waived</strong>, and any term purporting to do so is void. The trader — not Grabitt — is responsible for accepting the return and refunding you. Statutory exceptions apply, including for perishable goods, made-to-order or personalised items, and sealed goods unsealed after delivery for health or hygiene reasons.</p>

        <h3 style={h3}>7.3 Grabitt&apos;s own digital services — immediate performance</h3>
        <p style={p}>When you buy a service <strong>from Grabitt</strong> (credits, listing promotions, subscriptions and other digital services), you are a consumer and we are the trader, so the 14-day right applies to that purchase. However, these services are supplied <strong>immediately</strong>. When you buy, you are asked to <strong>expressly request immediate performance and acknowledge that you thereby lose your right of withdrawal</strong> once the service has been fully performed (or, for digital content, once supply has begun). We record that acknowledgement, with its date and time, as proof.</p>
        <p style={p}>If you have <em>not</em> given that acknowledgement, or the service has not begun, you keep the 14-day right and may withdraw by emailing <a href="mailto:support@grabitt.net" style={a}>support@grabitt.net</a>. Where a service has been only partly performed, you pay a proportionate amount for what was supplied.</p>

        <h3 style={h3}>7.4 Nothing here removes your statutory rights</h3>
        <p style={p}>Nothing in these terms excludes or restricts any right you have as a consumer that cannot be excluded by law, including rights in respect of faulty or misdescribed goods.</p>

        {/* 8 */}
        <h2 style={h2}>8. Prohibited items &amp; conduct</h2>
        <p style={p}>You must not list or trade illegal, counterfeit, stolen, recalled or unsafe goods; weapons; drugs or controlled substances; live animals in breach of law; human remains or bodily fluids; hazardous materials; or anything you may not lawfully sell. You must not harass, defraud, discriminate, spam, scrape, reverse-engineer, or attempt to circumvent the platform, its fees or its safety features. Job adverts must comply with employment and equality law.</p>

        {/* 9 */}
        <h2 style={h2}>9. Keeping dealings on Grabitt</h2>
        <p style={p}>To protect both parties and enable the Grabitt Guarantee, communication and payment must stay on the platform. Sharing phone numbers, emails or off-platform payment details in messages is not allowed, and such content may be automatically hidden. Payments made off-platform lose all protection.</p>

        {/* 10 */}
        <h2 style={h2}>10. Disputes &amp; the Grabitt Guarantee</h2>
        <p style={p}>If something goes wrong with a protected purchase, raise a dispute through the platform within the period shown at checkout. We may hold, release or return escrowed funds based on the evidence provided by both parties. Our decision on the release of escrowed funds does not determine the parties&apos; legal rights, and does not prevent you pursuing the other party through the courts or a consumer body.</p>

        {/* 11 */}
        <h2 style={h2}>11. Your content</h2>
        <p style={p}>You keep ownership of the content you upload (listings, photographs, reviews, messages). You grant Grabitt a non-exclusive, worldwide, royalty-free licence to host, display, reproduce and promote that content for the purpose of operating and marketing the service. You confirm you have the rights to the content you upload. We may remove content that breaches these terms or the law.</p>

        {/* 12 */}
        <h2 style={h2}>12. Suspension &amp; termination</h2>
        <p style={p}>We may suspend, restrict or close an account, or remove listings, where we reasonably believe there has been a breach of these terms or the law, a risk of harm to users, or fraudulent activity. Where practicable we will tell you why and how to appeal. You may close your account at any time; obligations already incurred (including completing accepted sales) survive.</p>

        {/* 13 */}
        <h2 style={h2}>13. Liability</h2>
        <p style={p}>As an intermediary, Grabitt is not liable for the quality, safety, legality, description, delivery or performance of items, services, jobs or property listed by users, nor for the conduct of users. We provide the platform &quot;as is&quot; and do not guarantee uninterrupted availability.</p>
        <p style={p}>Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for any other liability that cannot be limited by law. Subject to that, our aggregate liability to you in connection with the service is limited to the greater of (a) the fees you paid us in the 12 months before the claim, or (b) €100.</p>

        {/* 14 */}
        <h2 style={h2}>14. Data protection</h2>
        <p style={p}>How we handle your personal data is set out in our <Link href="/privacy" style={a}>Privacy Policy</Link>, which forms part of these terms. It explains the legal bases we rely on, how long we keep data, and how to exercise your GDPR rights, including erasure.</p>

        {/* 15 */}
        <h2 style={h2}>15. Changes to these terms</h2>
        <p style={p}>We may update these terms to reflect changes to the service or the law. For material changes we will give reasonable notice (for example, by email or in the app) before they take effect. If you do not accept the change, you may close your account.</p>

        {/* 16 */}
        <h2 style={h2}>16. Governing law, complaints &amp; disputes with us</h2>
        <p style={p}>These terms are governed by <strong>Spanish law</strong>. If you are a consumer, you benefit from any mandatory protections of the law of your country of residence, and you may bring proceedings in the courts of your place of residence. Otherwise, the courts of Las Palmas de Gran Canaria have jurisdiction.</p>
        <p style={p}>Complaints: <a href="mailto:support@grabitt.net" style={a}>support@grabitt.net</a>. Consumers may also use the European Commission&apos;s Online Dispute Resolution platform at <a href="https://ec.europa.eu/consumers/odr" style={a} target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>, or contact the consumer authorities of the Canary Islands.</p>

        <p style={{ ...muted, marginTop: 28 }}>See also our <Link href="/privacy" style={a}>Privacy Policy</Link>.</p>
      </div>
    </main>
  )
}

const wrap: React.CSSProperties = { minHeight: '100vh', background: 'var(--cream, #FBF7F0)', padding: '32px 16px' }
const card: React.CSSProperties = { maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 30px rgba(0,0,0,0.06)' }
const back: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }
const h1: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: 32, fontWeight: 700, color: 'var(--dark)', margin: '16px 0 4px' }
const h2: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', margin: '26px 0 8px' }
const h3: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 14.5, fontWeight: 900, color: 'var(--orange)', margin: '16px 0 6px' }
const p: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 14.5, color: '#444', lineHeight: 1.7, margin: '0 0 10px' }
const ul: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 14.5, color: '#444', lineHeight: 1.7, paddingLeft: 20, margin: '0 0 10px' }
const muted: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#999' }
const a: React.CSSProperties = { color: 'var(--orange)', fontWeight: 700 }
