'use client'
import { usePanel } from '@/context/PanelContext'
import Logo from './Logo'

// Site footer — grouped links, brand, and trust line. Links open the existing
// info panels so content stays consistent with the rest of the app.
export default function Footer() {
  const { openPanel } = usePanel()
  const fp = (key: string) => () => openPanel('footer', { key })

  const cols: { heading: string; links: [string, () => void][] }[] = [
    { heading: 'Grabitt', links: [['About Us', fp('about')], ['Why Us?', fp('why')], ['Pricing', fp('pricing')], ['Contact', fp('contact')]] },
    { heading: 'Buying & Selling', links: [['Sell an item', () => openPanel('sell')], ['Buy Credits', () => openPanel('buyCredits')], ['Delivery', fp('collection')], ['Sold prices', () => openPanel('soldprices')]] },
    { heading: 'Safety', links: [['Grabitt Guarantee', () => openPanel('shield')], ['Scam Centre', fp('scams')], ['Report a listing', () => openPanel('report')], ['My Disputes', () => openPanel('myDisputes')]] },
    { heading: 'Help', links: [['Help Centre', () => openPanel('help')], ['Terms', fp('terms')], ['Dos & Don\'ts', fp('policy')], ['Suggest Ideas', fp('suggest')]] },
  ]

  return (
    <footer style={{ background: 'var(--sand, #F5ECD7)', borderTop: '1px solid var(--sand2, #e8dcc0)', marginTop: 28, padding: '32px 20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
        {cols.map(col => (
          <div key={col.heading}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: 'var(--dark, #1a1a1a)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{col.heading}</div>
            {col.links.map(([label, onClick]) => (
              <button key={label} onClick={onClick} style={{ display: 'block', background: 'none', border: 'none', padding: '5px 0', fontFamily: 'var(--font-ui)', fontSize: 13, color: '#6b5d48', cursor: 'pointer', textAlign: 'left' }}>{label}</button>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--sand2, #e8dcc0)', marginTop: 24, paddingTop: 18, textAlign: 'center' }}>
        <Logo height={30} style={{ margin: '0 auto' }} />
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8a7d68', marginTop: 4 }}>
          🛡️ Every payment protected by the Grabitt Guarantee · Made in Gran Canaria
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#a89a82', marginTop: 8 }}>
          © {new Date().getFullYear()} Grabitt. All rights reserved. ·{' '}
          <a href="/admin" style={{ color: '#a89a82', textDecoration: 'none' }}>Executive Suite</a>
        </div>
      </div>
    </footer>
  )
}
