'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { DEPT_LABEL, COND_LABEL, deptEmoji } from '@/lib/listingMap'
import { pushView } from '@/lib/recentViews'
import { PRICES } from '@grabitt/design-tokens'
import MessageButton from '@/components/marketplace/MessageButton'
import SiteHeader from '@/components/marketplace/SiteHeader'

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
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [meId, setMeId] = useState<string | null>(null)
  const [comps, setComps] = useState<any>(null)

  useEffect(() => {
    createTrpcClient().listings.byId.query({ id })
      .then((l: any) => {
        setListing(l); setState('ready')
        pushView({ id: l.id, title: l.title, price: `€${Number(l.price).toLocaleString()}`, image: Array.isArray(l.images) ? l.images[0] : null, emoji: deptEmoji(l.department), location: l.location })
      })
      .catch(() => setState('notfound'))
    createTrpcClient().listings.comparables.query({ id })
      .then((c: any) => { if (c && c.count > 0) setComps(c) })
      .catch(() => {})
  }, [id])

  // Resolve the signed-in user's id so we can hide "Enquire/Apply" on your own listing.
  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) return
      try { const me: any = await trpcAuthed().users.me.query(); setMeId(me?.id ?? null) } catch { /* ignore */ }
    })()
  }, [])

  if (state === 'loading') return <Centered>Loading…</Centered>
  if (state === 'notfound' || !listing) return <Centered>This listing is no longer available. <Link href="/" style={{ color: 'var(--orange)', fontWeight: 800 }}>Back home</Link></Centered>

  const job = listing.jobListing
  const prop = listing.propertyListing
  const seller = listing.seller
  const isOwner = !!meId && meId === seller?.id
  const isRent = prop?.type === 'rent'

  const promote = async (option: 'grab_it_now' | 'featured') => {
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push(`/auth?next=/listings/${id}`); return }
      const res: any = await trpcAuthed().listings.promote.mutate({ listingId: id, option, weeks: 1 })
      if (res?.url) window.location.href = res.url
    } catch { alert('Could not start the payment. Please try again.') }
  }
  const heroImg = Array.isArray(listing.images) ? listing.images[0] : null

  return (
    <main style={{ background: '#f5f2ec', minHeight: '100dvh', paddingBottom: 100 }}>
      <SiteHeader />
      <header style={{ background: 'var(--sand)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1.5px solid var(--sand2)' }}>
        <button
          onClick={() => { if (window.history.length > 1) router.back(); else router.push(job ? '/jobs' : prop ? '/property' : '/') }}
          style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark)', padding: 0, lineHeight: 1 }}
          aria-label="Back"
        >←</button>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', flex: 1 }}>
          {DEPT_LABEL[listing.department] ?? 'Listing'}
        </span>
      </header>

      <div style={{ height: 240, background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, position: 'relative', overflow: 'hidden' }}>
        {heroImg ? <img src={heroImg} alt={listing.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : deptEmoji(listing.department)}
      </div>

      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720, margin: '0 auto' }}>
        <div style={cardBox}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {job && <Chip>{JOB_TYPE[job.type] ?? job.type}</Chip>}
            {prop && <Chip>{PROP_TYPE[prop.type] ?? prop.type}</Chip>}
            {listing.condition && !job && !prop && <Chip muted>{COND_LABEL[listing.condition] ?? listing.condition}</Chip>}
            {job?.remote && <Chip>Remote</Chip>}
          </div>
          <h1 style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 8 }}>
            {job?.jobTitle ?? listing.title}
          </h1>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 26, fontWeight: 900, color: 'var(--orange)' }}>
            {job ? salaryLabel(job.salaryMin, job.salaryMax, job.salaryPeriod) : `€${Number(listing.price).toLocaleString()}${isRent ? '/mo' : ''}`}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 6, fontFamily: 'var(--font-nunito)' }}>
            📍 {job?.remote ? 'Remote' : (listing.location ?? 'Gran Canaria')}
          </div>
          {!job && listing.department !== 'property' && typeof listing.stock === 'number' && (
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, fontWeight: 700, color: listing.stock > 0 ? '#2d996b' : '#c1121f', marginTop: 6 }}>
              {listing.stock > 0 ? `${listing.stock} in stock${listing.stock > 1 ? ' — multi-buy available' : ''}` : 'Out of stock'}
            </div>
          )}

          {/* Job facts */}
          {job && (
            <div style={factRow}>
              <Fact label="Employer" value={job.company} />
              {job.sector && <Fact label="Category" value={job.sector} />}
              {job.hours && <Fact label="Hours" value={job.hours} />}
              {job.startDate && <Fact label="Starts" value={new Date(job.startDate).toLocaleDateString()} />}
              {job.payments && <Fact label="Payments/yr" value={String(job.payments)} />}
              {(job.overtime || job.tips) && <Fact label="Extras" value={[job.overtime && 'Overtime', job.tips && 'Tips'].filter(Boolean).join(' · ')} />}
              {job.address && <Fact label="Address" value={job.address} />}
              {job.skills?.length ? <Fact label="Skills" value={job.skills.join(', ')} /> : null}
            </div>
          )}
          {/* Property facts */}
          {prop && (
            <div style={factRow}>
              {prop.bedrooms != null && <Fact label="Bedrooms" value={String(prop.bedrooms)} />}
              {prop.bathrooms != null && <Fact label="Bathrooms" value={String(prop.bathrooms)} />}
              {prop.m2 != null && <Fact label="Size" value={`${Number(prop.m2)}m²`} />}
              {prop.hasPool && <Fact label="Pool" value="Yes" />}
              {prop.hasGarage && <Fact label="Garage" value="Yes" />}
            </div>
          )}
        </div>

        {listing.description && (
          <div style={cardBox}>
            <div style={sectionTitle}>Description</div>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, fontFamily: 'var(--font-comfortaa)', whiteSpace: 'pre-wrap' }}>{listing.description}</p>
          </div>
        )}

        {Array.isArray(listing.tags) && listing.tags.length > 0 && (
          <div style={cardBox}>
            <div style={sectionTitle}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {listing.tags.map((t: string) => (
                <Link key={t} href={`/listings?q=${encodeURIComponent(t)}`} style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, fontWeight: 600, color: '#6b5a41', background: '#f5f0e8', border: '1px solid #ece3d7', borderRadius: 999, padding: '5px 12px', textDecoration: 'none' }}>#{t}</Link>
              ))}
            </div>
          </div>
        )}

        {comps && listing.department !== 'jobs' && listing.department !== 'property' && (
          <div style={cardBox}>
            <div style={sectionTitle}>Recently sold — similar items</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {[{ k: 'Average', v: comps.avg }, { k: 'Lowest', v: comps.min }, { k: 'Highest', v: comps.max }].map(m => (
                <div key={m.k} style={{ flex: 1, background: '#f5f0e8', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#9a8b74', marginBottom: 3 }}>{m.k}</div>
                  <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 16, fontWeight: 800, color: 'var(--dark)' }}>€{Number(m.v).toLocaleString()}</div>
                </div>
              ))}
            </div>
            {(() => {
              const price = Number(listing.price)
              if (!comps.avg || !price) return null
              const diff = Math.round(((price - comps.avg) / comps.avg) * 100)
              const good = diff <= 0
              return (
                <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, fontWeight: 700, color: good ? '#2d996b' : '#c1121f', marginBottom: 10 }}>
                  {diff === 0 ? 'Priced right at the average' : `${Math.abs(diff)}% ${good ? 'below' : 'above'} the average sold price`}
                </div>
              )
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {comps.recent.map((r: any, i: number) => (
                <Link key={i} href={`/listings/${r.id}`} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-comfortaa)', fontSize: 12.5, color: '#555', textDecoration: 'none', padding: '4px 0', borderBottom: i < comps.recent.length - 1 ? '1px solid #f0e9df' : 'none' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{r.title}</span>
                  <span style={{ fontWeight: 800, color: 'var(--dark)' }}>€{Number(r.amount).toLocaleString()}</span>
                </Link>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#9a8b74', marginTop: 8 }}>Based on {comps.count} recent sale{comps.count === 1 ? '' : 's'} in {DEPT_LABEL[listing.department] ?? 'this category'}.</div>
          </div>
        )}

        {/* Location map (jobs use the full address; others use the town/area) */}
        {(() => {
          const q = (job?.address || listing.location || '').trim()
          if (!q) return null
          return (
            <div style={cardBox}>
              <div style={sectionTitle}>Location</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#555', marginBottom: 8 }}>📍 {q}</div>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #ece3d7' }}>
                <iframe
                  title="Location map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`}
                  width="100%" height="220" style={{ border: 0, display: 'block' }}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )
        })()}

        <div style={cardBox}>
          <div style={sectionTitle}>{job ? 'Employer' : 'Seller'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 900, fontFamily: 'var(--font-nunito)', flexShrink: 0 }}>
              {(seller?.displayName ?? job?.company ?? '?')[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>
                {job?.company ?? seller?.displayName ?? 'Grabitt User'}
                {seller?.grade && <span style={{ marginLeft: 6, fontSize: 12 }}>{gradeEmoji[seller.grade]}</span>}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'var(--font-nunito)' }}>
                {seller?.avgRating ? `⭐ ${seller.avgRating} · ${seller.salesCount ?? 0} sales` : 'New on Grabitt'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '12px 14px', border: '1px solid #c8e6c9' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#2e7d32', marginBottom: 4 }}>🛡️ Grabitt Buyer Protection</div>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-nunito)', lineHeight: 1.5 }}>
            {job ? 'Apply and message safely through Grabitt.' : 'Pay through Grabitt and your money is held in escrow until you confirm handover.'}
          </div>
        </div>
      </div>

      {seller?.id && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px max(12px, env(safe-area-inset-bottom))', display: 'flex', gap: 10, zIndex: 99, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', maxWidth: 720, margin: '0 auto', alignItems: 'center' }}>
          {isOwner ? (
            <div style={{ flex: 1 }}>
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
          ) : (job || prop) ? (
            // Jobs/property: the primary action is to contact the seller/employer.
            <MessageButton listingId={id} sellerId={seller.id} label={job ? 'Apply / Enquire' : 'Enquire'} primary flex={1} />
          ) : (
            <>
              <MessageButton listingId={id} sellerId={seller.id} />
              <button style={{ flex: 2, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,69,0,0.35)' }}>
                Buy Now
              </button>
            </>
          )}
        </div>
      )}
    </main>
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
const factRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0ebe4' }
const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }
