'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createLooseTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { DEPT_LABEL, COND_LABEL, deptEmoji } from '@/lib/listingMap'
import { t } from '@/lib/i18n'
import { pushView } from '@/lib/recentViews'
import { PRICES } from '@grabitt/design-tokens'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import MessageButton from '@/components/marketplace/MessageButton'
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import CartFab from '@/components/marketplace/CartFab'
import QuickActions from '@/components/marketplace/QuickActions'
import ShareSheet from '@/components/marketplace/ShareSheet'
import PanelHost from '@/components/marketplace/PanelHost'
import ApplyModal from '@/components/marketplace/ApplyModal'
import MessageComposer from '@/components/marketplace/MessageComposer'

const gradeEmoji: Record<string, string> = { grabber: '🟠', dealer: '🟡', trader: '🔵', pro: '⭐' }
const JOB_TYPE: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', temporary: 'Temp', volunteer: 'Volunteer' }
const PROP_TYPE: Record<string, string> = { sale: 'For Sale', rent: 'To Rent', holiday: 'Holiday', commercial: 'Commercial', land: 'Land', new_build: 'New Build' }

const PERIOD: Record<string, string> = { month: '/mo', year: '/yr', hour: '/hr' }
function salaryLabel(min?: number | string | null, max?: number | string | null, period?: string | null) {
  const p = PERIOD[period ?? 'month'] ?? '/mo'
  const lo = min != null ? Number(min) : null, hi = max != null ? Number(max) : null
  if (lo && hi) return `€${lo.toLocaleString()}–${hi.toLocaleString()}${p}`
  if (lo) return `€${lo.toLocaleString()}${p}`
  if (hi) return `up to €${hi.toLocaleString()}${p}`
  return 'Negotiable'
}
export default function ListingDetailPage() {
  // Wrap in PanelProvider + PanelHost so the Buy / Make-an-offer buttons open the
  // same checkout/offer flows used across the app.
  return (
    <PanelProvider>
      <ListingInner />
      <PanelHost />
    </PanelProvider>
  )
}

function ListingInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { openPanel } = usePanel()
  const [listing, setListing] = useState<any>(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [meId, setMeId] = useState<string | null>(null)
  const [comps, setComps] = useState<any>(null)
  const [similar, setSimilar] = useState<any[]>([])
  const [showShare, setShowShare] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [saved, setSaved] = useState(false)
  // Job apply flow
  const [applied, setApplied] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [empJobs, setEmpJobs] = useState<any[]>([])
  const [basketBusy, setBasketBusy] = useState(false)
  const [basketErr, setBasketErr] = useState('')
  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  useEffect(() => {
    createLooseTrpcClient().listings.byId.query({ id })
      .then((l: any) => {
        setListing(l); setState('ready')
        pushView({ id: l.id, title: l.title, price: `€${Number(l.price).toLocaleString()}`, image: Array.isArray(l.images) ? l.images[0] : null, emoji: deptEmoji(l.department), location: l.location })
        // "You might also like" — same department, excluding this listing.
        createLooseTrpcClient().listings.getByDept.query({ department: l.department as never, sort: 'newest' })
          .then((r: any) => setSimilar(((r?.items ?? []) as any[]).filter(x => x.id !== l.id).slice(0, 4)))
          .catch(() => {})
      })
      .catch(() => setState('notfound'))
    createLooseTrpcClient().listings.comparables.query({ id })
      .then((c: any) => { if (c && c.count > 0) setComps(c) })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) return
      try { const me: any = await trpcAuthed().users.me.query(); setMeId(me?.id ?? null) } catch { /* ignore */ }
    })()
  }, [])

  // For jobs, reflect whether the current user has already applied.
  useEffect(() => {
    if (!listing?.jobListing) return
    ;(async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) return
      try { const r: any = await trpcAuthed().jobs.hasApplied.query({ listingId: id }); setApplied(!!r?.applied) } catch { /* ignore */ }
    })()
  }, [listing, id])

  // Other active jobs from the same employer.
  useEffect(() => {
    const empId = listing?.jobListing?.employerId
    if (!empId) return
    createLooseTrpcClient().jobs.byEmployer.query({ employerId: empId, excludeListingId: id })
      .then((r: any) => setEmpJobs((r ?? []) as any[]))
      .catch(() => {})
  }, [listing, id])

  if (state === 'loading') return <Centered>Loading…</Centered>
  if (state === 'notfound' || !listing) return <Centered>This listing is no longer available. <Link href="/" style={{ color: 'var(--orange)', fontWeight: 800 }}>Back home</Link></Centered>

  const job = listing.jobListing
  const prop = listing.propertyListing
  const seller = listing.seller

  const jobKeywords: string[] = job
    ? Array.from(new Set(`${job.sector ?? ''} ${JOB_TYPE[job.type] ?? job.type ?? ''} ${job.jobTitle ?? ''}`
        .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3))).slice(0, 6)
    : []

  const isGrabItNow = listing.status === 'grab_it_now'
  const addToBasket = async () => {
    setBasketErr(''); setBasketBusy(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { openPanel('login'); return }
      await trpcAuthed().cart.addItem.mutate({ listingId: id })
      openPanel('cart', { added: true })
    } catch (e: any) { setBasketErr(e?.message ?? 'Could not add to basket') }
    finally { setBasketBusy(false) }
  }

  const openApply = async () => {
    if (applied) return
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { openPanel('login'); return }
    setShowApply(true)
  }
  const isOwner = !!meId && meId === seller?.id
  const isRent = prop?.type === 'rent'
  const photos: string[] = Array.isArray(listing.images) ? listing.images.filter(Boolean) : []
  const heroImg = photos[activePhoto] ?? photos[0] ?? null
  const emoji = deptEmoji(listing.department)
  const priceLabel = job ? salaryLabel(job.salaryMin, job.salaryMax, job.salaryPeriod) : `€${Number(listing.price).toLocaleString()}${isRent ? '/mo' : ''}`
  const ref = String(id).replace(/-/g, '').slice(0, 6).toUpperCase()
  const sellerOther: SellerOther[] = (listing.sellerOther ?? []) as SellerOther[]
  // Keywords: the listing's own search tags, falling back to the words derived
  // from its title and category (what the template did).
  const keywords: string[] = job
    ? jobKeywords
    : (Array.isArray(listing.tags) && listing.tags.length > 0
        ? listing.tags.slice(0, 6)
        : Array.from(new Set(`${DEPT_LABEL[listing.department] ?? ''} ${listing.title ?? ''}`
            .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3))).slice(0, 5))
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/listings/${id}` : `/listings/${id}`

  // In-demand metrics — real data only: view count and number of people who have
  // this listing in their favourites/wishlist.
  const views = Number(listing.viewCount ?? 0)
  const watchers = Number(listing._count?.wishlistItems ?? 0)
  const wanted = Number(listing.wantedCount ?? 0)

  // The panel-item shape the checkout / offer panels expect.
  const panelItem = {
    id: listing.id, title: listing.title, price: `€${Number(listing.price).toLocaleString()}`,
    image: heroImg, images: listing.images ?? [], emoji, location: listing.location,
    category: DEPT_LABEL[listing.department] ?? listing.department,
    condition: listing.condition ? (COND_LABEL[listing.condition] ?? listing.condition) : '',
    sellerId: seller?.id, isFeatured: !!listing.isFeatured,
    deliveryFee: Number(listing.deliveryFee ?? 0), deliveryMethod: listing.deliveryMethod ?? undefined,
  }

  const requireAuth = async () => {
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { router.push(`/auth?next=/listings/${id}`); return null }
    return token
  }
  const toggleSave = async () => {
    if (!(await requireAuth())) return
    try { await trpcAuthed().wishlist.toggle.mutate({ listingId: id }); setSaved(s => !s) } catch { /* ignore */ }
  }
  const startChat = async () => {
    if (!(await requireAuth()) || !seller?.id) return
    setShowMessage(true)
  }
  const promote = async (option: 'grab_it_now' | 'featured') => {
    if (!(await requireAuth())) return
    try { const res: any = await trpcAuthed().listings.promote.mutate({ listingId: id, option, weeks: 1 }); if (res?.url) window.location.href = res.url }
    catch { alert('Could not start the payment. Please try again.') }
  }

  const saveNewPrice = async () => {
    const value = Number(newPrice)
    if (!Number.isFinite(value) || value < 0) { alert('Enter a valid price.'); return }
    setSavingPrice(true)
    try {
      const res: any = await trpcAuthed().listings.updatePrice.mutate({ listingId: id, price: value })
      setListing((l: any) => ({ ...l, price: res.price }))
      setEditingPrice(false)
      if (res.dropped) alert('Price lowered — everyone who saved this item has been alerted. 📉')
    } catch { alert('Could not update the price. Please try again.') }
    finally { setSavingPrice(false) }
  }

  return (
    <main className="app-shell" style={{ background: '#f5f2ec', minHeight: '100dvh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title={DEPT_LABEL[listing.department] ?? 'Listing'} back backFallback={job ? '/jobs' : prop ? '/property' : '/'} />
      <QuickActions />

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Hero: image + vertical action rail */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0, height: 280, borderRadius: 14, overflow: 'hidden', background: 'var(--sand)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 96, border: '1px solid #ece3d7' }}>
            {heroImg ? <img src={heroImg} alt={listing.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : emoji}
            {listing.isFeatured && <span style={{ position: 'absolute', top: 8, left: 8, background: 'var(--orange)', color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 9px', borderRadius: 50 }}>⭐ FEATURED</span>}
          </div>
          <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'stretch' }}>
            <RailBtn icon="🛒" label="Cart" onClick={() => openPanel('cart')} />
            <RailBtn icon={saved ? '❤️' : '🤍'} label="Save" active={saved} onClick={toggleSave} />
            <RailBtn icon="📤" label="Share" onClick={() => setShowShare(true)} />
            {!isOwner && seller?.id && <RailBtn icon="💬" label="Message" onClick={startChat} />}
          </div>
        </div>

        {/* Extra photos + In-demand stats share one row. Thumbnails swap the
            hero image; the In-demand card is enlarged to fill the row height. */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {photos.length > 1 && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {photos.map((src, i) => (
                <button key={i} onClick={() => setActivePhoto(i)} style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: i === activePhoto ? '2px solid var(--orange)' : '1px solid #ece3d7', background: 'var(--sand)', cursor: 'pointer', padding: 0 }} aria-label={`Photo ${i + 1}`}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
          <div style={{ flex: photos.length > 1 ? '0 0 168px' : 1, minWidth: 0, background: '#FFF8F4', border: '1px solid #FFE0CC', borderRadius: 12, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 900, color: '#d35400', textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 }}>🔥 In demand</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', gap: 6 }}>
              {[[views, 'views'], [watchers, 'watching'], [wanted, 'wanted']].map(([n, lab], i) => (
                <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: 'var(--dark)' }}>{n as number}</div>
                  <div style={{ fontSize: 9, color: '#777', fontFamily: 'var(--font-comfortaa)', lineHeight: 1.1 }}>{lab as string}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Title + price, in line with Buy / Offer / In demand */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            {(job || prop) && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                {job && <Chip>{JOB_TYPE[job.type] ?? job.type}</Chip>}
                {prop && <Chip>{PROP_TYPE[prop.type] ?? prop.type}</Chip>}
                {job?.remote && <Chip>Remote</Chip>}
              </div>
            )}
            <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 19, fontWeight: 900, color: 'var(--dark)', lineHeight: 1.25 }}>{job?.jobTitle ?? listing.title}</h1>
            {/* Price with location + reference alongside it */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 24, fontWeight: 900, color: 'var(--orange)' }}>{priceLabel}</div>
              <div style={{ fontSize: 11, color: '#666', fontFamily: 'var(--font-comfortaa)' }}>📍 {job?.remote ? 'Remote' : (listing.location ?? 'Gran Canaria')} · Ref: {ref}</div>
            </div>
          </div>

          {/* Buy / Offer — on the title's line */}
          {!isOwner && !job && !prop && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flex: '0 1 auto' }}>
              <button onClick={() => isGrabItNow ? openPanel('checkout', panelItem) : addToBasket()} disabled={basketBusy} style={{ width: 96, background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 6px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: basketBusy ? 'wait' : 'pointer', lineHeight: 1.25 }}>{isGrabItNow ? <>⚡ {t('Buy Now')}</> : <>🛒 {t('Buy Now')}</>}<br /><span style={{ fontSize: 11 }}>{priceLabel}</span></button>
              <button onClick={() => openPanel('makeOffer', panelItem)} style={{ width: 96, background: '#fff', color: '#FF4500', border: '2px solid #FF4500', borderRadius: 12, padding: '10px 6px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer', lineHeight: 1.25 }}>💰 {t('Make')}<br />{t('an Offer')}</button>
            </div>
          )}
        </div>

        {/* Primary actions */}
        {isOwner ? (
          <div style={cardBox}>
            {!job && !prop ? (
              <>
                {/* Upgrade + edit — all on one line */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => promote('grab_it_now')} style={{ flex: 1, minWidth: 0, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 4px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, cursor: 'pointer', lineHeight: 1.2 }}>⚡ Grab It<br />Now · €{PRICES.grabItNow}</button>
                  <button onClick={() => promote('featured')} style={{ flex: 1, minWidth: 0, background: '#fff', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 12, padding: '9px 4px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, cursor: 'pointer', lineHeight: 1.2 }}>👀 Feature<br />€{PRICES.featuredPerWeek}/wk</button>
                  <button onClick={() => { setNewPrice(String(Number(listing.price))); setEditingPrice(v => !v) }} style={{ flex: 1, minWidth: 0, background: '#fff', color: '#555', border: '1.5px solid var(--sand2)', borderRadius: 12, padding: '9px 4px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, cursor: 'pointer', lineHeight: 1.2 }}>✏️ Change<br />price</button>
                  <Link href={`/listings/${id}/edit`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', textDecoration: 'none', background: '#fff', color: '#555', border: '1.5px solid var(--sand2)', borderRadius: 12, padding: '9px 4px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, lineHeight: 1.2 }}>✎ Edit<br />listing</Link>
                </div>
                {editingPrice && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-nunito)', fontWeight: 900, color: '#555' }}>€</span>
                    <input type="number" min={0} step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} autoFocus
                      style={{ flex: 1, border: '1.5px solid var(--sand2)', borderRadius: 10, padding: '9px 10px', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 800 }} />
                    <button onClick={saveNewPrice} disabled={savingPrice} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer', opacity: savingPrice ? 0.6 : 1 }}>{savingPrice ? '…' : 'Save'}</button>
                    <button onClick={() => setEditingPrice(false)} style={{ background: 'transparent', color: '#888', border: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 10, color: '#999', textAlign: 'center', marginTop: 6 }}>Lowering the price alerts everyone who saved this item.</div>
              </>
            ) : (
              <Link href={`/listings/${id}/edit`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: '#fff', color: '#555', border: '1.5px solid var(--sand2)', borderRadius: 12, padding: '11px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900 }}>
                {t('Edit')} {job ? t('job posting') : t('property listing')}
              </Link>
            )}
          </div>
        ) : job ? (
          <div style={cardBox}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openApply} disabled={applied} style={{ flex: 1, background: applied ? 'var(--sage)' : 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 8px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: applied ? 'default' : 'pointer', lineHeight: 1.25 }}>{applied ? '✓ Applied' : <>✉️ {t('Apply')}<br />{t('Now')}</>}</button>
              {seller?.id && <MessageButton listingId={id} sellerId={seller.id} label={t('Message Employer')} flex={1} />}
            </div>
            <div style={{ textAlign: 'center', fontSize: 10.5, color: '#777', fontFamily: 'var(--font-comfortaa)', marginTop: 8 }}>{t('Free to apply · your application goes straight to the employer')}</div>
          </div>
        ) : prop ? (
          seller?.id && <MessageButton listingId={id} sellerId={seller.id} label={t('Enquire')} primary flex={1} />
        ) : null}
        {basketErr && !job && !prop && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#c0392b', textAlign: 'center', marginTop: -4 }}>{basketErr}</div>}

        {/* Details + Seller — the two-column panel from the template */}
        <div className="listing-two-col">
          {/* LEFT: item facts */}
          <div style={cardBox}>
            <div style={panelTitle}>{t('Details')}</div>
            {job ? (
              <>
                <DetailRow label={t('Establishment')} value={job.company} />
                <DetailRow label={t('Reference')} value={ref} />
                <DetailRow label={t('Category')} value={job.sector} />
                <DetailRow label={t('Hours')} value={job.hours} />
                <DetailRow label={t('Starts')} value={job.startDate ? new Date(job.startDate).toLocaleDateString() : ''} />
                <DetailRow label={t('Address')} value={job.address} />
                <DetailRow label={t('Skills')} value={job.skills?.length ? job.skills.join(', ') : ''} />
              </>
            ) : prop ? (
              <>
                <DetailRow label={t('Reference')} value={ref} />
                <DetailRow label={t('Bedrooms')} value={prop.bedrooms != null ? String(prop.bedrooms) : ''} />
                <DetailRow label={t('Bathrooms')} value={prop.bathrooms != null ? String(prop.bathrooms) : ''} />
                <DetailRow label={t('Size')} value={prop.m2 != null ? `${Number(prop.m2)}m²` : ''} />
                <DetailRow label={t('Pool')} value={prop.hasPool ? t('Yes') : ''} />
                <DetailRow label={t('Garage')} value={prop.hasGarage ? t('Yes') : ''} />
                <DetailRow label={t('Category')} value={DEPT_LABEL[listing.department] ?? listing.department} />
              </>
            ) : (
              // Two columns so the box stays short — item facts are all brief.
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 14 }}>
                <DetailRow label={t('Condition')} value={listing.condition ? (COND_LABEL[listing.condition] ?? listing.condition) : ''} always />
                <DetailRow label={t('Reference')} value={ref} always />
                <DetailRow label={t('Model / Brand')} value={listing.brand} always />
                <DetailRow label={t('Colour')} value={listing.colour} always />
                <DetailRow label={t('Size')} value={listing.size} always />
                {listing.attributes && typeof listing.attributes === 'object' && Object.entries(listing.attributes as Record<string, string>).map(([k, v]) => (
                  v ? <DetailRow key={k} label={t(k)} value={v} /> : null
                ))}
                <DetailRow label={t('Category')} value={DEPT_LABEL[listing.department] ?? listing.department} always />
                {typeof listing.stock === 'number' && (
                  <DetailRow label={t('Availability')} value={listing.stock > 0 ? `${listing.stock} ${t('in stock')}` : t('Out of stock')} always />
                )}
              </div>
            )}
          </div>

          {/* RIGHT: seller, more from them, fulfilment, keywords */}
          <div style={cardBox}>
            <div style={panelTitle}>{job ? t('Employer') : t('Seller')}</div>
            <div
              onClick={() => seller?.id && openPanel('storefront', { sellerId: seller.id })}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: seller?.id ? 'pointer' : 'default' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-nunito)', flexShrink: 0 }}>
                {(seller?.tradingName ?? job?.company ?? seller?.displayName ?? '?')[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {job?.company ?? seller?.tradingName ?? seller?.displayName ?? 'Grabitt User'}
                  </span>
                  {seller?.grade && <span style={{ fontSize: 11 }}>{gradeEmoji[seller.grade]}</span>}
                  {(seller?.isVerified || seller?.businessVerified) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dcfce7', color: '#16a34a', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '2px 7px', borderRadius: 50, whiteSpace: 'nowrap' }}>🛡️ {t('Verified')}</span>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--orange)', fontFamily: 'var(--font-nunito)', fontWeight: 700, marginTop: 1 }}>
                  {seller?.avgRating ? `★ ${seller.avgRating} ${t('ratings')} ›` : t('New on Grabitt')}
                </div>
              </div>
            </div>

            {/* On a job listing this seller box would show the employer's other
                *items*, which is confusing — jobs get their own "More jobs from
                this employer" card below instead. */}
            {!job && sellerOther.length > 0 && (
              <>
                <div style={subLabel}>{t('More from this seller')}</div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 3 }}>
                  {sellerOther.map((o: SellerOther) => (
                    <Link key={o.id} href={`/listings/${o.id}`} style={{ flex: '0 0 auto', width: 54, textDecoration: 'none' }}>
                      <div style={{ height: 46, borderRadius: 8, background: 'linear-gradient(145deg,#FFF3EE,#FFE4D6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, overflow: 'hidden' }}>
                        {Array.isArray(o.images) && o.images[0]
                          ? <img src={o.images[0]} alt={o.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : deptEmoji(o.department)}
                      </div>
                      <div style={{ fontSize: 9, fontFamily: 'var(--font-nunito)', fontWeight: 900, color: 'var(--orange)', textAlign: 'center', marginTop: 2 }}>€{Number(o.price).toLocaleString()}</div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {!job && !prop && (
              <>
                <div style={subLabel}>{t('Fulfilment')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <FulChip on={listing.deliveryMethod === 'courier'} label={t('Post')} />
                  <FulChip on={listing.deliveryMethod === 'in_person'} label={t('Deliver')} />
                  <FulChip on={!listing.deliveryMethod} label={t('Collect')} />
                </div>
              </>
            )}

            {keywords.length > 0 && (
              <>
                <div style={subLabel}>{t('Keywords')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {keywords.map((k: string) => (
                    <Link key={k} href={`/search?q=${encodeURIComponent(k)}`} style={{ background: '#f0f0f0', color: '#666', fontSize: 9.5, fontFamily: 'var(--font-nunito)', fontWeight: 700, padding: '3px 8px', borderRadius: 50, textDecoration: 'none' }}>{k}</Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* More jobs from this employer */}
        {job && empJobs.length > 0 && (
          <div style={cardBox}>
            <div style={sectionTitle}>{t('More jobs from this employer')}</div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {empJobs.map((ej: any) => (
                <Link key={ej.id} href={`/listings/${ej.listing.id}`} style={{ flex: '0 0 auto', width: 92, textDecoration: 'none' }}>
                  <div style={{ height: 64, borderRadius: 10, background: 'linear-gradient(145deg,#FFF3EE,#FFE4D6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, overflow: 'hidden' }}>
                    {Array.isArray(ej.listing.images) && ej.listing.images[0] ? <img src={ej.listing.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '💼'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10.5, fontWeight: 800, color: 'var(--dark)', marginTop: 4, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ej.jobTitle}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <div style={cardBox}>
            <div style={sectionTitle}>{t('Description')}</div>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, fontFamily: 'var(--font-comfortaa)', whiteSpace: 'pre-wrap' }}>{listing.description}</p>
          </div>
        )}

        {/* Recently sold comparables */}
        {comps && listing.department !== 'jobs' && listing.department !== 'property' && (
          <div style={cardBox}>
            <div style={sectionTitle}>{t('Recently sold — similar items')}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {[{ k: 'Average', v: comps.avg }, { k: 'Lowest', v: comps.min }, { k: 'Highest', v: comps.max }].map(m => (
                <div key={m.k} style={{ flex: 1, background: '#f5f0e8', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#9a8b74', marginBottom: 3 }}>{m.k}</div>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 16, fontWeight: 800, color: 'var(--dark)' }}>€{Number(m.v).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location map — use the exact pinned coordinates when set, else the address/town */}
        {(() => {
          const hasPin = listing.lat != null && listing.lng != null
          const label = (job?.address || listing.location || '').trim()
          if (!hasPin && !label) return null
          const q = hasPin ? `${listing.lat},${listing.lng}` : label
          return (
            <div style={cardBox}>
              <div style={sectionTitle}>{t('Location')}</div>
              {label && <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#555', marginBottom: 8 }}>📍 {label}</div>}
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #ece3d7' }}>
                <iframe title="Location map" src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${hasPin ? 16 : 14}&output=embed`} width="100%" height="220" style={{ border: 0, display: 'block' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
          )
        })()}

        {/* Buyer protection */}
        <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '12px 14px', border: '1px solid #c8e6c9' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#2e7d32', marginBottom: 4 }}>🛡️ Grabitt Buyer Protection</div>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-nunito)', lineHeight: 1.5 }}>{job ? 'Apply and message safely through Grabitt.' : 'Pay through Grabitt and your money is held in escrow until you confirm handover.'}</div>
        </div>

        {/* You might also like */}
        {similar.length > 0 && (
          <div style={cardBox}>
            <div style={sectionTitle}>{t('You might also like')}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {similar.map((s, i) => (
                <Link key={s.id} href={`/listings/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < similar.length - 1 ? '1px solid #f0ebe4' : 'none', textDecoration: 'none' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--sand)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {Array.isArray(s.images) && s.images[0] ? <img src={s.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : deptEmoji(s.department)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 900, color: 'var(--orange)' }}>€{Number(s.price).toLocaleString()}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--orange)', flexShrink: 0 }}>View ›</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
      <CartFab />

      {showMessage && seller?.id && (
        <MessageComposer listingId={id} sellerId={seller.id} title={t('💬 Message')} onClose={() => setShowMessage(false)} />
      )}

      {showShare && (
        <ShareSheet title={job?.jobTitle ?? listing.title} price={priceLabel} emoji={emoji} url={shareUrl} onClose={() => setShowShare(false)} />
      )}

      {showApply && job && meId && (
        <ApplyModal
          listingId={id}
          userId={meId}
          onClose={() => setShowApply(false)}
          onApplied={() => { setApplied(true); setShowApply(false) }}
        />
      )}
    </main>
  )
}

function RailBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: active ? '#FFF3EE' : '#fff', border: `1px solid ${active ? '#FF4500' : '#e8e8e8'}`, borderRadius: 12, padding: '4px', cursor: 'pointer', width: '100%' }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 800, color: active ? '#FF4500' : '#666', lineHeight: 1 }}>{t(label)}</span>
    </button>
  )
}
function Centered({ children }: { children: React.ReactNode }) {
  return <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#888', gap: 6, flexWrap: 'wrap' }}>{children}</main>
}
function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span style={{ background: muted ? '#f0f0f0' : 'var(--sand)', color: muted ? '#555' : 'var(--orange)', borderRadius: 50, padding: '3px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800 }}>{children}</span>
}
type SellerOther = { id: string; title: string; price: string | number; images: string[]; department: string }

// One stacked label/value line in the Details panel. `always` keeps the row and
// shows an em dash when the seller left the field blank, as the template does.
function DetailRow({ label, value, always }: { label: string; value?: string | null; always?: boolean }) {
  if (!value && !always) return null
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '5px 0', borderBottom: '1px solid #f4efe8' }}>
      <div style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 800, color: '#999', textTransform: 'uppercase', fontFamily: 'var(--font-nunito)' }}>{label}</div>
      <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 12, color: 'var(--dark)', fontFamily: 'var(--font-comfortaa)', fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  )
}

function FulChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontFamily: 'var(--font-nunito)', fontWeight: 700, color: on ? '#16a34a' : '#bbb' }}>
      {on ? '\u2611' : '\u2610'} {label}
    </span>
  )
}

const cardBox: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '12px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }
const panelTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: 6 }
const subLabel: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: '#555', fontFamily: 'var(--font-nunito)', margin: '10px 0 4px' }
const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }
