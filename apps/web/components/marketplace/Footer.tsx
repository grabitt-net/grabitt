'use client'
import { usePanel } from '@/context/PanelContext'
import Logo from './Logo'
import Icon from './Icon'
import BannerSlot from './BannerSlot'

// Site footer — grouped links, brand, and trust line. Links open the existing
// info panels so content stays consistent with the rest of the app.
export default function Footer() {
  const { openPanel } = usePanel()
  const fp = (key: string) => () => openPanel('footer', { key })
  const go = (href: string) => () => { window.location.href = href }

  // 5 balanced columns, 20 links (see "Grabitt menu amends" — the reference
  // index 1–20 is Steve's, not shown on the site). Column 1 links to the new
  // dedicated pages; the rest keep their existing panels/routes until their
  // pages are written.
  const cols: { heading: string; links: [string, () => void][] }[] = [
    { heading: 'Grabitt', links: [['About Us', go('/about')], ['Why Us?', go('/why')], ['Pricing', go('/pricing')], ['Contact', go('/contact')]] },
    { heading: 'Trading', links: [['Sell an item', () => openPanel('sell')], ['Delivery', fp('collection')], ['Sold Prices', () => openPanel('soldprices')], ['Terms', go('/terms')]] },
    { heading: 'Safety & trust', links: [['Grabitt Guarantee', () => openPanel('shield')], ['Scam Centre', fp('scams')], ['Report a Listing', () => openPanel('report')], ['My Disputes', () => openPanel('myDisputes')]] },
    { heading: 'Business', links: [['For Business', go('/employers')], ['Business Directory', go('/directory')], ['Advertise With Us', go('/advertiser')]] },
    { heading: 'Help & guides', links: [['Help Centre', go('/help')], ['Grabitt Guides', go('/community')], ['Economic Living', go('/community#economic-living')], ['Dos & Don\'ts', fp('policy')], ['Suggest Ideas', fp('suggest')]] },
  ]

  return (
    <>
    {/* Sponsor banner — every page, above the footer. Renders nothing when no
        sponsor banner is active. */}
    <BannerSlot position="sponsor_footer" aspect="4.5 / 1" />
    <footer style={{ background: 'var(--sand, #F5ECD7)', borderTop: '1px solid var(--sand2, #e8dcc0)', marginTop: 28, padding: '32px 20px 24px' }}>
      {/* All 5 heading columns stay on one row (never 4 + 1). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
        {cols.map(col => (
          <div key={col.heading}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark, #1a1a1a)', letterSpacing: 0.2, marginBottom: 12 }}>{col.heading}</div>
            {col.links.map(([label, onClick]) => (
              <button key={label} onClick={onClick} style={{ display: 'block', background: 'none', border: 'none', padding: '5px 0', fontFamily: 'var(--font-ui)', fontSize: 13, color: '#1a1a1a', cursor: 'pointer', textAlign: 'left' }}>{label}</button>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--sand2, #e8dcc0)', marginTop: 24, paddingTop: 18, textAlign: 'center' }}>
        <Logo height={30} style={{ margin: '0 auto' }} />
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#1a1a1a', marginTop: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="shield" size={14} strokeWidth={2} style={{ color: 'var(--success)' }} /> Every payment protected by the Grabitt Guarantee · Local to the Canaries</span>
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#1a1a1a', marginTop: 8 }}>
          © {new Date().getFullYear()} Grabitt. All rights reserved. ·{' '}
          <a href="/admin" style={{ color: '#1a1a1a', textDecoration: 'none' }}>Executive Suite</a>
        </div>
      </div>
    </footer>
    </>
  )
}
