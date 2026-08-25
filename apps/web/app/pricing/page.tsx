'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import InfoPage from '@/components/marketplace/InfoPage'

// Footer → Grabitt → Pricing. Prices and rules are exact — do not change.
// Descriptive copy is Steve's, used as written.

// One row in the pricing list: name + note + blurb on the left; price and the
// clickable link stacked on the right.
function PriceRow({ name, price, per, note, href, cta, children }: { name: string; price: string; per?: string; note?: string; href: string; cta: string; children: ReactNode }) {
  return (
    <li style={{ listStyle: 'none', padding: '16px 0', borderBottom: '1px solid var(--line, #ece3d7)', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', margin: 0 }}>
          {name}
          {note && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#8a6d3b', background: '#fff6e6', border: '1px solid #f0e0bd', borderRadius: 999, padding: '2px 9px', marginLeft: 10, whiteSpace: 'nowrap' }}>{note}</span>}
        </h3>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, color: '#3a3a3a', margin: '6px 0 0' }}>{children}</p>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 120 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 900, color: 'var(--orange)', whiteSpace: 'nowrap' }}>
          {price}{per && <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#8a6d3b' }}>{per}</span>}
        </div>
        <Link href={href} style={{ display: 'inline-block', marginTop: 8, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, color: 'var(--orange)', textDecoration: 'none', border: '1.5px solid var(--orange)', borderRadius: 999, padding: '6px 14px', whiteSpace: 'nowrap' }}>{cta}</Link>
      </div>
    </li>
  )
}

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section style={{ margin: '10px 0 22px' }}>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(19px, 2.6vw, 24px)', fontWeight: 900, color: 'var(--dark)', margin: '0 0 6px' }}>{title}</h2>
      <ul style={{ margin: 0, padding: 0, borderTop: '1px solid var(--line, #ece3d7)' }}>{children}</ul>
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
      <Section title="For You">
        <PriceRow name="Buying" price="Free" href="/" cta="Browse items">
          Buy as much as you like, as often as you like — Grabitt never charges you a penny to buy. The only thing to watch for is postage or packaging fees set by the seller, so always check the listing before you commit. Simple.
        </PriceRow>
        <PriceRow name="Selling Items" price="2.5% to 8%" href="/?sell=1" cta="List an item">
          Keep more of what you make. Selling fees run from just 2.5% up to 8%, depending on which business account you set up — the higher your level, the lower your fee. <Link href="/for-business" style={{ color: 'var(--orange)', fontWeight: 800, textDecoration: 'none' }}>See Business accounts</Link>
        </PriceRow>
        <PriceRow name="Featured Listing" price="€1.99" per="per week" href="/?sell=1" cta="List an item">
          Want eyes on your item fast? For just €1.99 a week, your listing jumps into the Featured area right at the top of the homepage — pimped-up visibility that puts you in front of everyone browsing Grabitt.
        </PriceRow>
        <PriceRow name="Grabitt NOW!" price="€4.99 per listing" href="/?sell=1" cta="List an item">
          Got something that needs gone <em>fast</em>? Grabitt NOW! is built for urgency — discounted items and hot offers that can&apos;t wait. For €4.99 your listing lands right at the top of the homepage for a full 72 hours, in its own dedicated carousel alongside boosted listings (two separate carousels). It&apos;s the express lane for anything you need to shift quickly — grab the attention, make the sale, done.
        </PriceRow>
        <PriceRow name="Property or Rental" price="€39 per listing" note="1 free every month" href="/property/new" cta="List a property">
          List a property to rent or sell. Everyone gets one free property listing every month — after that it&apos;s just €39 per listing. Business accounts get an allowance included with their plan. Want more eyes on it? Add a Featured boost for €9 to lift your property to the top for 4 weeks.
        </PriceRow>
      </Section>

      <Section title="For Business">
        <PriceRow name="Post a Job" price="€29 per listing" note="Paid business accounts only" href="/recruitment" cta="Post a job">
          Need some superstars to add to your team? Place an ad on Grabitt which enables you to filter and manage the candidates real time. You can buy job listings in bulk or pay per listing.
        </PriceRow>
        <PriceRow name="Recruitment Database Search" price="Optional extra" note="Needs a live job advert" href="/recruitment" cta="Post a job">
          An optional add-on that speeds up your recruitment — available only to businesses with a live, paid-for job advert. Enter your criteria, click search, and it brings up already-registered candidates who match, so you don&apos;t wait for applications to arrive. Unlocking a candidate&apos;s CV and contact details is charged per candidate and tied to the job advert you&apos;re hiring for. A full recruitment advert still gives much broader coverage for candidates not yet a member.
        </PriceRow>
        <PriceRow name="Business Directory" price="€15/month" note="Or annual for a discount" href="/for-business" cta="Get listed">
          Get found. List your business in the Grabitt Directory for €15 a month, or go annual for a tidy discount. What we&apos;ve been missing is a nice clean business directory here on the Canary Islands. Split into industry, you come up when people search for a plumber, dentist, doctor, lawyer — you name it. You get your logo, contact details, and a brief description of what you do and where you are, with a map pin.
        </PriceRow>
        <PriceRow name="Property or Rental" price="€39 per listing" note="Allowance included" href="/property/new" cta="List a property">
          Agents and businesses: property listings are included in your plan&apos;s allowance — list up to your tier&apos;s limit each month, then it&apos;s just €39 per extra listing. Add a €9 Featured boost to lift any property to the top for 4 weeks.
        </PriceRow>
      </Section>

      <Section title={<>Sponsorship — <span style={{ color: 'var(--orange)' }}>Get Seen</span></>}>
        <PriceRow name="Homepage Sponsor" price="€299" per="per month" note="Business only" href="/advertise" cta="Buy now">
          Grab prime position! THE most prominent banner on the entire site. Visible to everyone who visits the page, clickable to your listing, and you get a business directory listing for the duration of your banner sponsorship where you can put your information, offers and contact details. You must be a minimum Business Light account for this type of sponsorship — but WOW, it&apos;s a zinger!
        </PriceRow>
        <PriceRow name="Category Sponsor" price="€149" per="per month" note="Business only" href="/advertise" cta="Buy now">
          Industry domination! Grab this banner to be in front of buyers looking for a certain item in a certain department — they get to see you right at the top of their page! It clicks through to your business directory listing that is live during your banner sponsorship.
        </PriceRow>
        <PriceRow name="Featured Partner" price="€79" per="per month" note="Business only" href="/advertise" cta="Buy now">
          A fantastic way to be almost everywhere. Your banner rotates with up to 7 featured partners across the site — the message box, alerts, saved and more — <em>not</em> the top of the homepage or the landing pages, but everything else, on rotation. It clicks through to your business directory listing that is live during your banner sponsorship.
        </PriceRow>
        {/* Email Blast and WhatsApp Blast are hidden from customers pending legal review — do not re-enable without sign-off. */}
      </Section>
    </InfoPage>
  )
}
