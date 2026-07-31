'use client'
import { useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { t } from '@/lib/i18n'

// Affiliate dashboard: the member's unique referral link, their signups and
// earnings, and payout setup (Stripe Connect). Founding members are affiliates
// automatically. Only renders for affiliates.
type Mine = { isAffiliate: boolean; tier: string | null; code: string | null; hasPayoutAccount: boolean; foundingMember: boolean; signups: number; owedCents: number; paidCents: number; pointsEarned: number }
const eur = (c: number) => `€${(c / 100).toFixed(2)}`

export default function AffiliateCard() {
  const [mine, setMine] = useState<Mine | null>(null)
  const [copied, setCopied] = useState(false)
  const [payoutBusy, setPayoutBusy] = useState(false)

  useEffect(() => { trpcAuthed().affiliates.mine.query().then(d => setMine(d as unknown as Mine)).catch(() => {}) }, [])

  if (!mine || !mine.isAffiliate) return null
  const link = typeof window !== 'undefined' && mine.code ? `${window.location.origin}/join?ref=${mine.code}` : ''

  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} }

  const setupPayouts = async () => {
    setPayoutBusy(true)
    try {
      const c: any = trpcAuthed()
      const res = mine.hasPayoutAccount ? await c.users.payoutDashboardLink.mutate() : await c.users.createPayoutOnboarding.mutate()
      if (res?.url) window.location.href = res.url
    } catch {} finally { setPayoutBusy(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>🔗 {t('Affiliate — earn per signup')}</span>
        {mine.tier === 'founding' && <span style={{ background: '#FFF3EE', color: '#8a5a2a', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '2px 7px', borderRadius: 50 }}>⭐ {t('Founding')}</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#7a6c56', marginBottom: 12, lineHeight: 1.5 }}>
        {t('Share your link with friends & family. You earn a reward for every validated signup that comes through it.')}
      </div>

      {/* Link */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input readOnly value={link} style={{ flex: 1, minWidth: 0, border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 12, background: '#f9f6f2', color: '#555' }} />
        <button onClick={copy} style={{ background: copied ? 'var(--sage)' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>{copied ? t('Copied ✓') : t('Copy')}</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Stat label={t('Signups')} value={String(mine.signups)} />
        {mine.pointsEarned > 0 && <Stat label={t('Points')} value={String(mine.pointsEarned)} color="var(--orange)" />}
        <Stat label={t('Owed')} value={eur(mine.owedCents)} color="#16a34a" />
        <Stat label={t('Paid out')} value={eur(mine.paidCents)} />
      </div>

      {/* Payouts */}
      <button onClick={setupPayouts} disabled={payoutBusy} style={{ width: '100%', background: mine.hasPayoutAccount ? '#f0fdf4' : '#FFF3EE', border: `1px solid ${mine.hasPayoutAccount ? '#bbf7d0' : '#FFD4A0'}`, borderRadius: 12, padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
        <span style={{ fontSize: 18 }}>💳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: mine.hasPayoutAccount ? 'var(--sage)' : '#8a5a2a' }}>{payoutBusy ? t('Opening Stripe…') : mine.hasPayoutAccount ? t('Payout account connected — manage') : t('Set up payouts to get paid')}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#8a7d68', marginTop: 2 }}>{t('We pay affiliate earnings to your connected Stripe account.')}</div>
        </div>
        <span style={{ color: mine.hasPayoutAccount ? 'var(--sage)' : '#8a5a2a', fontWeight: 900, fontSize: 16 }}>›</span>
      </button>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, background: '#f9f6f2', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: color || 'var(--dark)' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
    </div>
  )
}
