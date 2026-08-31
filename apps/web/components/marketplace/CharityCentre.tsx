'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpcAuthed } from '@/lib/authToken'
import { usePanel } from '@/context/PanelContext'
import { t } from '@/lib/i18n'
import Icon from './Icon'
import type { PanelId } from '@/context/PanelContext'

// The back-office Charity Hub — the charity equivalent of the Business Centre,
// reached from Account. Charities get a storefront that carries their details,
// capture their registration info here, pay 0% selling fees, and see a simple
// fundraising snapshot. Only rendered for charity accounts.
type CharityData = {
  isCharity: boolean
  displayName: string | null
  regName: string | null
  regNo: string | null
  country: string | null
  storefront: { slug: string; published: boolean } | null
  stats: { activeListings: number; soldCount: number; raisedCents: number }
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16, marginBottom: 14 }
const field: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontFamily: 'var(--font-ui)', fontSize: 13, boxSizing: 'border-box' }
const label: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#666', marginBottom: 4 }

export default function CharityCentre() {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [data, setData] = useState<CharityData | null>(null)
  const [form, setForm] = useState({ regName: '', regNo: '', country: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = () => trpcAuthed().charity.mine.query()
    .then((d) => {
      setData(d as CharityData)
      setForm({ regName: d.regName ?? '', regNo: d.regNo ?? '', country: d.country ?? '' })
    })
    .catch(() => {})
  useEffect(() => { load() }, [])

  async function saveDetails() {
    setSaving(true); setSaved(false)
    try {
      await trpcAuthed().charity.saveDetails.mutate({ regName: form.regName, regNo: form.regNo, country: form.country })
      setSaved(true)
      await load()
    } finally { setSaving(false) }
  }

  if (!data) return <div style={{ fontFamily: 'var(--font-ui)', color: '#999', padding: 20 }}>{t('Loading…')}</div>
  if (!data.isCharity) return null

  const s = data.stats
  const raised = `€${(s.raisedCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  const detailsComplete = !!(data.regName && data.regNo && data.country)

  return (
    <div>
      {/* Header — charity status + 0% fees, in a rose theme to distinguish it. */}
      <div style={{ ...card, background: 'linear-gradient(135deg,#fff1f5,#ffe6ee)', border: '1px solid #ffd0de' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#fdeaf0', color: '#e11d74', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>❤️</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 800, color: '#7a1236' }}>{t('Charity Hub')}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#a15' }}>{data.regName || data.displayName || t('Your charity')} · {t('0% selling fees')}</div>
          </div>
        </div>
      </div>

      {/* Fundraising snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {([[raised, t('Raised')], [String(s.soldCount), t('Items sold')], [String(s.activeListings), t('Live listings')]] as [string, string][]).map(([v, k]) => (
          <div key={k} style={{ ...card, marginBottom: 0, textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 800, color: '#e11d74' }}>{v}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>

      {/* Storefront — same as a business, carrying the charity's details */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="building" size={16} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{t('Your storefront')}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777', marginBottom: 10 }}>
          {t('Your charity gets a storefront just like a business — your page to showcase your cause and everything you have listed.')}
        </div>
        {data.storefront?.slug
          ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => router.push(`/shop/${data.storefront!.slug}`)} style={btnPrimary}>{t('View shop')}</button>
              <button onClick={() => openPanel('storefrontEdit' as PanelId)} style={btnGhost}>{t('Edit storefront')}</button>
            </div>
          : <button onClick={() => openPanel('storefrontEdit' as PanelId)} style={btnPrimary}>{t('Set up storefront')}</button>}
      </div>

      {/* Charity registration details */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="shield" size={16} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>{t('Charity registration details')}</span>
          {detailsComplete && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#16a34a' }}>✓ {t('Complete')}</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777', marginBottom: 12 }}>
          {t('Tell us who you are. These details appear on your storefront and help members trust your cause.')}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={label}>{t('Registered charity name')}</label>
            <input value={form.regName} onChange={e => setForm(f => ({ ...f, regName: e.target.value }))} placeholder={t('e.g. Canary Islands Animal Rescue')} style={field} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={label}>{t('Charity / registration number')}</label>
              <input value={form.regNo} onChange={e => setForm(f => ({ ...f, regNo: e.target.value }))} placeholder="G-12345678" style={field} />
            </div>
            <div>
              <label style={label}>{t('Country of registration')}</label>
              <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder={t('Spain')} style={field} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button onClick={saveDetails} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? t('Saving…') : t('Save details')}</button>
          {saved && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>✓ {t('Saved')}</span>}
        </div>
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg,#e11d74,#f0518f)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#e11d74', border: '1.5px solid #ffd0de', borderRadius: 12, padding: '10px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
