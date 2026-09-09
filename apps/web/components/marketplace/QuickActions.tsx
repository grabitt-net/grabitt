'use client'
import { useRouter, usePathname } from 'next/navigation'
import { usePanel } from '@/context/PanelContext'
import { t } from '@/lib/i18n'
import { bannerPageKey } from '@/lib/bannerPages'
import BannerSlot from './BannerSlot'
import Icon, { type IconName } from './Icon'

// Persistent quick-actions bar — Sponsorship / Recruitment / Property / For
// Business. Rendered under the header on every main page. Find Work + Find Staff
// are consolidated into the Recruitment page; For Business points at /for-business.
export default function QuickActions({ belowPromo }: { belowPromo?: React.ReactNode } = {}) {
  const { openPanel } = usePanel()
  const router = useRouter()
  const page = bannerPageKey(usePathname())

  const actions: { label: string; icon: IconName; action: () => void }[] = [
    { label: 'Recruitment', icon: 'briefcase', action: () => router.push('/jobs') },
    { label: 'Property', icon: 'building', action: () => router.push('/property') },
    // Sponsorship now lives inside the For Business page.
    { label: 'For Business', icon: 'star', action: () => router.push('/for-business') },
  ]

  return (
    <section style={{ padding: '12px 14px 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {actions.map(a => (
          <button
            key={a.label}
            onClick={a.action}
            style={{
              // Match the trust-badge cards (TrustStrip): white card, soft border
              // + shadow, an icon tile on the left with a bold label beside it.
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              background: '#fff', border: '1px solid #ece3d7', borderRadius: 14,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '12px 14px',
              cursor: 'pointer', width: '100%',
            }}
          >
            <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, background: 'var(--sand)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a.icon} size={21} strokeWidth={2} />
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{t(a.label)}</span>
          </button>
        ))}
      </div>

      {/* Grabitt Now promo — shown on every page, below the pills */}
      <button
        onClick={() => router.push('/grabitt-now')}
        style={{
          width: '100%', marginTop: 10, background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
          color: '#fff', border: 'none', borderRadius: 'var(--radius)',
          padding: '15px 18px', fontFamily: 'var(--font-display)', fontSize: 17,
          fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', boxShadow: '0 6px 18px rgba(245,84,10,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        <Icon name="zap" size={19} strokeWidth={2} />
        <span>{t('Grabitt NOW! Limited Time Offers')}</span>
        <Icon name="zap" size={19} strokeWidth={2} />
      </button>

      {/* Optional page hero (category / recruitment / property) sits directly
          below the Grabitt NOW button, full width, above the paid banners. */}
      {belowPromo && <div style={{ margin: '0 -14px' }}>{belowPromo}</div>}

      {/* Sponsor banner — every page, below the hero / Grabitt Now promo. Renders
          nothing when no sponsor banner is active. Constrained to the same centred
          1000px footprint as the hero so it lines up to a matching size. */}
      <div style={{ maxWidth: 1000, margin: '10px auto 0', padding: '0 4px', width: '100%', boxSizing: 'border-box' }}><BannerSlot position="sponsor_top" page={page} aspect="1053 / 163" padded={false} /></div>
    </section>
  )
}
