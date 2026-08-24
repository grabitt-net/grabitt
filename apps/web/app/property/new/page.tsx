'use client'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import PanelHost from '@/components/marketplace/PanelHostLazy'
import AddressAutocomplete from '@/components/marketplace/AddressAutocomplete'
import { PROPERTY_FEATURES } from '@/lib/propertyFeatures'

const MapPicker = dynamic(() => import('@/components/marketplace/MapPicker'), { ssr: false })

// Property listing form — mirrors /jobs/new. Creates the Listing *and* its
// PropertyListing detail row, which is what the /property search reads.
const TYPES: [string, string][] = [
  ['For Sale', 'sale'], ['To Let', 'rent'], ['Holiday Let', 'holiday'],
  ['Commercial', 'commercial'], ['Land', 'land'], ['New Build', 'new_build'],
]
const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default function NewPropertyPage() {
  const router = useRouter()
  const [f, setF] = useState({
    title: '', type: 'sale', price: '', location: '', community: '',
    bedrooms: '', bathrooms: '', m2: '', floor: '', energyRating: '',
    hasPool: false, hasGarage: false, description: '',
    // Rental terms + extended portal details.
    rentalTerm: '', touristLicence: '',
    plotM2: '', terraceM2: '', furnished: '', orientation: '',
    yearBuilt: '', communityFees: '', condition: '', views: '',
    // Full agent-listing detail.
    reference: '', address: '', coveredM2: '', landM2: '',
    distShops: '', distSchools: '', distBeach: '', distTown: '',
  })
  const [features, setFeatures] = useState<string[]>([])
  const toggleFeature = (slug: string) => setFeatures(p => p.includes(slug) ? p.filter(x => x !== slug) : [...p, slug])
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Agents need a Business account AND a property-agent plan with remaining
  // allowance before they can list.
  const [gate, setGate] = useState<'checking' | 'ok' | 'needbusiness' | 'needplan'>('checking')
  const [allowance, setAllowance] = useState<{ allowance: number; inUse: number; remaining: number } | null>(null)
  // Agent contact profile — saved to the user and shown on every property they
  // list, so buyers can reach them by WhatsApp / email directly.
  const [agent, setAgent] = useState({ agencyName: '', agentWhatsapp: '', agentEmail: '' })

  // Auto-save draft — never lose a half-written property advert. Saved to the
  // browser; offered back on return; cleared once the property is posted.
  const PROP_DRAFT_KEY = 'grabitt_property_draft'
  const [draftFound, setDraftFound] = useState<any | null>(null)
  const draftBody = JSON.stringify({ f, features })
  useEffect(() => {
    if (f.title.trim() || f.address.trim() || f.description.trim()) {
      try { localStorage.setItem(PROP_DRAFT_KEY, draftBody) } catch {}
    }
  }, [draftBody, f.title, f.address, f.description])
  useEffect(() => {
    try { const raw = localStorage.getItem(PROP_DRAFT_KEY); if (raw) { const d = JSON.parse(raw); if (d?.f && (d.f.title || d.f.address)) setDraftFound(d) } } catch {}
  }, [])
  const restoreDraft = () => {
    const d = draftFound; if (!d) return
    if (d.f) setF(d.f)
    if (Array.isArray(d.features)) setFeatures(d.features)
    setDraftFound(null)
  }
  const discardDraft = () => { try { localStorage.removeItem(PROP_DRAFT_KEY) } catch {}; setDraftFound(null) }

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }))
  const setAg = (k: string, v: string) => setAgent(prev => ({ ...prev, [k]: v }))

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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!f.title.trim() || !f.location.trim() || !f.price) {
      setError('Title, location and price are required.'); return
    }
    setSaving(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/property/new'); return }

      // Save the agent's contact profile so it shows on this (and future)
      // property listings. Best-effort — never block the listing on it.
      try {
        await trpcAuthed().users.updateAgentProfile.mutate({
          isPropertyAgent: true,
          agencyName: agent.agencyName.trim() || null,
          agentWhatsapp: agent.agentWhatsapp.trim() || null,
          agentEmail: agent.agentEmail.trim() || null,
        })
      } catch { /* non-fatal */ }

      const listing: any = await trpcAuthed().property.create.mutate({
        title: f.title.trim(),
        price: Number(f.price),
        location: f.location.trim(),
        type: f.type as never,
        ...(f.description.trim() && { description: f.description.trim() }),
        ...(f.community.trim() && { community: f.community.trim() }),
        ...(f.bedrooms && { bedrooms: Number(f.bedrooms) }),
        ...(f.bathrooms && { bathrooms: Number(f.bathrooms) }),
        ...(f.m2 && { m2: Number(f.m2) }),
        ...(f.floor && { floor: Number(f.floor) }),
        ...(f.energyRating && { energyRating: f.energyRating }),
        hasPool: f.hasPool,
        hasGarage: f.hasGarage,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        ...(f.rentalTerm && { rentalTerm: f.rentalTerm as never }),
        ...(f.touristLicence.trim() && { touristLicence: f.touristLicence.trim() }),
        ...(f.plotM2 && { plotM2: Number(f.plotM2) }),
        ...(f.terraceM2 && { terraceM2: Number(f.terraceM2) }),
        ...(f.furnished && { furnished: f.furnished as never }),
        ...(f.orientation.trim() && { orientation: f.orientation.trim() }),
        ...(f.yearBuilt && { yearBuilt: Number(f.yearBuilt) }),
        ...(f.communityFees && { communityFees: Number(f.communityFees) }),
        ...(f.condition && { condition: f.condition as never }),
        ...(f.views.trim() && { views: f.views.trim() }),
        ...(f.reference.trim() && { reference: f.reference.trim() }),
        ...(f.address.trim() && { address: f.address.trim() }),
        ...(f.location.trim() && { city: f.location.trim() }),
        ...(f.coveredM2 && { coveredM2: Number(f.coveredM2) }),
        ...(f.landM2 && { landM2: Number(f.landM2) }),
        ...(f.distShops && { distShops: Number(f.distShops) }),
        ...(f.distSchools && { distSchools: Number(f.distSchools) }),
        ...(f.distBeach && { distBeach: Number(f.distBeach) }),
        ...(f.distTown && { distTown: Number(f.distTown) }),
        ...(features.length ? { features } : {}),
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
      else setError('Could not list the property. Please check the fields and try again.')
    } finally { setSaving(false) }
  }

  return (
    <PanelProvider>
    <main className="app-shell" style={{ background: '#f7f4ee', minHeight: '100dvh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
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
      <form onSubmit={submit} style={{ maxWidth: 640, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {allowance && (
          <div style={{ background: '#f0fdf4', border: '1px solid #c8e6c9', borderRadius: 12, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#2e7d32', fontWeight: 700 }}>
            🏠 {allowance.remaining} of {allowance.allowance} listings remaining on your plan · new listings go live once approved by our team.
          </div>
        )}
        <Section title="The property">
          <Field label="Listing title *"><input value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 2-bed apartment with sea view" style={inp} /></Field>
          <Row>
            <Field label="Listing type *">
              <select value={f.type} onChange={e => set('type', e.target.value)} style={sel}>
                {TYPES.map(([label, v]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </Field>
            <Field label={f.type === 'rent' || f.type === 'holiday' ? 'Price (€/month) *' : 'Price (€) *'}>
              <input value={f.price} onChange={e => set('price', e.target.value)} inputMode="numeric" placeholder="e.g. 250000" style={inp} />
            </Field>
          </Row>
          <Row>
            <Field label="Property reference"><input value={f.reference} onChange={e => set('reference', e.target.value)} placeholder="e.g. REF001, HP-2024-001" style={inp} /></Field>
            <Field label="Community / urbanisation"><input value={f.community} onChange={e => set('community', e.target.value)} placeholder="e.g. Playa Honda" style={inp} /></Field>
          </Row>
          <Field label="Address *">
            <AddressAutocomplete
              value={f.address || f.location}
              onChange={v => setF(prev => ({ ...prev, address: v }))}
              onSelect={pick => { setF(prev => ({ ...prev, address: pick.address, location: pick.city || prev.location })); if (pick.lat && pick.lng) setCoords({ lat: pick.lat, lng: pick.lng }) }}
              placeholder="Start typing the address — town & map pin fill automatically"
            />
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-ui)', marginTop: 4 }}>
              {f.location ? `📍 Town: ${f.location}${coords ? ' · map pin set' : ''}` : 'Pick an address to set the town and map pin.'}
            </div>
          </Field>
        </Section>

        <Section title="Details">
          <Row>
            <Field label="Bedrooms"><input value={f.bedrooms} onChange={e => set('bedrooms', e.target.value)} inputMode="numeric" placeholder="2" style={inp} /></Field>
            <Field label="Bathrooms"><input value={f.bathrooms} onChange={e => set('bathrooms', e.target.value)} inputMode="numeric" placeholder="1" style={inp} /></Field>
            <Field label="Total area (m²)"><input value={f.m2} onChange={e => set('m2', e.target.value)} inputMode="numeric" placeholder="85" style={inp} /></Field>
          </Row>
          <Row>
            <Field label="Covered area (m²)"><input value={f.coveredM2} onChange={e => set('coveredM2', e.target.value)} inputMode="numeric" placeholder="e.g. 90" style={inp} /></Field>
            <Field label="Land / plot area (m²)"><input value={f.landM2} onChange={e => set('landM2', e.target.value)} inputMode="numeric" placeholder="e.g. 350" style={inp} /></Field>
          </Row>
          <Row>
            <Field label="Floor"><input value={f.floor} onChange={e => set('floor', e.target.value)} inputMode="numeric" placeholder="e.g. 3" style={inp} /></Field>
            <Field label="Energy rating">
              <select value={f.energyRating} onChange={e => set('energyRating', e.target.value)} style={sel}>
                <option value="">—</option>{ENERGY.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', paddingBottom: 8 }}>
              <label style={chk}><input type="checkbox" checked={f.hasPool} onChange={e => set('hasPool', e.target.checked)} /> Pool</label>
              <label style={chk}><input type="checkbox" checked={f.hasGarage} onChange={e => set('hasGarage', e.target.checked)} /> Garage</label>
            </div>
          </Row>
          <Field label="Description"><textarea value={f.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Describe the property, condition, features and what's nearby…" style={{ ...inp, resize: 'vertical' }} /></Field>
        </Section>

        {/* Rental terms — only for lettings. Holiday lets must show a licence. */}
        {(f.type === 'rent' || f.type === 'holiday') && (
          <Section title="Rental terms">
            <Row>
              <Field label="Duration">
                <select value={f.rentalTerm} onChange={e => set('rentalTerm', e.target.value)} style={sel}>
                  <option value="">—</option>
                  <option value="short_term">Short-term</option>
                  <option value="long_term">Long-term</option>
                  <option value="holiday">Holiday rental</option>
                </select>
              </Field>
              {(f.type === 'holiday' || f.rentalTerm === 'holiday') && (
                <Field label="Tourist licence no. *"><input value={f.touristLicence} onChange={e => set('touristLicence', e.target.value)} placeholder="e.g. VV-35-xxxxx" style={inp} /></Field>
              )}
            </Row>
            {(f.type === 'holiday' || f.rentalTerm === 'holiday') && (
              <div style={{ fontSize: 11, color: '#9a6a30', fontFamily: 'var(--font-ui)' }}>Holiday rentals in the Canary Islands require a Vivienda Vacacional (VV) licence — its number must be shown on the advert.</div>
            )}
          </Section>
        )}

        {/* Extended portal details */}
        <Section title="More details">
          <Row>
            <Field label="Plot size (m²)"><input value={f.plotM2} onChange={e => set('plotM2', e.target.value)} inputMode="numeric" placeholder="e.g. 350" style={inp} /></Field>
            <Field label="Terrace (m²)"><input value={f.terraceM2} onChange={e => set('terraceM2', e.target.value)} inputMode="numeric" placeholder="e.g. 20" style={inp} /></Field>
            <Field label="Year built"><input value={f.yearBuilt} onChange={e => set('yearBuilt', e.target.value)} inputMode="numeric" placeholder="e.g. 2005" style={inp} /></Field>
          </Row>
          <Row>
            <Field label="Furnished">
              <select value={f.furnished} onChange={e => set('furnished', e.target.value)} style={sel}>
                <option value="">—</option>
                <option value="furnished">Furnished</option>
                <option value="part_furnished">Part-furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </Field>
            <Field label="Condition">
              <select value={f.condition} onChange={e => set('condition', e.target.value)} style={sel}>
                <option value="">—</option>
                <option value="new">New / recently built</option>
                <option value="good">Good</option>
                <option value="needs_reform">Needs reform</option>
              </select>
            </Field>
            <Field label="Community fees (€/mo)"><input value={f.communityFees} onChange={e => set('communityFees', e.target.value)} inputMode="numeric" placeholder="e.g. 60" style={inp} /></Field>
          </Row>
          <Row>
            <Field label="Orientation"><input value={f.orientation} onChange={e => set('orientation', e.target.value)} placeholder="e.g. South-West" style={inp} /></Field>
            <Field label="Views"><input value={f.views} onChange={e => set('views', e.target.value)} placeholder="e.g. Sea, Mountain" style={inp} /></Field>
          </Row>
        </Section>

        <Section title="Distances (to nearest, in metres)">
          <Row>
            <Field label="Local shops"><input value={f.distShops} onChange={e => set('distShops', e.target.value)} inputMode="numeric" placeholder="0" style={inp} /></Field>
            <Field label="Local schools"><input value={f.distSchools} onChange={e => set('distSchools', e.target.value)} inputMode="numeric" placeholder="0" style={inp} /></Field>
          </Row>
          <Row>
            <Field label="Nearest beach"><input value={f.distBeach} onChange={e => set('distBeach', e.target.value)} inputMode="numeric" placeholder="0" style={inp} /></Field>
            <Field label="Nearest town"><input value={f.distTown} onChange={e => set('distTown', e.target.value)} inputMode="numeric" placeholder="0" style={inp} /></Field>
          </Row>
        </Section>

        <Section title="Features & amenities">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
            {PROPERTY_FEATURES.map(feat => (
              <label key={feat.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: '#555', cursor: 'pointer', padding: '4px 0' }}>
                <input type="checkbox" checked={features.includes(feat.slug)} onChange={() => toggleFeature(feat.slug)} /> {feat.icon} {feat.label}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Agent contact (shown on your listings)">
          <div style={{ fontSize: 12, color: '#777', fontFamily: 'var(--font-ui)', marginTop: -4 }}>Buyers can reach you directly on these. Saved to your agent profile and applied to every property you list.</div>
          <Field label="Agency name"><input value={agent.agencyName} onChange={e => setAg('agencyName', e.target.value)} placeholder="e.g. Canary Coast Properties" style={inp} /></Field>
          <Row>
            <Field label="WhatsApp number"><input value={agent.agentWhatsapp} onChange={e => setAg('agentWhatsapp', e.target.value)} inputMode="tel" placeholder="e.g. +34 600 123 456" style={inp} /></Field>
            <Field label="Contact email"><input value={agent.agentEmail} onChange={e => setAg('agentEmail', e.target.value)} inputMode="email" placeholder="you@agency.com" style={inp} /></Field>
          </Row>
        </Section>

        <Section title="Location on the map">
          <div style={{ fontSize: 12, color: '#777', fontFamily: 'var(--font-ui)', marginTop: -4 }}>Drag the pin to the property&apos;s exact location (optional).</div>
          <MapPicker value={coords} onChange={setCoords} />
        </Section>

        {error && <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#c62828', fontFamily: 'var(--font-ui)' }}>{error}</div>}

        <button type="submit" disabled={saving} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 20px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Listing…' : 'List Property →'}
        </button>
      </form>
      )}
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
        <button onClick={() => openPanel('business')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Sign up as a business →</button>
        <Link href="/property" style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#888', textDecoration: 'none' }}>← Back to property</Link>
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
              {busy === p.id ? 'Starting…' : `Choose ${p.name} →`}
            </button>
          </div>
        ))}
      </div>
      <Link href="/property" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#888', textDecoration: 'none' }}>← Back to property</Link>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: 14 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '9px 11px', fontFamily: 'var(--font-ui)', fontSize: 13, boxSizing: 'border-box', background: '#fff', outline: 'none' }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer', fontWeight: 700 }
const chk: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: '#555', cursor: 'pointer' }
