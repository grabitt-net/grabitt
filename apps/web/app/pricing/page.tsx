'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'

// Footer → Grabitt → Pricing. Prices and rules are exact — do not change.
// Descriptive copy is Steve's, used as written.

function PriceCard({ name, price, note, children }: { name: string; price: string; note?: string; children: ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line, #ece3d7)', borderRadius: 16, padding: '18px 18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 900, color: 'var(--dark)', margin: 0 }}>{name}</h3>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 900, color: 'var(--orange)', whiteSpace: 'nowrap' }}>{price}</span>
      </div>
      {note && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, color: '#8a6d3b', background: '#fff6e6', border: '1px solid #f0e0bd', borderRadius: 999, padding: '3px 10px', alignSelf: 'flex-start', marginTop: 8 }}>{note}</div>}
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, color: '#3a3a3a', margin: '10px 0 0' }}>{children}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ margin: '10px 0 22px' }}>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(19px, 2.6vw, 24px)', fontWeight: 900, color: 'var(--dark)', margin: '0 0 14px' }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>{children}</div>
    </section>
  )
}

export default function PricingPage() {
  return (
    <InfoPage
      title="Price Guide"
      topbarTitle="Pricing"
      intro="Nice clean transparent pricing to help you make good decisions. Here is a list of our pricing!"
      pills={['No Fees to Buy', 'Low Selling Fees', 'No Fees on Jobs to Apply', 'Transparent Pricing']}
    >
      <Section title="For Everyone — Buying & Selling">
        <PriceCard name="Buying" price="Free">
          Buy as much as you like, as often as you like — Grabitt never charges you a penny to buy. The only thing to watch for is postage or packaging fees set by the seller, so always check the listing before you commit. Simple.
        </PriceCard>
        <PriceCard name="Selling Items" price="2.5% to 8%">
          Keep more of what you make. Selling fees run from just 2.5% up to 8%, depending on which business account you set up — the higher your level, the lower your fee. <Link href="/for-business" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>See Business accounts</Link>
        </PriceCard>
        <PriceCard name="Featured Listing" price="€1.99">
          Want eyes on your item fast? For just €1.99, your listing jumps into the Featured area right at the top of the homepage — pimped-up visibility that puts you in front of everyone browsing Grabitt.
        </PriceCard>
        <PriceCard name="Grabitt NOW!" price="€4.99 per listing">
          Got something that needs gone <em>fast</em>? Grabitt NOW! is built for urgency — discounted items and hot offers that can&apos;t wait. For €4.99 your listing lands right at the top of the homepage for a full 72 hours, in its own dedicated carousel alongside boosted listings (two separate carousels). It&apos;s the express lane for anything you need to shift quickly — grab the attention, make the sale, done.
        </PriceCard>
      </Section>

      <Section title="For Business — Recruitment & Directory">
        <PriceCard name="Post a Job" price="€29 per listing" note="Paid business accounts only">
          Hiring? Post a job for €29 and it stays live for a full 14 days. Got ongoing recruitment? Buy job listings in bulk and save.
        </PriceCard>
        <PriceCard name="Advertise for Staff" price="€29 per listing">
          Need a team? Advertise for staff at €29 per listing, or grab a bulk listings package if you&apos;re hiring regularly.
        </PriceCard>
        <PriceCard name="Business Directory" price="€15/month" note="Or annual for a discount">
          Get found. List your business in the Grabitt Directory for €15 a month, or go annual for a tidy discount. What we&apos;ve been missing is a nice clean business directory here on the Canary Islands. Split into industry, you come up when people search for a plumber, dentist, doctor, lawyer — you name it. You get your logo, contact details, and a brief description of what you do and where you are, with a map pin.
        </PriceCard>
      </Section>

      <Section title="Sponsorship — Get Seen">
        <PriceCard name="Homepage Sponsor" price="€299">
          Grab prime position! THE most prominent banner on the entire site. Visible to everyone who visits the page, clickable to your listing, and you get a business directory listing for the duration of your banner sponsorship where you can put your information, offers and contact details. You must be a minimum Business Light account for this type of sponsorship — but WOW, it&apos;s a zinger!
        </PriceCard>
        <PriceCard name="Category Sponsor" price="€149">
          Industry domination! Grab this banner to be in front of buyers looking for a certain item in a certain department — they get to see you right at the top of their page! It clicks through to your business directory listing that is live during your banner sponsorship.
        </PriceCard>
        <PriceCard name="Featured Partner" price="€79">
          This is a fantastic way to be everywhere. Your banner and message appears across all pages on a rotation with 7 featured partners — including the message box, alerts, saved, and all landing pages. It clicks through to your business directory listing that is live during your banner sponsorship.
        </PriceCard>
        <PriceCard name="Email Blast" price="€149">
          One of our most POWERFUL marketing tools at your disposal. Write your email copy, create a great offer, tell them about your business and how to get in touch — and away we go! We provide a full delivery and open statistics report, including any that bounce, who we contact to check if they received it, or if their email address changed. You must be at least a Business client to use this service, and it&apos;s strictly limited to once per quarter.
        </PriceCard>
        <PriceCard name="WhatsApp Blast" price="€199" note="Coming Soon">
          THE most powerful communication method we have — direct to the members&apos; WhatsApp, giving you a great opportunity to grab their attention in real time! Delivery stats and successful send report provided. You must be a standard business user to use this service, and it&apos;s limited to once per quarter.
        </PriceCard>
      </Section>
    </InfoPage>
  )
}
