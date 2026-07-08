'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createTrpcClient } from '@/lib/trpc'
import { DEPT_LABEL, COND_LABEL, deptEmoji } from '@/lib/listingMap'
import MessageButton from '@/components/marketplace/MessageButton'

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
  const [listing, setListing] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  useEffect(() => {
    createTrpcClient().listings.byId.query({ id })
      .then(l => { setListing(l); setState('ready') })
      .catch(() => setState('notfound'))
  }, [id])

  if (state === 'loading') return <Centered>Loading…</Centered>
  if (state === 'notfound' || !listing) return <Centered>This listing is no longer available. <Link href="/" style={{ color: 'var(--orange)', fontWeight: 800 }}>Back home</Link></Centered>

  const job = listing.jobListing
  const prop = listing.propertyListing
  const seller = listing.seller
  const isRent = prop?.type === 'rent'
  const heroImg = Array.isArray(listing.images) ? listing.images[0] : null

  return (
    <main style={{ background: '#f5f2ec', minHeight: '100dvh', paddingBottom: 100 }}>
      <header style={{ background: 'var(--sand)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1.5px solid var(--sand2)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href={job ? '/jobs' : prop ? '/property' : '/'} style={{ fontSize: 22, textDecoration: 'none', color: 'var(--dark)' }}>←</Link>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px max(12px, env(safe-area-inset-bottom))', display: 'flex', gap: 10, zIndex: 99, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', maxWidth: 720, margin: '0 auto' }}>
          {(job || prop) ? (
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
