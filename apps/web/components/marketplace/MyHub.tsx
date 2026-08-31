'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpcAuthed, setAuthToken } from '@/lib/authToken'
import { createClient } from '@/lib/supabase'
import { compressAndUpload } from '@/lib/storage'
import { toast } from '@/lib/ui'
import { usePanel } from '@/context/PanelContext'
import type { PanelId } from '@/context/PanelContext'
import Icon, { type IconName } from './Icon'
import { t } from '@/lib/i18n'

// ── My Hub ───────────────────────────────────────────────────────────────────
// Self-contained dashboard card (profile sidebar + Sales / Orders / Purchasing
// pills) with a list panel directly below that fills in when a card is clicked.
// User-agnostic — works for personal and business accounts alike.

type MetricKey = 'sales' | 'sold' | 'beingWatched' | 'orders' | 'toShip' | 'incomeDue' | 'purchased' | 'watching' | 'toPay'

const SALES_C = { color: '#2e8b3d', tint: '#e8f3e9' }
const ORDERS_C = { color: '#3b6fd4', tint: '#e8effb' }
const PURCH_C = { color: '#7b4fc9', tint: '#f0eaf9' }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }
const cardHead: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
const navLinkBtn: React.CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--orange)', fontWeight: 800, fontFamily: 'var(--font-nunito)', fontSize: 11.5, whiteSpace: 'nowrap' }
function Muted({ children }: { children: React.ReactNode }) { return <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#aaa', padding: '16px 0', textAlign: 'center' }}>{children}</div> }

function HubNavRow({ icon, label, value, iconColor, last }: { icon: IconName; label: string; value: React.ReactNode; iconColor?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 2px', borderBottom: last ? 'none' : '1px dotted rgba(180,120,60,0.35)' }}>
      <span style={{ color: iconColor ?? 'var(--orange)', display: 'inline-flex', flexShrink: 0 }}><Icon name={icon} size={16} strokeWidth={2} /></span>
      <span style={{ flexShrink: 0, fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: '#6a5a48', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  )
}

function ColHeader({ icon, title, color, tint }: { icon: IconName; title: string; color: string; tint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ width: 34, height: 34, borderRadius: '50%', background: tint, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={17} strokeWidth={2.2} /></span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 900, color: '#1e2b55', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</span>
    </div>
  )
}

function MetricCard({ metricKey, label, icon, color, tint, onClick }: { metricKey: MetricKey; label: string; icon: IconName; color: string; tint: string; onClick: () => void }) {
  const [data, setData] = useState<{ value: number; currency: boolean } | null>(null)
  useEffect(() => {
    let live = true
    ;(trpcAuthed() as any).users.hubMetric.query({ key: metricKey }).then((d: any) => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [metricKey])
  const val = data ? (data.currency ? `€${Number(data.value).toLocaleString()}` : String(data.value)) : '—'
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: '#fff', border: '1px solid #eef0f4', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(30,43,85,0.05)', textAlign: 'left' }}>
      <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: tint, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={19} strokeWidth={2} /></span>
      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, color: '#334', textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label} - <span style={{ color, fontWeight: 900 }}>{val}</span>
      </span>
    </button>
  )
}

function HubListView({ hubKey, title }: { hubKey: MetricKey; title: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    let live = true
    setRows(null)
    ;(trpcAuthed() as any).users.hubList.query({ key: hubKey }).then((d: any) => { if (live) setRows(d as any[]) }).catch(() => { if (live) setRows([]) })
    return () => { live = false }
  }, [hubKey])
  return (
    <div style={{ ...card, marginTop: 14 }}>
      <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between' }}><span>{title}</span>{rows && <span style={{ color: 'var(--orange)' }}>{rows.length}</span>}</div>
      {rows === null ? <Muted>{t('Loading…')}</Muted> : rows.length === 0 ? <Muted>{t('Nothing here yet.')}</Muted> : rows.map((r: any, i: number) => (
        <Link key={r.listingId + i} href={`/listings/${r.listingId}`} style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.image ? <img src={r.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>{r.subtitle}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>{r.price}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function MyHub({ me, onReload }: { me: any; onReload: () => void }) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [hubView, setHubView] = useState<MetricKey | null>(null)
  const [hubTitle, setHubTitle] = useState('')
  const openHub = (key: MetricKey, title: string) => {
    // Just swap the list content below — don't move the page.
    setHubView(key); setHubTitle(title)
  }


  const avatarInput = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !me?.id) return
    setAvatarBusy(true)
    try {
      const url = await compressAndUpload(file, `avatars/${me.id}/${crypto.randomUUID()}.jpg`)
      await trpcAuthed().users.updateProfile.mutate({ avatar: url })
      onReload()
    } catch { toast(t('Could not upload your photo. Please try again.')) }
    finally { setAvatarBusy(false); if (avatarInput.current) avatarInput.current.value = '' }
  }
  const toggleOpenToWork = async () => {
    try { await trpcAuthed().users.updateProfile.mutate({ openToWork: !me?.openToWork }); onReload() }
    catch { toast(t('Could not update. Please try again.')) }
  }
  const logout = async () => {
    try { await createClient().auth.signOut() } catch {}
    setAuthToken(null)
    if (typeof window !== 'undefined') localStorage.removeItem('grabitt_uid')
    router.push('/')
  }

  const memberRef = me?.id ? `M${String(me.id).replace(/-/g, '').slice(0, 6).toUpperCase()}` : ''
  const accountType = me?.memberStatus === 'blue_light' ? 'Bluelight' : me?.memberStatus === 'student' ? 'Student' : me?.memberStatus === 'charity' ? 'Charity' : 'Regular'

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '10px 0 42px' }}>
        <span style={{ width: 34, height: 3, borderRadius: 2, background: '#1e2b55' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 900, color: '#1e2b55', letterSpacing: 3 }}>{t('MY HUB')}</span>
        <span style={{ width: 34, height: 3, borderRadius: 2, background: '#1e2b55' }} />
      </div>

      <div style={{ position: 'relative', background: '#f4f6fb', borderRadius: 20, padding: '48px 16px 22px', boxShadow: '0 6px 24px rgba(30,43,85,0.07)' }}>
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#ffe0bb', color: 'var(--orange)', borderRadius: 999, padding: '8px 22px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>{t('Dashboard')}</div>

        <div className="myhub-grid" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
          {/* Profile sidebar — pale orange */}
          <div style={{ background: '#ffe0bb', borderRadius: 16, padding: 16, color: 'var(--dark)', alignSelf: 'start' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <button onClick={() => avatarInput.current?.click()} title={t('Change photo')} aria-label={t('Change photo')} style={{ position: 'relative', width: 48, height: 48, borderRadius: '50%', background: 'var(--orange)', overflow: 'hidden', flexShrink: 0, border: 'none', padding: 0, cursor: 'pointer' }}>
                {me?.avatar ? <img src={me.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="user" size={22} strokeWidth={2} /></span>}
                <span style={{ position: 'absolute', right: -1, bottom: -1, width: 18, height: 18, borderRadius: '50%', background: 'var(--dark)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #ffe0bb' }}><Icon name="pencil" size={9} strokeWidth={2.5} /></span>
                {avatarBusy && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, color: '#fff' }}>…</span>}
              </button>
              <input ref={avatarInput} type="file" accept="image/*" onChange={onPickAvatar} style={{ display: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 900, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me?.businessName || me?.displayName || t('Your account')}</div>
                <button onClick={() => openPanel('myRatings' as PanelId)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: '#8a6d3b' }}>{t('Rating')} ⭐ {me?.avgRating ? Number(me.avgRating).toFixed(1) : '—'}</button>
              </div>
            </div>
            <HubNavRow icon="user" label={t('Account type')} value={me?.isBusiness ? t('Business') : accountType} />
            <HubNavRow icon="file" label={t('Account ref')} value={memberRef} />
            <HubNavRow icon="shield" iconColor="#16a34a" label={t('Verified')} value={me?.isVerified
              ? <span style={{ color: '#16a34a', fontWeight: 800 }}>{t('Yes')}</span>
              : <button onClick={() => openPanel('verifyMe' as PanelId)} style={navLinkBtn}>{t('Get verified')}</button>} />
            <HubNavRow icon="wrench" label={t('Work required')} value={
              <button onClick={toggleOpenToWork} style={{ ...navLinkBtn, color: me?.openToWork ? '#16a34a' : '#6a5a48' }}>
                {me?.openToWork ? t('Looking') : t('Not looking')}
              </button>} />
            <HubNavRow icon="briefcase" label={t('Business acc')} last value={
              <button onClick={() => router.push(me?.isBusiness ? '/account?tab=business' : '/for-business')} style={navLinkBtn}>
                {me?.isBusiness ? t('Open') : t('Add / Upgrade')}
              </button>} />
            <button onClick={logout} style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 10, padding: '9px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
              <Icon name="login" size={14} strokeWidth={2.4} /> {t('Log out')}
            </button>
          </div>

          {/* Sales */}
          <div className="myhub-col">
            <ColHeader icon="chart" title={t('Sales')} {...SALES_C} />
            <div style={{ display: 'grid', gap: 12 }}>
              <MetricCard metricKey="sales" label={t('Sales')} icon="trendingUp" {...SALES_C} onClick={() => openHub('sales', t('Sales'))} />
              <MetricCard metricKey="sold" label={t('Sold')} icon="cart" {...SALES_C} onClick={() => openHub('sold', t('Sold'))} />
              <MetricCard metricKey="beingWatched" label={t('Being watched')} icon="heart" {...SALES_C} onClick={() => openHub('beingWatched', t('Being watched'))} />
            </div>
          </div>

          {/* Orders */}
          <div className="myhub-col">
            <ColHeader icon="clipboard" title={t('Orders')} {...ORDERS_C} />
            <div style={{ display: 'grid', gap: 12 }}>
              <MetricCard metricKey="orders" label={t('Orders')} icon="package" {...ORDERS_C} onClick={() => openHub('orders', t('Orders'))} />
              <MetricCard metricKey="toShip" label={t('To ship')} icon="truck" {...ORDERS_C} onClick={() => openHub('toShip', t('To ship'))} />
              <MetricCard metricKey="incomeDue" label={t('Income due')} icon="coins" {...ORDERS_C} onClick={() => openHub('incomeDue', t('Income due'))} />
            </div>
          </div>

          {/* Purchasing */}
          <div className="myhub-col">
            <ColHeader icon="award" title={t('Purchasing')} {...PURCH_C} />
            <div style={{ display: 'grid', gap: 12 }}>
              <MetricCard metricKey="purchased" label={t('Purchased')} icon="tag" {...PURCH_C} onClick={() => openHub('purchased', t('Purchased'))} />
              <MetricCard metricKey="watching" label={t('Watching')} icon="eye" {...PURCH_C} onClick={() => openHub('watching', t('Watching'))} />
              <MetricCard metricKey="toPay" label={t('To pay')} icon="wallet" {...PURCH_C} onClick={() => openHub('toPay', t('To pay'))} />
            </div>
          </div>
        </div>
      </div>

      {/* Clicked-card list */}
      <div id="myhub-list">
        {hubView && <HubListView hubKey={hubView} title={hubTitle} />}
      </div>

      <style>{`
        @media (min-width: 880px){
          .myhub-grid{ grid-template-columns: 240px 1fr 1fr 1fr !important; align-items: start; }
          .myhub-col{ padding: 0 16px; }
          .myhub-col + .myhub-col{ border-left: 1px solid #e2e6ef; }
        }
      `}</style>
    </div>
  )
}
