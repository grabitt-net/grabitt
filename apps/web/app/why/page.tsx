'use client'
import { usePanel } from '@/context/PanelContext'
import InfoPage from '@/components/marketplace/InfoPage'
import Icon from '@/components/marketplace/Icon'

// Footer → Grabitt → Why Us? Intro copy is Steve's, used exactly as written.
// One-line benefits are suggested wording for Steve to confirm.

const COL1: [string, string][] = [
  ['Easy to Use', 'everything simple, in one clean place.'],
  ['Everything in One Place', 'buy, sell, work, rent, give — no more app-hopping.'],
  ['Selling Made Easy', 'list in minutes, sell to people near you.'],
  ['Find Your Home', 'browse property to buy or rent across the islands.'],
  ['Sell or Rent Your Property', 'reach local buyers and tenants directly.'],
  ['Local Trading', 'deal with people on your island, not strangers abroad.'],
  ['Scam Avoidance & Help Guides', 'spot the traps before they catch you.'],
  ['Safety Shield', 'extra layers of protection built in.'],
  ['Loyalty Points Scheme', 'get rewarded just for using Grabitt.'],
  ['Ratings Reassurance', 'buy and sell with people you can trust.'],
  ['Saved Searches', 'let the right listings come to you.'],
  ['Make an Offer', 'negotiate directly, your price.'],
]

const COL2: [string, string][] = [
  ['Local Services Finder', 'plumbers, cleaners, sparkies — all nearby.'],
  ['Free Charity Section', 'good causes raise funds and awareness at no cost.'],
  ['Tips & Ideas', 'smart ways to get more out of Grabitt.'],
  ['Grabitt NOW', 'for things you need to buy or sell urgently.'],
  ['CV Builder & Job Applications', 'find work and apply in a few taps.'],
  ['Build Your Online Business', 'your own storefront on the islands’ marketplace.'],
  ['Directory Listings', 'get found by the whole island.'],
  ['Sponsorship Opportunities', 'put your business front and centre.'],
  ['Library of Local Guides', 'island know-how in one place.'],
  ['News & Events', 'what’s happening near you.'],
  ['Dispute Management', 'problems handled fairly and fast.'],
  ['Robust Help Centre', 'answers whenever you need them.'],
]

function TickList({ items }: { items: [string, string][] }) {
  return (
    <div>
      {items.map(([h, b]) => (
        <div key={h} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0' }}>
          <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--success, #16a34a)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Icon name="check" size={13} strokeWidth={3} />
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14.5, lineHeight: 1.5, color: '#2a2a2a' }}>
            <strong style={{ color: 'var(--dark)' }}>{h}</strong> — {b}
          </span>
        </div>
      ))}
    </div>
  )
}

function SuggestButton() {
  const { openPanel } = usePanel()
  return (
    <div style={{ textAlign: 'center', margin: '6px 0 18px' }}>
      <button
        onClick={() => openPanel('footer', { key: 'suggest' })}
        style={{
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: 'var(--orange)',
          background: '#fff', border: '2px solid #111', borderRadius: 12, padding: '12px 22px', cursor: 'pointer',
        }}
      >
        Suggest an Idea
      </button>
    </div>
  )
}

export default function WhyPage() {
  return (
    <InfoPage
      title="Why Use Grabitt!?"
      topbarTitle="Why Us?"
      intro={
        <>
          <p style={{ margin: '0 0 12px' }}>Easy! Take a look at some great ideas below to help you learn how good this site is — and how to use it to your advantage.</p>
          <p style={{ margin: 0 }}>Plus, any suggestions or ideas, fire them over to us. This is an ever-evolving site, built with one thing in mind: building the community!</p>
        </>
      }
      pills={['Local to the Canaries', 'Secure Escrow', 'Buyer Protection', 'No Fees on Jobs & Property']}
    >
      <SuggestButton />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(14px, 3vw, 40px)' }}>
        <TickList items={COL1} />
        <TickList items={COL2} />
      </div>
    </InfoPage>
  )
}
