'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { compressAndUpload, cmsImagePath } from '@/lib/storage'
import { useGrabittUid } from '@/hooks/useGrabittUid'

// The business storefront editor. A shop is more than a bio: a layout template,
// the seller's own category shelves, which listings to feature, and the
// shipping/returns/payment policies a buyer wants before ordering. Gated on
// being a Business account; the server enforces that too.

type Shop = {
  id: string; slug: string; template: string; tagline: string | null; about: string | null
  bannerUrl: string | null; logoUrl: string | null; accentColour: string | null
  categories: string[]; featuredIds: string[]
  shippingPolicy: string | null; returnsPolicy: string | null; paymentPolicy: string | null
  published: boolean
}
type MyListing = { id: string; title: string; price: unknown; images: string[] }

const TEMPLATES: { id: string; label: string; blurb: string }[] = [
  { id: 'classic', label: 'Classic', blurb: 'Banner, then a clean grid' },
  { id: 'grid', label: 'Grid', blurb: 'Dense, image-led' },
  { id: 'showcase', label: 'Showcase', blurb: 'Big featured row up top' },
  { id: 'minimal', label: 'Minimal', blurb: 'Just the essentials' },
]

export default function StorefrontEditor({ onClose }: { onClose: () => void }) {
  const uid = useGrabittUid()
  const [loaded, setLoaded] = useState(false)
  const [isBiz, setIsBiz] = useState(false)
  const [verified, setVerified] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [mine, setMine] = useState<MyListing[]>([])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [err, setErr] = useState('')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const bannerRef = useRef<HTMLInputElement>(null)

  const [f, setF] = useState({
    businessName: '', template: 'classic', tagline: '', about: '', bannerUrl: '', accentColour: 'var(--orange)',
    categories: [] as string[], featuredIds: [] as string[],
    shippingPolicy: '', returnsPolicy: '', paymentPolicy: '', published: false, slug: '',
  })
  const [newCat, setNewCat] = useState('')

  useEffect(() => {
    Promise.all([
      trpcAuthed().business.myStorefront.query().catch(() => null),
      trpcAuthed().listings.mine.query().catch(() => []),
    ]).then(([s, listings]) => {
      const res = s as { shop: Shop | null; isBusiness: boolean; businessVerified: boolean; businessName: string | null; memberStatus?: string | null } | null
      // Charity accounts get a storefront on the same footing as a business.
      setIsBiz(!!res?.isBusiness || res?.memberStatus === 'charity')
      // A charity is verified by admin approval, so it can publish straight away.
      setVerified(!!res?.businessVerified || res?.memberStatus === 'charity')
      setMine((listings as MyListing[]) ?? [])
      if (res?.shop) {
        setShop(res.shop)
        setF({
          businessName: res.businessName ?? '',
          template: res.shop.template, tagline: res.shop.tagline ?? '', about: res.shop.about ?? '',
          bannerUrl: res.shop.bannerUrl ?? '', accentColour: res.shop.accentColour ?? 'var(--orange)',
          categories: res.shop.categories, featuredIds: res.shop.featuredIds,
          shippingPolicy: res.shop.shippingPolicy ?? '', returnsPolicy: res.shop.returnsPolicy ?? '',
          paymentPolicy: res.shop.paymentPolicy ?? '', published: res.shop.published, slug: res.shop.slug,
        })
      } else if (res?.businessName) {
        setF(prev => ({ ...prev, businessName: res.businessName ?? '' }))
      }
      setLoaded(true)
    })
  }, [])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }))
  const shareUrl = useMemo(() => f.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${f.slug}` : '', [f.slug])

  const save = async (publishOverride?: boolean) => {
    setSaving(true); setErr(''); setSavedMsg('')
    try {
      if (f.businessName.trim().length >= 2) {
        await trpcAuthed().business.setBusinessName.mutate({ name: f.businessName.trim() })
      }
      await trpcAuthed().business.upsertStorefront.mutate({
        template: f.template as 'classic' | 'grid' | 'showcase' | 'minimal',
        tagline: f.tagline.trim() || undefined,
        about: f.about.trim() || undefined,
        bannerUrl: f.bannerUrl || undefined,
        accentColour: f.accentColour || undefined,
        categories: f.categories,
        featuredIds: f.featuredIds,
        shippingPolicy: f.shippingPolicy.trim() || undefined,
        returnsPolicy: f.returnsPolicy.trim() || undefined,
        paymentPolicy: f.paymentPolicy.trim() || undefined,
        ...(publishOverride !== undefined ? { published: publishOverride } : {}),
        ...(shop ? {} : { slug: f.slug.trim() || undefined }),
      })
      if (publishOverride !== undefined) set('published', publishOverride)
      setSavedMsg(publishOverride === true ? 'Your shop is live 🎉' : publishOverride === false ? 'Shop unpublished' : 'Saved')
      // Reload so a freshly-created shop picks up its slug.
      const s = await trpcAuthed().business.myStorefront.query() as { shop: Shop | null }
      if (s.shop) { setShop(s.shop); set('slug', s.shop.slug) }
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.') }
    finally { setSaving(false) }
  }

  const uploadBanner = async (file: File | null) => {
    if (!file || !uid) return
    setUploadingBanner(true)
    try {
      // The banner is public storefront artwork — store a permanent public URL
      // (compressed) rather than an expiring signed URL from a private bucket.
      const url = await compressAndUpload(file, cmsImagePath('storefront'))
      set('bannerUrl', url)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploadingBanner(false) }
  }

  const toggleFeatured = (id: string) => set('featuredIds',
    f.featuredIds.includes(id) ? f.featuredIds.filter(x => x !== id) : [...f.featuredIds, id].slice(0, 12))

  const addCat = () => {
    const c = newCat.trim()
    if (c && !f.categories.includes(c) && f.categories.length < 20) set('categories', [...f.categories, c])
    setNewCat('')
  }

  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ background: '#fff', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>🏪 My storefront</span>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {!loaded ? <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-ui)' }}>Loading…</div>
          : !isBiz ? (
            <Note emoji="🏢" title="Storefronts are for Business accounts"
              body="Upgrade to Business to open a shop with your own layout, categories and policies." />
          ) : (
            <>
              {!verified && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FFD4A0', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#9a5b1a', lineHeight: 1.5 }}>
                  You can build your shop now, but it can only go live once your business is verified.
                </div>
              )}

              {shareUrl && (
                <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '9px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shareUrl}</span>
                  <a href={`/shop/${f.slug}`} target="_blank" rel="noreferrer" style={{ flexShrink: 0, color: 'var(--orange)', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, textDecoration: 'none' }}>Preview</a>
                </div>
              )}

              {/* Layout template */}
              <Section title="Layout">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => set('template', t.id)} style={{ textAlign: 'left', background: f.template === t.id ? '#FFF3EE' : '#fff', border: `1.5px solid ${f.template === t.id ? 'var(--orange)' : '#e5dccd'}`, borderRadius: 10, padding: 10, cursor: 'pointer' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, color: f.template === t.id ? 'var(--orange)' : '#1a1a1a' }}>{t.label}</div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888', marginTop: 2 }}>{t.blurb}</div>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Branding */}
              <Section title="Branding">
                <Label>Business name</Label>
                <input value={f.businessName} onChange={e => set('businessName', e.target.value)} placeholder="e.g. Isla Ceramics" style={INPUT} />
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#999', margin: '2px 0 8px' }}>Shown across Grabitt and on your Business Hub.</div>
                <Label>Tagline</Label>
                <input value={f.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Handmade island ceramics" style={INPUT} />
                <Label>About your shop</Label>
                <textarea value={f.about} onChange={e => set('about', e.target.value)} rows={3} style={{ ...INPUT, resize: 'vertical' }} />
                <Label>Banner image</Label>
                <input ref={bannerRef} type="file" accept="image/*" onChange={e => uploadBanner(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                {f.bannerUrl
                  ? <div style={{ position: 'relative', marginBottom: 12 }}><img src={f.bannerUrl} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10 }} /><button onClick={() => bannerRef.current?.click()} style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Replace</button></div>
                  : <button onClick={() => bannerRef.current?.click()} disabled={uploadingBanner} style={{ width: '100%', marginBottom: 12, background: '#fff', color: 'var(--orange)', border: '1.5px dashed var(--orange)', borderRadius: 10, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{uploadingBanner ? 'Uploading…' : '🖼️ Upload a banner'}</button>}
                <Label>Accent colour</Label>
                <input type="color" value={f.accentColour} onChange={e => set('accentColour', e.target.value)} style={{ width: 48, height: 34, border: '1px solid #eee', borderRadius: 8, cursor: 'pointer' }} />
              </Section>

              {/* Categories */}
              <Section title="Shop categories">
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat() } }} placeholder="e.g. Clearance" style={{ ...INPUT, marginBottom: 0, flex: 1 }} />
                  <button onClick={addCat} style={{ flexShrink: 0, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', fontFamily: 'var(--font-ui)', fontWeight: 800, cursor: 'pointer' }}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {f.categories.map(c => (
                    <span key={c} style={{ background: '#f0ebe4', color: '#1a1a1a', borderRadius: 50, padding: '5px 10px 5px 12px', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{c}<button onClick={() => set('categories', f.categories.filter(x => x !== c))} style={{ background: 'none', border: 'none', color: '#1a1a1a', cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button></span>
                  ))}
                </div>
              </Section>

              {/* Featured items */}
              <Section title={`Featured items (${f.featuredIds.length}/12)`}>
                {mine.length === 0 ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>List some items and they&apos;ll appear here to feature.</div> : (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {mine.map(l => {
                      const on = f.featuredIds.includes(l.id)
                      return (
                        <button key={l.id} onClick={() => toggleFeatured(l.id)} style={{ flexShrink: 0, width: 84, background: 'none', border: `2px solid ${on ? 'var(--orange)' : 'transparent'}`, borderRadius: 10, padding: 3, cursor: 'pointer' }}>
                          <div style={{ height: 64, borderRadius: 8, background: '#f5f0e8', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                            {l.images?.[0] ? <img src={l.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}
                          </div>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: on ? 900 : 700, color: on ? 'var(--orange)' : '#555', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{on ? '★ ' : ''}{l.title}</div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Section>

              {/* Policies */}
              <Section title="Policies">
                <Label>Shipping</Label>
                <textarea value={f.shippingPolicy} onChange={e => set('shippingPolicy', e.target.value)} rows={2} placeholder="How and when you dispatch, costs, areas covered." style={{ ...INPUT, resize: 'vertical' }} />
                <Label>Returns</Label>
                <textarea value={f.returnsPolicy} onChange={e => set('returnsPolicy', e.target.value)} rows={2} placeholder="Your returns window and conditions." style={{ ...INPUT, resize: 'vertical' }} />
                <Label>Payment</Label>
                <textarea value={f.paymentPolicy} onChange={e => set('paymentPolicy', e.target.value)} rows={2} placeholder="Accepted methods, deposits, anything a buyer should know." style={{ ...INPUT, resize: 'vertical' }} />
              </Section>

              {err && <div style={{ background: '#fff5f5', color: '#c0392b', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
              {savedMsg && <div style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>{savedMsg}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => save()} disabled={saving} style={{ flex: 1, background: '#fff', color: '#555', border: '1.5px solid #e5dccd', borderRadius: 12, padding: 13, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save draft'}</button>
                {f.published
                  ? <button onClick={() => save(false)} disabled={saving} style={{ flex: 1, background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 12, padding: 13, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Unpublish</button>
                  : <button onClick={() => save(true)} disabled={saving || !verified} title={verified ? 'Make your shop live' : 'Your business must be verified before the shop can go live'} style={{ flex: 1, background: verified ? 'linear-gradient(135deg,var(--orange),var(--orange2))' : '#ccc', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: verified ? 'pointer' : 'not-allowed' }}>{verified ? 'Publish shop' : '🔒 Verify to publish'}</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>
}
const INPUT: React.CSSProperties = { width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }
function Note({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return <div style={{ textAlign: 'center', padding: '24px 8px' }}><div style={{ fontSize: 44, marginBottom: 12 }}>{emoji}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>{title}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666', lineHeight: 1.6 }}>{body}</div></div>
}
