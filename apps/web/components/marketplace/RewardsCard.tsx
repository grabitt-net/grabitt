'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpcAuthed } from '@/lib/authToken'
import { createLooseTrpcClient } from '@/lib/trpc'
import { usePanel } from '@/context/PanelContext'
import { t } from '@/lib/i18n'

// Rewards dashboard card: the credits balance, admin-managed ways to earn, and
// redemption options (listing upgrades / a temporary fee reduction).
type Rule = { id: string; icon: string; title: string; subtitle: string; amount: number; actionLabel: string | null; actionKey: string | null }
type Option = { id: string; kind: string; title: string; description: string; costCredits: number; config: any }
type Mine = { balance: number; totalEarned: number; feeReduction: { pct: number; until: string } | null; events: { id: string; kind: string; delta: number; note: string | null; createdAt: string }[] }
type MyListing = { id: string; title: string; status: string }

export default function RewardsCard() {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [tab, setTab] = useState<'earn' | 'redeem'>('earn')
  const [mine, setMine] = useState<Mine | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [options, setOptions] = useState<Option[]>([])
  const [listings, setListings] = useState<MyListing[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [pickFor, setPickFor] = useState<Option | null>(null)
  const [msg, setMsg] = useState('')

  const loadMine = () => trpcAuthed().rewards.mine.query().then(d => setMine(d as unknown as Mine)).catch(() => {})
  useEffect(() => {
    loadMine()
    createLooseTrpcClient().rewards.earnRules.query().then(d => setRules(d as unknown as Rule[])).catch(() => {})
    createLooseTrpcClient().rewards.redeemOptions.query().then(d => setOptions(d as unknown as Option[])).catch(() => {})
    trpcAuthed().listings.mine.query().then((d: any) => setListings((d as MyListing[]).filter(l => l.status === 'active' || l.status === 'grab_it_now'))).catch(() => {})
  }, [])

  const earned = mine?.totalEarned ?? 0
  const balance = mine?.balance ?? 0

  const runAction = useCallback((key: string | null | undefined) => {
    const k = key?.trim().toLowerCase().replace(/\s+/g, '_') ?? ''
    const actions: Record<string, () => void> = {
      invite: () => openPanel('invite'),
      invite_friend: () => openPanel('invite'),
      referral: () => openPanel('invite'),
      share: () => openPanel('invite'),
      sell: () => openPanel('sell'),
      list: () => openPanel('sell'),
      listing: () => openPanel('sell'),
      browse: () => router.push('/'),
      shop: () => router.push('/'),
      chat: () => router.push('/account?section=messages&thread=team'),
      message: () => router.push('/account?section=messages&thread=team'),
      help: () => openPanel('help'),
    }
    actions[k]?.()
  }, [openPanel, router])

  const redeem = async (opt: Option, listingId?: string) => {
    setBusy(opt.id); setMsg('')
    try {
      await trpcAuthed().rewards.redeem.mutate({ optionId: opt.id, ...(listingId ? { listingId } : {}) })
      setMsg(`✓ ${opt.title} redeemed`)
      setPickFor(null)
      loadMine()
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : 'Could not redeem')
    } finally { setBusy(null) }
  }

  const feeUntil = mine?.feeReduction ? new Date(mine.feeReduction.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null

  return (
    <div id="rewards" style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }}>
      {/* Balance header */}
      <div style={{ background: 'linear-gradient(135deg,var(--orange),var(--orange2))', borderRadius: 14, padding: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 30 }}>🎁</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 24, fontWeight: 900 }}>{balance.toLocaleString()}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('reward credits')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900 }}>+{earned.toLocaleString()}</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9.5, opacity: 0.85, fontWeight: 800, textTransform: 'uppercase' }}>{t('earned')}</div>
        </div>
      </div>

      {mine?.feeReduction && (
        <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#16a34a' }}>
          🎉 {t('Active reward')}: −{mine.feeReduction.pct}% {t('selling fee until')} {feeUntil}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: '#f5f0e8', borderRadius: 50, padding: 4, margin: '12px 0' }}>
        {([['earn', t('Ways to earn')], ['redeem', t('Redeem')]] as [typeof tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setMsg('') }} style={{ flex: 1, border: 'none', background: tab === id ? '#fff' : 'transparent', color: tab === id ? 'var(--dark)' : '#888', borderRadius: 50, padding: '7px 0', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      {msg && <div style={{ marginBottom: 10, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: msg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{msg}</div>}

      {tab === 'earn' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 2px' }}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{r.title}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a' }}>{r.subtitle}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: '#22c55e', whiteSpace: 'nowrap' }}>+{r.amount}</div>
              {r.actionLabel && (
                <button type="button" onClick={() => runAction(r.actionKey)} style={{ background: '#FFF3EE', border: '1px solid #FFD4A0', borderRadius: 50, padding: '5px 11px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#8a5a2a', cursor: 'pointer', whiteSpace: 'nowrap' }}>{r.actionLabel}</button>
              )}
            </div>
          ))}
          {rules.length === 0 && <Muted>{t('No rewards available right now.')}</Muted>}
        </div>
      )}

      {tab === 'redeem' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map(o => {
            const affordable = balance >= o.costCredits
            return (
              <div key={o.id} style={{ border: '1px solid #f0ebe4', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>{o.kind === 'fee_reduction' ? '📉' : '🚀'} {o.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--orange)', whiteSpace: 'nowrap' }}>{o.costCredits} cr</div>
                </div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', marginTop: 3, lineHeight: 1.5 }}>{o.description}</div>
                {pickFor?.id === o.id ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 5 }}>{t('Choose a listing')}</div>
                    {listings.length === 0 ? <Muted>{t('No active listings to upgrade.')}</Muted> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {listings.map(l => (
                          <button key={l.id} disabled={busy === o.id} onClick={() => redeem(o, l.id)} style={{ textAlign: 'left', background: '#f9f6f2', border: '1px solid #efe7db', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 700, color: 'var(--dark)', cursor: 'pointer' }}>{l.title}</button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setPickFor(null)} style={{ marginTop: 6, background: 'none', border: 'none', color: '#999', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{t('Cancel')}</button>
                  </div>
                ) : (
                  <button
                    disabled={!affordable || busy === o.id}
                    onClick={() => o.kind === 'listing_upgrade' ? setPickFor(o) : redeem(o)}
                    style={{ marginTop: 9, width: '100%', background: affordable ? 'var(--orange)' : '#e6ddce', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 0', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: affordable ? 'pointer' : 'not-allowed' }}>
                    {busy === o.id ? t('Redeeming…') : affordable ? t('Redeem') : t('Not enough credits')}
                  </button>
                )}
              </div>
            )
          })}
          {options.length === 0 && <Muted>{t('No redemption options right now.')}</Muted>}
        </div>
      )}
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '12px 0', textAlign: 'center' }}>{children}</div>
}
