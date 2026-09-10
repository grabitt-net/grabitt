'use client'
import { useEffect, useRef, useState } from 'react'
import { toast } from '@/lib/ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import Footer from '@/components/marketplace/Footer'
import AddressAutocomplete from '@/components/marketplace/AddressAutocomplete'
import { compressAndUpload, listingPhotoPath } from '@/lib/storage'
import { autoFillDistances } from '@/lib/nearby'
import { PROPERTY_FEATURES } from '@/lib/propertyFeatures'
import PromoField from '@/components/marketplace/PromoField'
import { PROPERTY_PRICING, PRICES } from '@grabitt/design-tokens'

const FEATURED_PER_WEEK_CENTS = Math.round(PRICES.featuredPerWeek * 100)
import { AGENTS_ENABLED } from '@/lib/flags'
import { Section, Row, Field, Input, Textarea, Select, FormError, StepTabs, SubmitButton } from '@/components/marketplace/FormKit'
import type { IconName } from '@/components/marketplace/Icon'

const MapPicker = dynamic(() => import('@/components/marketplace/MapPicker'), { ssr: false })

// Property listing form — mirrors /jobs/new. Creates the Listing *and* its
// PropertyListing detail row, which is what the /property search reads.
const TYPES: [string, string][] = [
  ['For Sale', 'sale'], ['To Let', 'rent'], ['Holiday Let', 'holiday'],
  ['Commercial', 'commercial'], ['Land', 'land'], ['New Build', 'new_build'],
]
// Dwelling / property type (what the place actually is).
const PROPERTY_TYPES: [string, string][] = [
  ['Apartment / Flat', 'flat'], ['Bungalow', 'bungalow'], ['House / Villa', 'villa'],
  ['Townhouse', 'townhouse'], ['Studio', 'studio'], ['Duplex', 'duplex'],
  ['Commercial space', 'commercial'], ['Office', 'office'], ['Shop', 'shop'],
  ['Bar / Restaurant', 'bar_restaurant'], ['Warehouse', 'warehouse'], ['Land / Plot', 'land'],
  ['Garage / Parking', 'garage'], ['Other', 'other'],
]
const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
// Bedroom / bathroom dropdown options.
const BED_OPTS = ['Studio', '1', '2', '3', '4', '5', '6', '7', '8+']
const BATH_OPTS = ['1', '2', '3', '4', '5', '6+']
const ORIENTATIONS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => String(CURRENT_YEAR - i))

export default function NewPropertyPage() {
  const router = useRouter()
  const [f, setF] = useState({
    title: '', type: 'sale', propertyType: '', price: '', location: '',
    bedrooms: '', bathrooms: '', m2: '', floor: '', energyRating: '',
    description: '',
    // Rental terms + extended portal details.
    rentalTerm: '', touristLicence: '',
    furnished: '', orientation: '',
    yearBuilt: '', communityFees: '', views: '',
    // Full agent-listing detail.
    reference: '', address: '',
    distShops: '', distSchools: '', distBeach: '', distTown: '',
  })
  const [features, setFeatures] = useState<string[]>([])
  // Photos (uploaded to storage as they're added) + the €4.99 sponsored add-on.
  const [draftId] = useState(() => (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now())))
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [sponsored, setSponsored] = useState(false)
  const [featuredWeeks, setFeaturedWeeks] = useState(0)
  const [autoDist, setAutoDist] = useState<'idle' | 'loading' | 'done'>('idle')
  const toggleFeature = (slug: string) => setFeatures(p => p.includes(slug) ? p.filter(x => x !== slug) : [...p, slug])
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountCents: number } | null>(null)
  // Agents need a Business account AND a property-agent plan with remaining
  // allowance before they can list.
  const [gate, setGate] = useState<'checking' | 'ok' | 'needbusiness' | 'needplan'>('checking')
  const [allowance, setAllowance] = useState<{ allowance: number; inUse: number; remaining: number; isBusiness?: boolean } | null>(null)
  // Agent contact profile — saved to the user and shown on every property they
  // list, so buyers can reach them by WhatsApp / email directly.
  const [agent, setAgent] = useState({ agencyName: '', agentWhatsapp: '', agentEmail: '' })
  // The Agent contact tab only exists for property-agent accounts.
  const [isAgent, setIsAgent] = useState(false)

  // Auto-save draft — never lose a half-written property advert. Saved to the
  // browser; offered back on return; cleared once the property is posted.
  const PROP_DRAFT_KEY = 'grabitt_property_draft'
  const [draftFound, setDraftFound] = useState<any | null>(null)
  const draftBody = JSON.stringify({ f, features, photos, sponsored })
  useEffect(() => {
    if (f.title.trim() || f.address.trim() || f.description.trim() || photos.length) {
      try { localStorage.setItem(PROP_DRAFT_KEY, draftBody) } catch {}
    }
  }, [draftBody, f.title, f.address, f.description, photos.length])
  useEffect(() => {
    try { const raw = localStorage.getItem(PROP_DRAFT_KEY); if (raw) { const d = JSON.parse(raw); if (d?.f && (d.f.title || d.f.address)) setDraftFound(d) } } catch {}
  }, [])
  const restoreDraft = () => {
    const d = draftFound; if (!d) return
    if (d.f) setF({ ...f, ...d.f })
    if (Array.isArray(d.features)) setFeatures(d.features)
    if (Array.isArray(d.photos)) setPhotos(d.photos)
    if (typeof d.sponsored === 'boolean') setSponsored(d.sponsored)
    setDraftFound(null)
  }
  const discardDraft = () => { try { localStorage.removeItem(PROP_DRAFT_KEY) } catch {}; setDraftFound(null) }

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }))
  const setAg = (k: string, v: string) => setAgent(prev => ({ ...prev, [k]: v }))

  // Photos — compressed + uploaded to storage as they're added (URLs kept in the
  // draft so they survive a refresh).
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadingPhoto(true)
    try {
      for (const file of Array.from(files).slice(0, 8 - photos.length)) {
        if (!file.type.startsWith('image/')) continue
        const url = await compressAndUpload(file, listingPhotoPath(draftId))
        setPhotos(p => [...p, url])
      }
    } catch { toast('Could not upload a photo. Please try again.') }
    finally { setUploadingPhoto(false) }
  }
  const removePhoto = (url: string) => setPhotos(p => p.filter(x => x !== url))

  // Auto-fill the distance-to fields from the map location (OpenStreetMap).
  const runAutoDistances = async (silent = false) => {
    if (!coords) { if (!silent) toast('Pick the address / map pin first.'); return }
    setAutoDist('loading')
    try {
      const d = await autoFillDistances(coords.lat, coords.lng)
      const found = [d.distShops, d.distSchools, d.distBeach, d.distTown].some(v => v != null)
      setF(prev => ({
        ...prev,
        distShops: d.distShops != null ? String(d.distShops) : prev.distShops,
        distSchools: d.distSchools != null ? String(d.distSchools) : prev.distSchools,
        distBeach: d.distBeach != null ? String(d.distBeach) : prev.distBeach,
      }))
      if (!silent && !found) toast('Could not find nearby places automatically — you can enter the distances manually.')
    } catch {
      if (!silent) toast('Auto-fill is unavailable right now — please enter the distances manually.')
    } finally {
      setAutoDist('done')
    }
  }
  // Auto-run once when a location is first picked and distances are still blank.
  const didAutoDist = useRef(false)
  useEffect(() => {
    if (coords && !didAutoDist.current && !f.distShops && !f.distSchools && !f.distBeach) {
      didAutoDist.current = true
      runAutoDistances(true)
    }
  }, [coords]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/property/new'); return }
      try {
        const [me, allow]: any = await Promise.all([
          (trpcAuthed() as any).users.me.query(),
          (trpcAuthed() as any).property.myAllowance.query(),
        ])
        setAllowance(allow)
        setIsAgent(AGENTS_ENABLED && !!me?.isPropertyAgent && !me?.isBusiness)
        // Anyone can advertise property now (private or business). Beyond the
        // free allowance the listing is €39, taken at submit.
        setGate('ok')
        setAgent({
          agencyName: me?.agencyName ?? me?.businessName ?? '',
          agentWhatsapp: me?.agentWhatsapp ?? '',
          agentEmail: me?.agentEmail ?? '',
        })
      } catch { router.push('/auth?next=/property/new') }
    })()
  }, [router])

  // Tabs — each part of the advert is a tab you can move between freely. The
  // Agent tab is only present for property-agent accounts.
  const STEPS: { key: string; title: string; icon: IconName }[] = [
    { key: 'property', title: 'Property', icon: 'home' },
    { key: 'details', title: 'Details', icon: 'file' },
    { key: 'features', title: 'Features', icon: 'sparkle' },
    { key: 'photos', title: 'Photos', icon: 'star' },
    ...(isAgent ? [{ key: 'agent', title: 'Agent', icon: 'user' as IconName }] : []),
    { key: 'upgrades', title: 'Upgrades', icon: 'zap' },
  ]
  const STEP_TITLES = STEPS.map(s => s.title)
  const STEP_ICONS: IconName[] = STEPS.map(s => s.icon)
  const [step, setStep] = useState(0)
  const cur = STEPS[Math.min(step, STEPS.length - 1)]?.key ?? 'property'
  const goTab = (i: number) => { setError(''); setStep(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function onFormSubmit(e: React.FormEvent) { e.preventDefault(); doSubmit() }

  async function doSubmit() {
    setError('')
    if (!f.title.trim() || !f.location.trim() || !f.price) {
      setError('Title, address and price are required.'); goTab(0); return
    }
    setSaving(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/property/new'); return }

      // Save the agent's contact profile (agents only) so it shows on this and
      // future property listings. Best-effort — never block the listing on it,
      // and never flip a personal account into an agent from here.
      if (isAgent) {
        try {
          await trpcAuthed().users.updateAgentProfile.mutate({
            agencyName: agent.agencyName.trim() || null,
            agentWhatsapp: agent.agentWhatsapp.trim() || null,
            agentEmail: agent.agentEmail.trim() || null,
          })
        } catch { /* non-fatal */ }
      }

      const bedNum = f.bedrooms === 'Studio' ? 0 : (f.bedrooms ? parseInt(f.bedrooms, 10) : undefined)
      const bathNum = f.bathrooms ? parseInt(f.bathrooms, 10) : undefined
      const listing: any = await trpcAuthed().property.create.mutate({
        title: f.title.trim(),
        price: Number(f.price),
        location: f.location.trim(),
        type: f.type as never,
        ...(f.propertyType && { propertyType: f.propertyType }),
        ...(f.description.trim() && { description: f.description.trim() }),
        ...(bedNum != null && !Number.isNaN(bedNum) && { bedrooms: bedNum }),
        ...(bathNum != null && !Number.isNaN(bathNum) && { bathrooms: bathNum }),
        ...(f.m2 && { m2: Number(f.m2) }),
        ...(f.floor && { floor: Number(f.floor) }),
        ...(f.energyRating && { energyRating: f.energyRating }),
        ...(photos.length ? { images: photos } : {}),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        ...(f.rentalTerm && { rentalTerm: f.rentalTerm as never }),
        ...(f.touristLicence.trim() && { touristLicence: f.touristLicence.trim() }),
        ...(f.furnished && { furnished: f.furnished as never }),
        ...(f.orientation.trim() && { orientation: f.orientation.trim() }),
        ...(f.yearBuilt && { yearBuilt: Number(f.yearBuilt) }),
        ...(f.communityFees && { communityFees: Number(f.communityFees) }),
        ...(f.views.trim() && { views: f.views.trim() }),
        ...(f.reference.trim() && { reference: f.reference.trim() }),
        ...(f.address.trim() && { address: f.address.trim() }),
        ...(f.location.trim() && { city: f.location.trim() }),
        ...(f.distShops && { distShops: Number(f.distShops) }),
        ...(f.distSchools && { distSchools: Number(f.distSchools) }),
        ...(f.distBeach && { distBeach: Number(f.distBeach) }),
        ...(features.length ? { features } : {}),
        ...(sponsored ? { sponsored: true } : {}),
        ...(featuredWeeks > 0 ? { featuredWeeks } : {}),
        ...(appliedPromo ? { discountCode: appliedPromo.code } : {}),
      })
      try { localStorage.removeItem(PROP_DRAFT_KEY) } catch {}
      // Beyond the free allowance a property is €39 — pay, then the webhook
      // publishes it. Within allowance it's already live.
      if (listing?.pendingPayment && listing?.checkoutUrl) { window.location.href = listing.checkoutUrl; return }
      router.push(`/listings/${listing.id}`)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (/UNAUTHORIZED|jwt|token/i.test(msg)) router.push('/auth?next=/property/new')
      else if (/Business account/i.test(msg)) setGate('needbusiness')
      // Surface the real reason (validation / payment) so it can be fixed, rather
      // than a generic message.
      else setError(msg ? msg.replace(/^[A-Z_]+:\s*/, '') : 'Could not list the property. Please check the fields and try again.')
    } finally { setSaving(false) }
  }

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: '#E4E7EE', minHeight: '100dvh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      <Topbar title="List a Property" />
      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/property" style={{ textDecoration: 'none', fontSize: 22, color: 'var(--orange)', fontWeight: 700 }}>‹</Link>
      </header>

      {gate === 'checking' && <div style={{ textAlign: 'center', padding: 60, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Checking your account…</div>}
      {gate === 'needbusiness' && <BusinessGate />}
      {gate === 'needplan' && <PlanGate />}

      {gate === 'ok' && draftFound && (
        <div style={{ maxWidth: 640, margin: '10px auto 0', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#fff6e6', border: '1px solid #f0e0bd', borderRadius: 12, padding: '11px 14px' }}>
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-ui)', fontSize: 13, color: '#8a6d3b', fontWeight: 700 }}>📝 You have an unfinished property advert{draftFound.f?.title ? ` — “${draftFound.f.title}”` : ''}.</span>
            <button type="button" onClick={restoreDraft} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>Resume</button>
            <button type="button" onClick={discardDraft} style={{ background: '#fff', color: '#8a6d3b', border: '1px solid #e0d8d0', borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Discard</button>
          </div>
        </div>
      )}

      {gate === 'ok' && (
      <form onSubmit={onFormSubmit} className="gform">
        <StepTabs steps={STEP_TITLES} icons={STEP_ICONS} current={step} onSelect={goTab} />
        {allowance && (
          <div style={{ background: '#f0fdf4', border: '1px solid #c8e6c9', borderRadius: 12, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#2e7d32', fontWeight: 700 }}>
            {allowance.isBusiness
              ? `🏠 ${allowance.remaining} of ${allowance.allowance} listings remaining on your plan · new listings go live once approved by our team.`
              : `🏠 ${allowance.remaining} of ${allowance.allowance} free property listing${allowance.allowance === 1 ? '' : 's'} left this month · extra listings are €29. New listings go live once approved.`}
          </div>
        )}

        {cur === 'property' && <Section title="The property">
          <Field label="Listing title" required><Input value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 2-bed apartment with sea view" /></Field>
          <Row>
            <Field label="For sale / to let" required>
              <Select value={f.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(([label, v]) => <option key={v} value={v}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Property type" required>
              <Select value={f.propertyType} onChange={e => set('propertyType', e.target.value)}>
                <option value="">Choose a type…</option>
                {PROPERTY_TYPES.map(([label, v]) => <option key={v} value={v}>{label}</option>)}
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label={f.type === 'rent' || f.type === 'holiday' ? 'Price (€/month)' : 'Price (€)'} required>
              <Input value={f.price} onChange={e => set('price', e.target.value)} inputMode="numeric" placeholder="e.g. 250000" />
            </Field>
            <Field label="Property reference"><Input value={f.reference} onChange={e => set('reference', e.target.value)} placeholder="e.g. REF001, HP-2024-001" /></Field>
          </Row>
          <Field label="Address search" required help={f.location ? `📍 Town: ${f.location}${coords ? ' · map pin set' : ''} · your exact address is never shown publicly` : 'Start typing to find the address — the town & map pin fill in automatically. Your exact address is never shown publicly.'}>
            <AddressAutocomplete
              value={f.address || f.location}
              onChange={v => setF(prev => ({ ...prev, address: v }))}
              onSelect={pick => { setF(prev => ({ ...prev, address: pick.address, location: pick.city || prev.location })); if (pick.lat && pick.lng) setCoords({ lat: pick.lat, lng: pick.lng }) }}
              placeholder="Start typing the address — town & map pin fill automatically"
            />
          </Field>
          <Field label="Location on the map" help="Drag the pin to fine-tune. Only the town/area is shown publicly — never the exact pin or address.">
            <MapPicker value={coords} onChange={setCoords} />
          </Field>
        </Section>}

        {cur === 'details' && <>
        <Section title="Details">
          <Row>
            <Field label="Bedrooms">
              <Select value={f.bedrooms} onChange={e => set('bedrooms', e.target.value)}>
                <option value="">—</option>{BED_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Bathrooms">
              <Select value={f.bathrooms} onChange={e => set('bathrooms', e.target.value)}>
                <option value="">—</option>{BATH_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Total area (m²)"><Input value={f.m2} onChange={e => set('m2', e.target.value)} inputMode="numeric" placeholder="85" /></Field>
          </Row>
          <Row>
            <Field label="Floor"><Input value={f.floor} onChange={e => set('floor', e.target.value)} inputMode="numeric" placeholder="e.g. 3" /></Field>
            <Field label="Energy rating">
              <Select value={f.energyRating} onChange={e => set('energyRating', e.target.value)}>
                <option value="">—</option>{ENERGY.map(x => <option key={x} value={x}>{x}</option>)}
              </Select>
            </Field>
            <Field label="Year built">
              <Select value={f.yearBuilt} onChange={e => set('yearBuilt', e.target.value)}>
                <option value="">—</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Furnished">
              <Select value={f.furnished} onChange={e => set('furnished', e.target.value)}>
                <option value="">—</option>
                <option value="furnished">Furnished</option>
                <option value="part_furnished">Part-furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </Select>
            </Field>
            <Field label="Community fees (€/mo)"><Input value={f.communityFees} onChange={e => set('communityFees', e.target.value)} inputMode="numeric" placeholder="e.g. 60" /></Field>
            <Field label="Orientation">
              <Select value={f.orientation} onChange={e => set('orientation', e.target.value)}>
                <option value="">—</option>{ORIENTATIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
          </Row>
          <Field label="Views"><Input value={f.views} onChange={e => set('views', e.target.value)} placeholder="e.g. Sea, Mountain" /></Field>
          <Field label="Description"><Textarea value={f.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Describe the property, its condition, features and what's nearby…" /></Field>
        </Section>

        {(f.type === 'rent' || f.type === 'holiday') && (
          <Section title="Rental terms">
            <Row>
              <Field label="Duration">
                <Select value={f.rentalTerm} onChange={e => set('rentalTerm', e.target.value)}>
                  <option value="">—</option>
                  <option value="short_term">Short-term</option>
                  <option value="long_term">Long-term</option>
                  <option value="holiday">Holiday rental</option>
                </Select>
              </Field>
              {(f.type === 'holiday' || f.rentalTerm === 'holiday') && (
                <Field label="Tourist licence no." required help="Holiday rentals in the Canary Islands require a Vivienda Vacacional (VV) licence — its number must be shown on the advert."><Input value={f.touristLicence} onChange={e => set('touristLicence', e.target.value)} placeholder="e.g. VV-35-xxxxx" /></Field>
              )}
            </Row>
          </Section>
        )}

        <Section title="Distances" sub="Metres to the nearest — auto-filled from the map location, and editable.">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button type="button" onClick={() => runAutoDistances()} disabled={autoDist === 'loading' || !coords}
              style={{ background: '#fff', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 999, padding: '7px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: coords ? 'pointer' : 'default', opacity: coords ? 1 : 0.5 }}>
              {autoDist === 'loading' ? 'Finding…' : '📍 Auto-fill from map'}
            </button>
          </div>
          <Row>
            <Field label="Local shops (m)"><Input value={f.distShops} onChange={e => set('distShops', e.target.value)} inputMode="numeric" placeholder="0" /></Field>
            <Field label="Local schools (m)"><Input value={f.distSchools} onChange={e => set('distSchools', e.target.value)} inputMode="numeric" placeholder="0" /></Field>
            <Field label="Nearest beach (m)"><Input value={f.distBeach} onChange={e => set('distBeach', e.target.value)} inputMode="numeric" placeholder="0" /></Field>
          </Row>
        </Section>
        </>}

        {cur === 'features' && <Section title="Features & amenities">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
            {PROPERTY_FEATURES.map(feat => (
              <label key={feat.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={features.includes(feat.slug)} onChange={() => toggleFeature(feat.slug)} style={{ accentColor: 'var(--orange)' }} /> {feat.icon} {feat.label}
              </label>
            ))}
          </div>
        </Section>}

        {cur === 'agent' && <Section title="Agent contact" sub="Shown on your listings. Buyers reach you directly on these — saved to your agent profile and applied to every property you list.">
          <Field label="Agency name"><Input value={agent.agencyName} onChange={e => setAg('agencyName', e.target.value)} placeholder="e.g. Canary Coast Properties" /></Field>
          <Row>
            <Field label="WhatsApp number"><Input value={agent.agentWhatsapp} onChange={e => setAg('agentWhatsapp', e.target.value)} inputMode="tel" placeholder="e.g. +34 600 123 456" /></Field>
            <Field label="Contact email"><Input value={agent.agentEmail} onChange={e => setAg('agentEmail', e.target.value)} inputMode="email" placeholder="you@agency.com" /></Field>
          </Row>
        </Section>}

        {cur === 'photos' && <Section title="Photos" sub="Add up to 8 photos. They're saved to your draft automatically as you add them.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {photos.map(url => (
              <div key={url} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5dccd', background: 'var(--sand)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={() => removePhoto(url)} aria-label="Remove photo" style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 13, fontWeight: 900, lineHeight: 1 }}>×</button>
              </div>
            ))}
            {photos.length < 8 && (
              <label style={{ aspectRatio: '1 / 1', borderRadius: 12, border: '1.5px dashed #d8c9b4', background: '#fffdf9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: uploadingPhoto ? 'default' : 'pointer', color: '#8a7a63', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, textAlign: 'center', padding: 8 }}>
                {uploadingPhoto ? 'Uploading…' : <>⬆️<br />Add photo</>}
                <input type="file" accept="image/*" multiple onChange={e => { addPhotos(e.target.files); e.target.value = '' }} style={{ display: 'none' }} disabled={uploadingPhoto} />
              </label>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#999', marginTop: 8 }}>Your progress is saved to drafts automatically — you can close this and finish later.</div>
        </Section>}

        {cur === 'upgrades' && <Section title="Listing upgrades" sub="Optional — boost your advert's visibility.">
          <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: sponsored ? '#FFF8F4' : '#fff', border: `1.5px solid ${sponsored ? 'var(--orange)' : '#e5dccd'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sponsored} onChange={e => setSponsored(e.target.checked)} style={{ accentColor: 'var(--orange)', marginTop: 3, width: 18, height: 18 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>⚡ Sponsored listing</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>+€{(PROPERTY_PRICING.sponsoredCents / 100).toFixed(2)}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666', lineHeight: 1.55, marginTop: 4 }}>
                Puts your property at the <strong>top of the search results for its area</strong> for <strong>{PROPERTY_PRICING.sponsoredDays} days</strong>. Charged once with your listing — the boost starts when the advert goes live.
              </div>
            </div>
          </label>

          {/* Featured boost — same rule as items: €1.99/week in the homepage
              Featured strip. Charged with the listing, before it goes live. */}
          <div style={{ background: featuredWeeks > 0 ? '#FFF8F4' : '#fff', border: `1.5px solid ${featuredWeeks > 0 ? 'var(--orange)' : '#e5dccd'}`, borderRadius: 14, padding: '14px 16px', marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>⭐ Feature this advert</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: 'var(--orange)' }}>€{PRICES.featuredPerWeek.toFixed(2)} / week</div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666', lineHeight: 1.55, margin: '4px 0 10px' }}>
              Show your property in the <strong>Featured carousel on the homepage</strong>. Choose how many weeks:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {[0, 1, 2, 3, 4].map(w => (
                <button key={w} type="button" onClick={() => setFeaturedWeeks(w)} style={{ padding: '10px 4px', borderRadius: 12, border: `2px solid ${featuredWeeks === w ? 'var(--orange)' : '#e0d8d0'}`, background: featuredWeeks === w ? '#FFF8F4' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 800, color: featuredWeeks === w ? 'var(--orange)' : 'var(--dark)' }}>{w === 0 ? 'Off' : `${w}wk`}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 2 }}>{w === 0 ? '—' : `€${(PRICES.featuredPerWeek * w).toFixed(2)}`}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Discount code — applied here so it's taken off before checkout. */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, color: 'var(--dark)', marginBottom: 6 }}>Have a discount code?</div>
            <PromoField kind="property" amountCents={PROPERTY_PRICING.privateExtraListingCents + (sponsored ? PROPERTY_PRICING.sponsoredCents : 0) + featuredWeeks * FEATURED_PER_WEEK_CENTS} onApplied={setAppliedPromo} />
          </div>
        </Section>}

        <FormError>{error}</FormError>
        {step >= STEPS.length - 1 ? (
          <SubmitButton type="submit" disabled={saving}>{saving ? 'Listing…' : 'List Property'}</SubmitButton>
        ) : (
          <button type="button" onClick={() => goTab(step + 1)}
            style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
            Next
          </button>
        )}
      </form>
      )}
      <Footer />
      <PanelHost />
    </main>
    </PanelProvider>
  )
}

// Property may only be listed from a Business (agent) account.
function BusinessGate() {
  const { openPanel } = usePanel()
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🏢</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 8 }}>Business account required</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 18 }}>
          Property can only be listed from a Grabitt Business account. Sign up as a business to list properties, manage enquiries and reach buyers across the island.
        </div>
        <button onClick={() => openPanel('business')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Sign up as a business</button>
        <Link href="/property" style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#888', textDecoration: 'none' }}>Back to property</Link>
      </div>
    </div>
  )
}

// Agent plan chooser — a monthly subscription with an active-listing allowance
// is required before an agent can list property.
const AGENT_PLANS: { id: string; name: string; listings: number; price: string; blurb: string }[] = [
  { id: 'agent_15', name: 'Agent', listings: 15, price: '€49/mo', blurb: 'List up to 15 active properties.' },
  { id: 'agent_40', name: 'Office', listings: 40, price: '€99/mo', blurb: 'List up to 40 active properties.' },
]
function PlanGate() {
  const [busy, setBusy] = useState('')
  const choose = async (plan: string) => {
    setBusy(plan)
    try {
      const res: any = await trpcAuthed().subscriptions.createCheckout.mutate({ plan } as never)
      if (res?.url) window.location.href = res.url
    } catch { toast('Could not start checkout. Please try again.'); setBusy('') }
  }
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🏠</div>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>Choose an agent plan</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#666', lineHeight: 1.6, marginTop: 4 }}>Listing property needs a monthly agent plan with an active-listing allowance. Every listing is reviewed by our team before it goes live.</div>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {AGENT_PLANS.map(p => (
          <div key={p.id} style={{ background: '#fff', border: '1.5px solid #ece3d7', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{p.name} · {p.listings} listings</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--orange)' }}>{p.price}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666', margin: '4px 0 12px' }}>{p.blurb}</div>
            <button onClick={() => choose(p.id)} disabled={!!busy} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy === p.id ? 'Starting…' : `Choose ${p.name}`}
            </button>
          </div>
        ))}
      </div>
      <Link href="/property" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#888', textDecoration: 'none' }}>Back to property</Link>
    </div>
  )
}

