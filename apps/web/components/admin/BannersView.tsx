'use client'
import { Fragment, useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'
import ImageUploadField from './ImageUploadField'
import { BANNER_PAGE_OPTIONS, BANNER_CATEGORY_OPTIONS, BANNER_CATEGORY_SLUGS } from '@/lib/bannerPages'
import { BANNER_ASPECTS, recommendedSize } from '@/components/marketplace/BannerSlot'

// The exact upload size for a placement, e.g. "2000 × 444 px · 4.5/1". Design
// the banner to this and it fills the slot edge-to-edge with no cropping.
const sizeHint = (position: string) => {
  const aspect = BANNER_ASPECTS[position] ?? '1053 / 163'
  return `${recommendedSize(aspect).label} · ${aspect.replace(/\s/g, '')}`
}
// Exact pixel target for the uploader's dimension check.
const expectSize = (position: string) => {
  const { w, h } = recommendedSize(BANNER_ASPECTS[position] ?? '1053 / 163')
  return { w, h }
}

// Every sellable/placeable banner position, with a friendly label. Order groups
// them by area so the admin reads them like a map of the site.
const POSITIONS: [string, string][] = [
  ['home_top', 'Homepage hero (top)'],
  ['home_mid', 'Homepage — mid feed'],
  ['category', 'Category — top banner (Category Sponsor)'],
  ['category_footer', 'Category — bottom banner'],
  ['search_top', 'Search — top banner'],
  ['search_footer', 'Search — bottom banner'],
  ['sticky_bottom', 'Sticky bottom bar (site-wide)'],
  ['similar_items', 'Similar-items sponsored'],
  ['seller_dashboard', 'Seller dashboard'],
  ['user_dashboard', 'User dashboard'],
  ['checkout', 'Checkout (non-intrusive)'],
  ['messages', 'Message centre'],
  ['notifications', 'Notifications popup'],
  ['jobs', 'Recruitment page'],
  ['sponsor_footer', 'Featured Partner (footer)'],
]
const POS_LABEL = Object.fromEntries(POSITIONS)

interface Banner { id: string; title: string; imageUrl: string; linkUrl: string | null; active: boolean; approved?: boolean; isTest?: boolean; position: string; pageTarget?: string | null; pages?: string[]; startsAt: string | null; endsAt: string | null; clickCount?: number; impressions?: number }
interface Slot { id: string; label: string; monthlyCents: number; cap: number; exclusive: boolean; perPage: boolean; scope: string; active: boolean; pages?: string[] }
interface Booking { id: string; userId: string; position: string; pageTarget?: string | null; months: number; startsAt: string; endsAt: string; amountCents: number; createdByAdmin: boolean; user?: { displayName?: string; email?: string; businessName?: string } }

const EMPTY = { title: '', imageUrl: '', linkUrl: '', position: 'home_top', pageTarget: '', pages: [] as string[], active: true, isTest: false, startsAt: '', endsAt: '' }
const eur = (c: number) => `€${(c / 100).toFixed(0)}`

export default function BannersView({ initialPosition }: { initialPosition?: string | null }) {
  const api = useCrmApi()
  const [tab, setTab] = useState<'banners' | 'pricing' | 'bookings'>('banners')
  const [banners, setBanners] = useState<Banner[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [testMode, setTestMode] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const startEdit = (b: Banner) => {
    setEditId(b.id)
    setForm({
      title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? '', position: b.position,
      pageTarget: b.pageTarget ?? '', pages: b.pages ?? [], active: b.active, isTest: !!b.isTest,
      startsAt: b.startsAt ? b.startsAt.slice(0, 10) : '', endsAt: b.endsAt ? b.endsAt.slice(0, 10) : '',
    })
    setShowAdd(true)
  }
  const startAdd = () => { setEditId(null); setForm({ ...EMPTY }); setShowAdd(v => !v) }

  const load = () => api.banners().then(b => {
    const rows = ((b ?? []) as Banner[]).slice().sort((x, y) => Number(x.approved !== false) - Number(y.approved !== false))
    setBanners(rows)
  }).catch(() => {})
  const loadSlots = () => api.bannerCatalog().then(s => setSlots((s ?? []) as Slot[])).catch(() => {})
  const loadConfig = () => api.bannerConfig().then((c: { testMode?: boolean }) => { setTestMode(!!c?.testMode) }).catch(() => {})
  const loadBookings = () => api.bannerBookings().then(b => setBookings((b ?? []) as Booking[])).catch(() => {})

  useEffect(() => { load(); loadSlots(); loadConfig(); loadBookings() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialPosition) { setForm({ ...EMPTY, position: initialPosition }); setShowAdd(true) } }, [initialPosition])

  async function save() {
    if (!form.title.trim() || !form.imageUrl.trim()) return
    setSaving(true)
    try {
      await api.upsertBanner({
        ...(editId ? { id: editId } : {}),
        title: form.title.trim(), imageUrl: form.imageUrl.trim(), linkUrl: form.linkUrl.trim() || undefined,
        position: form.position, pageTarget: form.pageTarget.trim() || undefined, active: form.active, isTest: form.isTest,
        pages: form.pages,
        startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined,
      })
      setForm({ ...EMPTY }); setEditId(null); setShowAdd(false); await load()
    } finally { setSaving(false) }
  }
  async function toggle(b: Banner) {
    await api.upsertBanner({ id: b.id, title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl || undefined, position: b.position, pageTarget: b.pageTarget || undefined, pages: b.pages ?? [], active: !b.active, isTest: b.isTest })
    load()
  }
  // Toggle which pages a site-wide banner shows on, straight from its card.
  // pages[] is an explicit allow-list; empty = every page.
  async function savePages(b: Banner, pages: string[]) {
    setBanners(prev => prev.map(x => x.id === b.id ? { ...x, pages } : x)) // optimistic
    await api.upsertBanner({ id: b.id, title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl || undefined, position: b.position, pageTarget: b.pageTarget || undefined, pages, active: b.active, isTest: b.isTest })
    load()
  }
  async function remove(id: string) { await api.removeBanner(id); load() }
  async function setApproved(b: Banner, approved: boolean) { await api.approveBanner(b.id, approved); load() }

  async function toggleTestMode() { const next = !testMode; setTestMode(next); await api.saveBannerConfig({ testMode: next }); }
  async function saveSlot(id: string, patch: { monthlyCents?: number; cap?: number; active?: boolean; pages?: string[] }) {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    await api.saveBannerConfig({ slots: { [id]: patch } })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}><span style={{ color: 'var(--orange)' }}>Banner</span> Advertising</h2>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Every banner area, its sponsors, pricing, bookings and a pre-launch preview mode.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Pre-launch preview: empty slots render a labelled placeholder site-wide */}
          <button onClick={toggleTestMode} title="Show a labelled placeholder in every empty slot so you can see where all banners sit" style={{ background: testMode ? '#16a34a' : '#f5f5f5', color: testMode ? '#fff' : '#666', border: 'none', borderRadius: 50, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            {testMode ? '● Preview mode ON' : '○ Preview mode OFF'}
          </button>
          <button onClick={startAdd} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>+ New / test banner</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['banners', 'pricing', 'bookings'] as const).map(tt => (
          <button key={tt} onClick={() => setTab(tt)} style={{ border: 'none', borderRadius: 50, padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, background: tab === tt ? '#1a1a1a' : '#f0ece5', color: tab === tt ? '#fff' : '#666' }}>
            {tt === 'banners' ? `Live banners (${banners.length})` : tt === 'pricing' ? 'Slots & pricing' : `Bookings (${bookings.length})`}
          </button>
        ))}
      </div>

      {showAdd && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, marginBottom: 12 }}>{editId ? 'Edit banner' : 'Add banner'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
            <Field label="Title"><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} /></Field>
            <Field label="Placement">
              <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} style={inp}>
                {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l} · {sizeHint(v)}</option>)}
              </select>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--orange)', marginTop: 5 }}>
                📐 Design your banner to exactly {sizeHint(form.position)} and it fills the slot edge-to-edge with no cropping. One image, no separate mobile/desktop versions (it scales to every screen).
              </div>
            </Field>
            <Field label="Page target (optional — for category slots, e.g. motors)"><input value={form.pageTarget} onChange={e => setForm(f => ({ ...f, pageTarget: e.target.value }))} placeholder="blank = site-wide" style={inp} /></Field>
            {(
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Show on pages (none ticked = every page)">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                    {BANNER_PAGE_OPTIONS.map(([key, label]) => {
                      const checked = key === 'category'
                        ? (form.pages.includes('category') || form.pages.some(p => BANNER_CATEGORY_SLUGS.includes(p)))
                        : form.pages.includes(key)
                      return (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#444', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={e => setForm(f => {
                          if (key === 'category') {
                            const rest = f.pages.filter(p => p !== 'category' && !BANNER_CATEGORY_SLUGS.includes(p))
                            return { ...f, pages: e.target.checked ? [...rest, 'category'] : rest }
                          }
                          return { ...f, pages: e.target.checked ? [...f.pages, key] : f.pages.filter(p => p !== key) }
                        })} />
                        {label}
                      </label>
                      )
                    })}
                  </div>
                  {(form.pages.includes('category') || form.pages.some(p => BANNER_CATEGORY_SLUGS.includes(p))) && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e6ddcf' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: '#c2410c', marginBottom: 6 }}>Which categories? (none = all category pages)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                        {BANNER_CATEGORY_OPTIONS.map(([slug, label]) => (
                          <label key={slug} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#444', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.pages.includes(slug)} onChange={e => setForm(f => {
                              // Picking a specific category drops the generic key.
                              const base = f.pages.filter(p => p !== 'category')
                              return { ...f, pages: e.target.checked ? [...base, slug] : base.filter(p => p !== slug) }
                            })} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </Field>
              </div>
            )}
            <div />
            <div style={{ gridColumn: '1/-1' }}><ImageUploadField label={`Banner image (${sizeHint(form.position)})`} kind="banner" expect={expectSize(form.position)} value={form.imageUrl} onChange={url => setForm(f => ({ ...f, imageUrl: url }))} /></div>
            <div style={{ gridColumn: '1/-1' }}><Field label="Link URL (optional)"><input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://… or /listings" style={inp} /></Field></div>
            <Field label="Start date"><input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} style={inp} /></Field>
            <Field label="End date"><input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} style={inp} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Live immediately
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#b45309', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isTest} onChange={e => setForm(f => ({ ...f, isTest: e.target.checked }))} /> Test banner (only shows in Preview mode)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={() => { setShowAdd(false); setEditId(null) }} style={ghostBtn}>Cancel</button>
            <button onClick={save} disabled={saving || !form.title || !form.imageUrl} style={{ ...primaryBtn, opacity: saving || !form.title || !form.imageUrl ? 0.6 : 1 }}>{saving ? 'Saving…' : editId ? 'Update banner' : 'Add banner'}</button>
          </div>
        </div>
      )}

      {tab === 'banners' && (
        <>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#8a8378', marginBottom: 12, background: '#faf8f4', border: '1px solid #efe9df', borderRadius: 10, padding: '9px 12px' }}>
          💡 Every banner card has <strong>tap-to-toggle page chips</strong>: pick <strong>All pages</strong>, or choose exactly which pages it shows on. Changes save instantly.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {banners.map(b => (
            <div key={b.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `4px solid ${b.approved === false ? '#f59e0b' : b.active ? 'var(--orange)' : '#e5e7eb'}` }}>
              <div style={{ position: 'relative' }}>
                <img src={b.imageUrl} alt={b.title} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                {b.isTest && <span style={{ position: 'absolute', top: 8, right: 8, background: '#b45309', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50, textTransform: 'uppercase' }}>Test</span>}
                {b.approved === false && !b.isTest && <span style={{ position: 'absolute', top: 8, left: 8, background: '#f59e0b', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50, textTransform: 'uppercase', letterSpacing: 0.4 }}>Pending approval</span>}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 10, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{POS_LABEL[b.position] ?? b.position}{b.pageTarget ? ` · ${b.pageTarget}` : ''}{b.pages?.length ? ` · ${b.pages.join(', ')}` : ''}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13, marginTop: 2, marginBottom: 6 }}>{b.title}</div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>
                  <span title="Clicks">👆 <b>{b.clickCount ?? 0}</b></span>
                  <span title="Impressions">👁 <b>{b.impressions ?? 0}</b></span>
                  {(b.impressions ?? 0) > 0 && <span title="Click-through rate" style={{ color: '#16a34a' }}>{(((b.clickCount ?? 0) / (b.impressions ?? 1)) * 100).toFixed(1)}% CTR</span>}
                </div>

                {/* Per-page on/off — only for site-wide placements that actually
                    render across multiple pages. Click a page to show/hide the
                    banner there; "All pages" clears the restriction. */}
                {(
                  <div style={{ marginBottom: 10, background: '#faf8f4', border: '1px solid #efe9df', borderRadius: 10, padding: '8px 9px' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                      Shows on {b.pages?.length ? `${b.pages.length} page${b.pages.length === 1 ? '' : 's'}` : 'all pages'} — tap to change
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      <button
                        onClick={() => savePages(b, [])}
                        style={pageChip(!b.pages?.length)}
                      >All pages</button>
                      {BANNER_PAGE_OPTIONS.map(([key, lab]) => {
                        // "Category pages" is on if the generic key OR any specific
                        // category slug is targeted.
                        const on = key === 'category'
                          ? (!!b.pages?.includes('category') || (b.pages ?? []).some(p => BANNER_CATEGORY_SLUGS.includes(p)))
                          : !!b.pages?.includes(key)
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === 'category') {
                                // Toggle the whole category target off, or on = all categories.
                                const rest = (b.pages ?? []).filter(p => p !== 'category' && !BANNER_CATEGORY_SLUGS.includes(p))
                                savePages(b, on ? rest : [...rest, 'category'])
                              } else {
                                savePages(b, on ? (b.pages ?? []).filter(p => p !== key) : [...(b.pages ?? []), key])
                              }
                            }}
                            style={pageChip(on)}
                          >{on ? '✓ ' : ''}{lab}</button>
                        )
                      })}
                    </div>

                    {/* Drill-down: which category pages exactly. Shown once
                        "Category pages" is targeted. "All categories" = the generic
                        key; picking specific categories targets just those slugs. */}
                    {(b.pages?.includes('category') || (b.pages ?? []).some(p => BANNER_CATEGORY_SLUGS.includes(p))) && (() => {
                      const specific = (b.pages ?? []).filter(p => BANNER_CATEGORY_SLUGS.includes(p))
                      const allCats = !specific.length
                      return (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e6ddcf' }}>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
                            Which categories — {allCats ? 'all category pages' : `${specific.length} selected`}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            <button
                              onClick={() => savePages(b, [...(b.pages ?? []).filter(p => p !== 'category' && !BANNER_CATEGORY_SLUGS.includes(p)), 'category'])}
                              style={pageChip(allCats)}
                            >{allCats ? '✓ ' : ''}All categories</button>
                            {BANNER_CATEGORY_OPTIONS.map(([slug, lab]) => {
                              const on = specific.includes(slug)
                              return (
                                <button
                                  key={slug}
                                  onClick={() => {
                                    // Selecting a specific category drops the generic key.
                                    const base = (b.pages ?? []).filter(p => p !== 'category')
                                    savePages(b, on ? base.filter(p => p !== slug) : [...base, slug])
                                  }}
                                  style={pageChip(on)}
                                >{on ? '✓ ' : ''}{lab}</button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
                {b.approved === false && !b.isTest ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setApproved(b, true)} style={{ ...pill, flex: 1, background: '#16a34a', color: '#fff' }}>✓ Approve</button>
                    <button onClick={() => startEdit(b)} style={{ ...pill, background: '#eef4ff', color: '#2563eb' }}>Edit</button>
                    <button onClick={() => remove(b.id)} style={{ ...pill, background: '#fef2f2', color: '#ef4444' }}>Reject</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => toggle(b)} style={{ ...pill, flex: 1, background: b.active ? '#f0faf4' : '#f5f5f5', color: b.active ? '#16a34a' : '#aaa' }}>{b.active ? '● Live' : '○ Off'}</button>
                    <button onClick={() => startEdit(b)} style={{ ...pill, background: '#eef4ff', color: '#2563eb' }}>Edit</button>
                    {!b.isTest && <button onClick={() => setApproved(b, false)} title="Send back for re-approval" style={{ ...pill, background: '#fff7ed', color: '#b45309' }}>Unapprove</button>}
                    <button onClick={() => remove(b.id)} style={{ ...pill, background: '#fef2f2', color: '#ef4444' }}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {banners.length === 0 && <div style={emptyBox}>No banners yet — add one (or a test banner) to show it on the site</div>}
        </div>
        </>
      )}

      {tab === 'pricing' && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#999', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <th style={th}>Slot</th><th style={th}>€/month</th><th style={th}>Advertisers (cap)</th><th style={th}>Type</th><th style={th}>Pages</th><th style={th}>On / Off</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(s => (
                <Fragment key={s.id}>
                <tr style={{ borderTop: '1px solid #f5f0e8' }}>
                  <td style={td}><div style={{ fontWeight: 800 }}>{s.label}</div><div style={{ color: '#aaa', fontSize: 10.5 }}>{s.scope}</div></td>
                  <td style={td}><input type="number" min={0} value={Math.round(s.monthlyCents / 100)} onChange={e => saveSlot(s.id, { monthlyCents: Math.max(0, Number(e.target.value) || 0) * 100 })} style={{ ...inp, width: 80 }} /></td>
                  <td style={td}>{s.exclusive ? <span style={{ color: '#c2410c', fontWeight: 800 }}>Exclusive (1)</span> : <input type="number" min={1} value={s.cap} onChange={e => saveSlot(s.id, { cap: Math.max(1, Number(e.target.value) || 1) })} style={{ ...inp, width: 64 }} />}</td>
                  <td style={{ ...td, color: '#888' }}>{s.perPage ? 'Per page' : 'Site-wide'}</td>
                  <td style={td}>
                    <button onClick={() => setExpandedSlot(v => v === s.id ? null : s.id)} style={{ ...pill, background: '#eef4ff', color: '#2563eb' }}>
                      {s.pages?.length ? `${s.pages.length} page${s.pages.length === 1 ? '' : 's'}` : 'All pages'} ▾
                    </button>
                  </td>
                  <td style={td}><button onClick={() => saveSlot(s.id, { active: !s.active })} title={s.active ? 'Banner is live — tap to switch it off everywhere' : 'Banner is off — tap to switch it on'} style={{ ...pill, background: s.active ? '#f0faf4' : '#fef2f2', color: s.active ? '#16a34a' : '#ef4444' }}>{s.active ? '● On' : '○ Off'}</button></td>
                </tr>
                {expandedSlot === s.id && (
                  <tr>
                    <td colSpan={6} style={{ padding: '0 14px 12px' }}>
                      <div style={{ background: '#faf8f4', border: '1px solid #efe9df', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 7 }}>
                          Show this banner on — {s.pages?.length ? `${s.pages.length} selected` : 'all pages'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          <button onClick={() => saveSlot(s.id, { pages: [] })} style={pageChip(!s.pages?.length)}>All pages</button>
                          {BANNER_PAGE_OPTIONS.map(([key, lab]) => {
                            const on = !!s.pages?.includes(key)
                            return (
                              <button key={key} onClick={() => saveSlot(s.id, { pages: on ? (s.pages ?? []).filter(p => p !== key) : [...(s.pages ?? []), key] })} style={pageChip(on)}>{on ? '✓ ' : ''}{lab}</button>
                            )
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <BookingsTab bookings={bookings} slots={slots} onReload={loadBookings} />
      )}
    </div>
  )
}

// Admin bookings list + override create form (book any slot for any user).
function BookingsTab({ bookings, slots, onReload }: { bookings: Booking[]; slots: Slot[]; onReload: () => void }) {
  const api = useCrmApi()
  const [f, setF] = useState({ userId: '', position: slots[0]?.id ?? 'home_top', pageTarget: '', months: 1, startsAt: '', imageUrl: '', linkUrl: '', title: '' })
  const [busy, setBusy] = useState(false)
  const create = async () => {
    if (!f.userId.trim() || !f.startsAt) return
    setBusy(true)
    try {
      await api.createBannerBooking({
        userId: f.userId.trim(), position: f.position, pageTarget: f.pageTarget.trim() || undefined,
        months: f.months, startsAt: new Date(f.startsAt).toISOString(),
        imageUrl: f.imageUrl.trim() || undefined, linkUrl: f.linkUrl.trim() || undefined, title: f.title.trim() || undefined,
      })
      setF({ ...f, userId: '', pageTarget: '', imageUrl: '', linkUrl: '', title: '' }); onReload()
    } finally { setBusy(false) }
  }
  const cancel = async (id: string) => { await api.cancelBannerBooking(id); onReload() }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, marginBottom: 4 }}>Override — book a slot for a user</h3>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#999', marginBottom: 12 }}>Admins can place any advertiser in any slot, bypassing payment. Add an image to publish an approved banner immediately.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
          <Field label="User ID"><input value={f.userId} onChange={e => setF({ ...f, userId: e.target.value })} style={inp} /></Field>
          <Field label="Slot"><select value={f.position} onChange={e => setF({ ...f, position: e.target.value })} style={inp}>{slots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Page target (optional)"><input value={f.pageTarget} onChange={e => setF({ ...f, pageTarget: e.target.value })} placeholder="blank = site-wide" style={inp} /></Field>
          <Field label="Months (max 3)"><input type="number" min={1} max={3} value={f.months} onChange={e => setF({ ...f, months: Math.min(3, Math.max(1, Number(e.target.value) || 1)) })} style={inp} /></Field>
          <Field label="Start date"><input type="date" value={f.startsAt} onChange={e => setF({ ...f, startsAt: e.target.value })} style={inp} /></Field>
          <Field label="Banner title (optional)"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} style={inp} /></Field>
          <Field label="Image URL (optional — publishes a banner)"><input value={f.imageUrl} onChange={e => setF({ ...f, imageUrl: e.target.value })} style={inp} /></Field>
          <Field label="Link URL (optional)"><input value={f.linkUrl} onChange={e => setF({ ...f, linkUrl: e.target.value })} style={inp} /></Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={create} disabled={busy || !f.userId || !f.startsAt} style={{ ...primaryBtn, opacity: busy || !f.userId || !f.startsAt ? 0.6 : 1 }}>{busy ? 'Booking…' : 'Create booking'}</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 12.5 }}>
          <thead><tr style={{ textAlign: 'left', color: '#999', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <th style={th}>Advertiser</th><th style={th}>Slot</th><th style={th}>Dates</th><th style={th}>Paid</th><th style={th}></th>
          </tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id} style={{ borderTop: '1px solid #f5f0e8' }}>
                <td style={td}><div style={{ fontWeight: 800 }}>{b.user?.businessName || b.user?.displayName || b.user?.email || b.userId}</div>{b.createdByAdmin && <span style={{ fontSize: 10, color: '#b45309', fontWeight: 800 }}>admin override</span>}</td>
                <td style={td}>{b.position}{b.pageTarget ? ` · ${b.pageTarget}` : ''}</td>
                <td style={td}>{new Date(b.startsAt).toLocaleDateString('en-GB')} → {new Date(b.endsAt).toLocaleDateString('en-GB')} <span style={{ color: '#aaa' }}>({b.months}m)</span></td>
                <td style={td}>{eur(b.amountCents)}</td>
                <td style={td}><button onClick={() => cancel(b.id)} style={{ ...pill, background: '#fef2f2', color: '#ef4444' }}>Cancel</button></td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#bbb', padding: 40 }}>No active bookings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 12, boxSizing: 'border-box' }
const th: React.CSSProperties = { padding: '10px 14px', fontFamily: 'var(--font-ui)', fontWeight: 800 }
const td: React.CSSProperties = { padding: '10px 14px', verticalAlign: 'top' }
const pill: React.CSSProperties = { padding: '5px 11px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)' }
const pageChip = (on: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 50, cursor: 'pointer', fontSize: 10.5, fontWeight: 800, fontFamily: 'var(--font-ui)',
  border: on ? '1.5px solid #16a34a' : '1.5px solid #e2ddd3',
  background: on ? '#f0faf4' : '#fff', color: on ? '#16a34a' : '#8a8378',
})
const ghostBtn: React.CSSProperties = { padding: '7px 16px', borderRadius: 50, border: '1.5px solid #e5e7eb', background: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }
const primaryBtn: React.CSSProperties = { padding: '7px 18px', borderRadius: 50, border: 'none', background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, cursor: 'pointer' }
const emptyBox: React.CSSProperties = { gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#ccc', fontFamily: 'var(--font-ui)', fontWeight: 800 }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'var(--font-ui)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  )
}
