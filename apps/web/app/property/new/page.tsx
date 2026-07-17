'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import SiteHeader from '@/components/marketplace/SiteHeader'
import PanelHost from '@/components/marketplace/PanelHost'

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
  })
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Only business accounts (agents) may list property.
  const [gate, setGate] = useState<'checking' | 'ok' | 'needbusiness'>('checking')

  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push('/auth?next=/property/new'); return }
      try {
        const me: any = await trpcAuthed().users.me.query()
        setGate(me?.isBusiness ? 'ok' : 'needbusiness')
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
      })
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
    <main style={{ background: '#f7f4ee', minHeight: '100dvh', paddingBottom: 40 }}>
      <SiteHeader />
      <header style={{ background: 'var(--sand)', padding: '12px 14px', borderBottom: '1.5px solid var(--sand2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/property" style={{ textDecoration: 'none', fontSize: 22, color: 'var(--orange)', fontWeight: 700 }}>‹</Link>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>🏠 List a Property</span>
      </header>

      {gate === 'checking' && <div style={{ textAlign: 'center', padding: 60, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Checking your account…</div>}
      {gate === 'needbusiness' && <BusinessGate />}

      {gate === 'ok' && (
      <form onSubmit={submit} style={{ maxWidth: 640, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            <Field label="Town / area *"><input value={f.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Las Palmas" style={inp} /></Field>
            <Field label="Community / urbanisation"><input value={f.community} onChange={e => set('community', e.target.value)} placeholder="e.g. Playa Honda" style={inp} /></Field>
          </Row>
        </Section>

        <Section title="Details">
          <Row>
            <Field label="Bedrooms"><input value={f.bedrooms} onChange={e => set('bedrooms', e.target.value)} inputMode="numeric" placeholder="2" style={inp} /></Field>
            <Field label="Bathrooms"><input value={f.bathrooms} onChange={e => set('bathrooms', e.target.value)} inputMode="numeric" placeholder="1" style={inp} /></Field>
            <Field label="Size (m²)"><input value={f.m2} onChange={e => set('m2', e.target.value)} inputMode="numeric" placeholder="85" style={inp} /></Field>
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
