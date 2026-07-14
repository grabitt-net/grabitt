'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { DEPT_LABEL, COND_LABEL, deptEmoji } from '@/lib/listingMap'
import { t } from '@/lib/i18n'
import { pushView } from '@/lib/recentViews'
import { PRICES } from '@grabitt/design-tokens'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import MessageButton from '@/components/marketplace/MessageButton'
import SiteHeader from '@/components/marketplace/SiteHeader'
import QuickActions from '@/components/marketplace/QuickActions'
import ShareSheet from '@/components/marketplace/ShareSheet'
import PanelHost from '@/components/marketplace/PanelHost'

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
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [meId, setMeId] = useState<string | null>(null)
  const [comps, setComps] = useState<any>(null)
  const [similar, setSimilar] = useState<any[]>([])
  const [showShare, setShowShare] = useState(false)
  const [saved, setSaved] = useState(false)
  // Job apply flow
  const [applied, setApplied] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [applying, setApplying] = useState(false)
  const [empJobs, setEmpJobs] = useState<any[]>([])

  useEffect(() => {
    createTrpcClient().listings.byId.query({ id })
      .then((l: any) => {
        setListing(l); setState('ready')
        pushView({ id: l.id, title: l.title, price: `€${Number(l.price).toLocaleString()}`, image: Array.isArray(l.images) ? l.images[0] : null, emoji: deptEmoji(l.department), location: l.location })
        // "You might also like" — same department, excluding this listing.
        createTrpcClient().listings.getByDept.query({ department: l.department as never, sort: 'newest' })
          .then((r: any) => setSimilar(((r?.items ?? []) as any[]).filter(x => x.id !== l.id).slice(0, 4)))
          .catch(() => {})
      })
      .catch(() => setState('notfound'))
    createTrpcClient().listings.comparables.query({ id })
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
    createTrpcClient().jobs.byEmployer.query({ employerId: empId, excludeListingId: id })
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

  const submitApply = async () => {
    setApplying(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { setShowApply(false); openPanel('login'); return }
      await trpcAuthed().jobs.apply.mutate({ listingId: id, ...(coverNote.trim() && { coverNote: coverNote.trim() }) })
      setApplied(true); setShowApply(false)
    } catch { /* ignore */ } finally { setApplying(false) }
  }
  const isOwner = !!meId && meId === seller?.id
  const isRent = prop?.type === 'rent'
  const heroImg = Array.isArray(listing.images) ? listing.images[0] : null
  const emoji = deptEmoji(listing.department)
  const priceLabel = job ? salaryLabel(job.salaryMin, job.salaryMax, job.salaryPeriod) : `€${Number(listing.price).toLocaleString()}${isRent ? '/mo' : ''}`
  const ref = String(id).replace(/-/g, '').slice(0, 6).toUpperCase()
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/listings/${id}` : `/listings/${id}`

  // In-demand metrics — real data only: view count and number of people who have
  // this listing in their favourites/wishlist.
  const views = Number(listing.viewCount ?? 0)
  const watchers = Number(listing._count?.wishlistItems ?? 0)

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
    try { const th: any = await trpcAuthed().messages.thread.mutate({ listingId: id, sellerId: seller.id }); if (th?.id) router.push(`/messages/${th.id}`) }
    catch { router.push(`/auth?next=/listings/${id}`) }
  }
  const promote = async (option: 'grab_it_now' | 'featured') => {
    if (!(await requireAuth())) return
    try { const res: any = await trpcAuthed().listings.promote.mutate({ listingId: id, option, weeks: 1 }); if (res?.url) window.location.href = res.url }
    catch { alert('Could not start the payment. Please try again.') }
  }

  return (
    <main style={{ background: '#f5f2ec', minHeight: '100dvh', paddingBottom: 40 }}>
      <SiteHeader />
      <header style={{ background: 'var(--sand)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1.5px solid var(--sand2)' }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push(job ? '/jobs' : prop ? '/property' : '/') }} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark)', padding: 0, lineHeight: 1 }} aria-label="Back">←</button>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', flex: 1 }}>{DEPT_LABEL[listing.department] ?? 'Listing'}</span>
        <button onClick={() => setShowShare(true)} aria-label="Share this listing" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--sand2)', borderRadius: 50, padding: '7px 14px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: 'var(--orange)', cursor: 'pointer' }}>📤 {t('Share')}</button>
      </header>
      <QuickActions />

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720, margin: '0 auto' }}>
        {/* Hero: image + vertical action rail */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0, height: 280, borderRadius: 14, overflow: 'hidden', background: 'var(--sand)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 96, border: '1px solid #ece3d7' }}>
            {heroImg ? <img src={heroImg} alt={listing.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : emoji}
            {listing.isFeatured && <span style={{ position: 'absolute', top: 8, left: 8, background: 'var(--orange)', color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '3px 9px', borderRadius: 50 }}>⭐ FEATURED</span>}
          </div>
          <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RailBtn icon={saved ? '❤️' : '🤍'} label="Save" active={saved} onClick={toggleSave} />
            <RailBtn icon="📤" label="Share" onClick={() => setShowShare(true)} />
            {!isOwner && seller?.id && <RailBtn icon="💬" label="Message" onClick={startChat} />}
          </div>
        </div>

        {/* Title + In-Demand */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {job && <Chip>{JOB_TYPE[job.type] ?? job.type}</Chip>}
              {prop && <Chip>{PROP_TYPE[prop.type] ?? prop.type}</Chip>}
              {listing.condition && !job && !prop && <Chip muted>{COND_LABEL[listing.condition] ?? listing.condition}</Chip>}
              {job?.remote && <Chip>Remote</Chip>}
            </div>
            <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 19, fontWeight: 900, color: 'var(--dark)', lineHeight: 1.25 }}>{job?.jobTitle ?? listing.title}</h1>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 24, fontWeight: 900, color: 'var(--orange)', marginTop: 2 }}>{priceLabel}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 3, fontFamily: 'var(--font-comfortaa)' }}>📍 {job?.remote ? 'Remote' : (listing.location ?? 'Gran Canaria')} · Ref: {ref}</div>
            <div onClick={() => openPanel('shield')} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 9px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12 }}>🛡️</span>
              <span style={{ fontSize: 10, color: '#16a34a', fontFamily: 'var(--font-nunito)', fontWeight: 900 }}>Protected by the Grabitt Guarantee ›</span>
            </div>
          </div>
          <div style={{ width: 112, flexShrink: 0, background: '#FFF8F4', border: '1px solid #FFE0CC', borderRadius: 12, padding: '8px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 900, color: '#d35400', textTransform: 'uppercase', textAlign: 'center', marginBottom: 5 }}>🔥 In demand</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', gap: 2 }}>
              {[[views, 'views'], [watchers, 'watching']].map(([n, lab], i) => (
                <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{n as number}</div>
                  <div style={{ fontSize: 8, color: '#777', fontFamily: 'var(--font-comfortaa)', lineHeight: 1.1 }}>{lab as string}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Primary actions */}
        {isOwner ? (
          <div style={cardBox}>
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 700, color: '#888', marginBottom: (job || prop) ? 0 : 8 }}>
              Your {job ? 'job posting' : prop ? 'property listing' : 'listing'} — {job ? 'applicants' : 'enquiries'} appear in <Link href="/messages" style={{ color: 'var(--orange)', fontWeight: 800 }}>Messages</Link>.
            </div>
            {!job && !prop && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => promote('grab_it_now')} style={{ flex: 1, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>⚡ Grab It Now · €{PRICES.grabItNow}</button>
                <button onClick={() => promote('featured')} style={{ flex: 1, background: '#fff', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 12, padding: '11px 8px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>👀 Feature · €{PRICES.featuredPerWeek}/wk</button>
              </div>
            )}
          </div>
        ) : job ? (
          <div style={cardBox}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { if (!applied) setShowApply(true) }} disabled={applied} style={{ flex: 1, background: applied ? 'var(--sage)' : 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 8px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: applied ? 'default' : 'pointer', lineHeight: 1.25 }}>{applied ? '✓ Applied' : <>✉️ {t('Apply')}<br />{t('Now')}</>}</button>
              {seller?.id && <MessageButton listingId={id} sellerId={seller.id} label={t('Message Employer')} flex={1} />}
            </div>
            <div style={{ textAlign: 'center', fontSize: 10.5, color: '#777', fontFamily: 'var(--font-comfortaa)', marginTop: 8 }}>{t('Free to apply · your application goes straight to the employer')}</div>
          </div>
        ) : prop ? (
          seller?.id && <MessageButton listingId={id} sellerId={seller.id} label={t('Enquire')} primary flex={1} />
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => openPanel('checkout', panelItem)} style={{ flex: 1, background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 8px', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: 'pointer', lineHeight: 1.25 }}>🛒 Buy Now<br /><span style={{ fontSize: 12 }}>{priceLabel}</span></button>
            <button onClick={() => openPanel('makeOffer', panelItem)} style={{ flex: 1, background: '#fff', color: '#FF4500', border: '2px solid #FF4500', borderRadius: 12, padding: '15px 8px', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: 'pointer', lineHeight: 1.25 }}>💰 Make<br />an Offer</button>
          </div>
        )}

        {/* Details */}
        {(job || prop || listing.condition || (typeof listing.stock === 'number')) && (
          <div style={cardBox}>
            <div style={sectionTitle}>{t('Details')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {!job && !prop && listing.condition && <Fact label="Condition" value={COND_LABEL[listing.condition] ?? listing.condition} />}
              {!job && listing.department !== 'property' && typeof listing.stock === 'number' && <Fact label="Availability" value={listing.stock > 0 ? `${listing.stock} in stock${listing.stock > 1 ? ' · multi-buy' : ''}` : 'Out of stock'} />}
              {job && <><Fact label="Employer" value={job.company} />{job.sector && <Fact label="Category" value={job.sector} />}{job.hours && <Fact label="Hours" value={job.hours} />}{job.startDate && <Fact label="Starts" value={new Date(job.startDate).toLocaleDateString()} />}{job.address && <Fact label="Address" value={job.address} />}{job.skills?.length ? <Fact label="Skills" value={job.skills.join(', ')} /> : null}</>}
              {prop && <>{prop.bedrooms != null && <Fact label="Bedrooms" value={String(prop.bedrooms)} />}{prop.bathrooms != null && <Fact label="Bathrooms" value={String(prop.bathrooms)} />}{prop.m2 != null && <Fact label="Size" value={`${Number(prop.m2)}m²`} />}{prop.hasPool && <Fact label="Pool" value="Yes" />}{prop.hasGarage && <Fact label="Garage" value="Yes" />}</>}
            </div>
          </div>
        )}

        {/* Seller */}
        <div style={cardBox}>
          <div style={sectionTitle}>{job ? 'Employer' : 'Seller'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-nunito)', flexShrink: 0 }}>{(seller?.displayName ?? job?.company ?? '?')[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{job?.company ?? seller?.displayName ?? 'Grabitt User'}{seller?.grade && <span style={{ marginLeft: 6, fontSize: 12 }}>{gradeEmoji[seller.grade]}</span>}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'var(--font-nunito)' }}>{seller?.avgRating ? `⭐ ${seller.avgRating} · ${seller.salesCount ?? 0} sales` : 'New on Grabitt'}</div>
            </div>
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

        {/* Keywords */}
        {job && jobKeywords.length > 0 && (
          <div style={cardBox}>
            <div style={sectionTitle}>{t('Keywords')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {jobKeywords.map(k => (
                <span key={k} style={{ background: '#f0ebe4', color: '#6b5d48', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 50 }}>{k}</span>
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

        {/* Tags */}
        {Array.isArray(listing.tags) && listing.tags.length > 0 && (
          <div style={cardBox}>
            <div style={sectionTitle}>{t('Tags')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {listing.tags.map((tg: string) => (
                <Link key={tg} href={`/listings?q=${encodeURIComponent(tg)}`} style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, fontWeight: 600, color: '#6b5a41', background: '#f5f0e8', border: '1px solid #ece3d7', borderRadius: 999, padding: '5px 12px', textDecoration: 'none' }}>#{tg}</Link>
              ))}
            </div>
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

        {/* Location map */}
        {(() => {
          const q = (job?.address || listing.location || '').trim()
          if (!q) return null
          return (
            <div style={cardBox}>
              <div style={sectionTitle}>{t('Location')}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#555', marginBottom: 8 }}>📍 {q}</div>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #ece3d7' }}>
                <iframe title="Location map" src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`} width="100%" height="220" style={{ border: 0, display: 'block' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
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

      {showShare && (
        <ShareSheet title={job?.jobTitle ?? listing.title} price={priceLabel} emoji={emoji} url={shareUrl} onClose={() => setShowShare(false)} />
      )}

      {showApply && job && (
        <div onClick={() => setShowApply(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0', padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{t('Apply for')} {job.jobTitle}</div>
            <div style={{ fontSize: 12, color: '#777', fontFamily: 'var(--font-comfortaa)', marginBottom: 12 }}>{t('Add a short note for the employer (optional).')}</div>
            <textarea value={coverNote} onChange={e => setCoverNote(e.target.value)} placeholder={t("Why you're a great fit…")} style={{ width: '100%', boxSizing: 'border-box', minHeight: 96, border: '1.5px solid #e5dccd', borderRadius: 12, padding: 12, fontFamily: 'var(--font-comfortaa)', fontSize: 13, outline: 'none', resize: 'vertical' }} />
            <button onClick={submitApply} disabled={applying} style={{ width: '100%', marginTop: 12, background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: applying ? 'wait' : 'pointer' }}>{applying ? t('Sending…') : `${t('Send application')} →`}</button>
            <button onClick={() => setShowApply(false)} style={{ width: '100%', marginTop: 8, background: 'none', color: '#888', border: 'none', padding: 8, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{t('Cancel')}</button>
          </div>
        </div>
      )}
    </main>
  )
}

function RailBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: active ? '#FFF3EE' : '#fff', border: `1px solid ${active ? '#FF4500' : '#e8e8e8'}`, borderRadius: 12, padding: '9px 4px', cursor: 'pointer', width: '100%' }}>
      <span style={{ fontSize: 17 }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 8, fontWeight: 800, color: active ? '#FF4500' : '#666', lineHeight: 1 }}>{t(label)}</span>
    </button>
  )
}
function Centered({ children }: { children: React.ReactNode }) {
  return <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', fontFamily: 'var(--font-nunito)', color: '#888', gap: 6, flexWrap: 'wrap' }}>{children}</main>
}
function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span style={{ background: muted ? '#f0f0f0' : 'var(--sand)', color: muted ? '#555' : 'var(--orange)', borderRadius: 50, padding: '3px 10px', fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800 }}>{children}</span>
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: '1 0 40%' }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'var(--font-nunito)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', fontFamily: 'var(--font-nunito)', marginTop: 2 }}>{value}</div>
    </div>
  )
}

const cardBox: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }
const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }
