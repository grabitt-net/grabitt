'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { createTrpcClient } from '@/lib/trpc'
import { compressAndUpload, listingPhotoPath } from '@/lib/storage'
import dynamic from 'next/dynamic'
import { COND_LABEL, DEPT_LABEL } from '@/lib/listingMap'
import type { JobQuestion, JobQuestionType } from '@/lib/jobQuestions'
import { QUESTION_TYPE_LABEL } from '@/lib/jobQuestions'

// Leaflet touches window, so it can only load client-side.
const MapPicker = dynamic(() => import('@/components/marketplace/MapPicker'), { ssr: false })
import Topbar from '@/components/marketplace/Topbar'
import Footer from '@/components/marketplace/Footer'
import PanelHost from '@/components/marketplace/PanelHost'
import { t } from '@/lib/i18n'

// Edit a listing you own. Sellers previously had no way to fix a typo, swap a
// photo or take an item down — only the price could be changed, and only from
// the listing page.
export default function EditListingPage() {
  return <PanelProvider><EditInner /></PanelProvider>
}

function EditInner() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')

  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'sold' | 'missing'>('loading')
  const [status, setStatus] = useState<string>('active')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState('good')
  const [location, setLocation] = useState('')
  const [stock, setStock] = useState('1')
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [deliveryMethod, setDeliveryMethod] = useState<'' | 'courier' | 'in_person'>('')
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  // Jobs and property hang extra detail off the listing, so the form has three
  // shapes. Shared fields (photos, title, description, location) are common.
  const [kind, setKind] = useState<'item' | 'job' | 'property'>('item')
  // Map pin — shared by all three kinds (lives on the parent listing).
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  // Item-only
  const [department, setDepartment] = useState('other')
  const [freeItem, setFreeItem] = useState(false)
  const [autoAcceptMin, setAutoAcceptMin] = useState('')
  // Job fields
  const [company, setCompany] = useState('')
  const [jobType, setJobType] = useState('full_time')
  const [sector, setSector] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [salaryPeriod, setSalaryPeriod] = useState('month')
  const [hours, setHours] = useState('')
  const [remote, setRemote] = useState(false)
  const [address, setAddress] = useState('')
  const [payments, setPayments] = useState('')
  const [overtime, setOvertime] = useState(false)
  const [tips, setTips] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [questions, setQuestions] = useState<JobQuestion[]>([])

  const addQ = () => setQuestions(qs => [...qs, { id: crypto.randomUUID().slice(0, 8), label: '', type: 'short', required: false }])
  const updateQ = (qid: string, patch: Partial<JobQuestion>) => setQuestions(qs => qs.map(q => q.id === qid ? { ...q, ...patch } : q))
  const removeQ = (qid: string) => setQuestions(qs => qs.filter(q => q.id !== qid))
  // Property fields
  const [propType, setPropType] = useState('sale')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [m2, setM2] = useState('')
  const [community, setCommunity] = useState('')
  const [floor, setFloor] = useState('')
  const [hasPool, setHasPool] = useState(false)
  const [hasGarage, setHasGarage] = useState(false)
  const [energyRating, setEnergyRating] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    let token = getAuthToken()
    if (!token) token = await refreshAuthToken()
    if (!token) { router.push(`/auth?next=/listings/${id}/edit`); return }
    try {
      const [me, l] = await Promise.all([
        (trpcAuthed() as any).users.me.query(),
        createTrpcClient().listings.byId.query({ id }) as any,
      ])
      if (!l) { setState('missing'); return }
      if (l.seller?.id !== me?.id) { setState('denied'); return }
      setStatus(l.status)
      setTitle(l.title ?? '')
      setDescription(l.description ?? '')
      setPrice(String(Number(l.price ?? 0)))
      setCondition(l.condition ?? 'good')
      setLocation(l.location ?? '')
      setStock(String(l.stock ?? 1))
      setDeliveryFee(String(Number(l.deliveryFee ?? 0)))
      setDeliveryMethod((l.deliveryMethod ?? '') as '' | 'courier' | 'in_person')
      setImages(Array.isArray(l.images) ? l.images : [])
      setCoords(l.lat != null && l.lng != null ? { lat: l.lat, lng: l.lng } : null)
      setDepartment(l.department ?? 'other')
      setFreeItem(Number(l.price ?? 0) === 0)
      setAutoAcceptMin(l.autoAcceptMin != null ? String(Number(l.autoAcceptMin)) : '')

      if (l.jobListing) {
        const j = l.jobListing
        setKind('job')
        setCompany(j.company ?? '')
        setJobType(j.type ?? 'full_time')
        setSector(j.sector ?? '')
        setSalaryMin(j.salaryMin != null ? String(Number(j.salaryMin)) : '')
        setSalaryMax(j.salaryMax != null ? String(Number(j.salaryMax)) : '')
        setSalaryPeriod(j.salaryPeriod ?? 'month')
        setHours(j.hours ?? '')
        setRemote(!!j.remote)
        setAddress(j.address ?? '')
        setPayments(j.payments != null ? String(j.payments) : '')
        setOvertime(!!j.overtime)
        setTips(!!j.tips)
        setStartDate(j.startDate ? String(j.startDate).slice(0, 10) : '')
        setQuestions(Array.isArray(j.applicationQuestions) ? (j.applicationQuestions as JobQuestion[]) : [])
      } else if (l.propertyListing) {
        const p = l.propertyListing
        setKind('property')
        setPropType(p.type ?? 'sale')
        setBedrooms(p.bedrooms != null ? String(p.bedrooms) : '')
        setBathrooms(p.bathrooms != null ? String(p.bathrooms) : '')
        setM2(p.m2 != null ? String(Number(p.m2)) : '')
        setCommunity(p.community ?? '')
        setFloor(p.floor != null ? String(p.floor) : '')
        setHasPool(!!p.hasPool)
        setHasGarage(!!p.hasGarage)
        setEnergyRating(p.energyRating ?? '')
      }

      setState(l.status === 'sold' ? 'sold' : 'ready')
    } catch { setState('missing') }
  }, [id, router])
  useEffect(() => { load() }, [load])

  const addPhotos = async (files: FileList) => {
    setUploading(true); setErr('')
    try {
      const room = 8 - images.length
      const picked = Array.from(files).slice(0, Math.max(0, room))
      const urls: string[] = []
      for (const f of picked) urls.push(await compressAndUpload(f, listingPhotoPath(id)))
      setImages(prev => [...prev, ...urls])
    } catch (e) { setErr(e instanceof Error ? e.message : t('Upload failed')) }
    finally { setUploading(false) }
  }

  const save = async () => {
    setErr(''); setSaved(false)
    if (title.trim().length < 4) { setErr(t('Give your listing a title of at least 4 characters.')); return }
    if (images.length === 0) { setErr(t('Keep at least one photo.')); return }
    setBusy(true)
    const num = (v: string) => (v.trim() === '' ? null : Number(v))
    try {
      const c: any = trpcAuthed()
      if (kind === 'job') {
        await c.jobs.update.mutate({
          listingId: id,
          jobTitle: title.trim(),
          company: company.trim(),
          type: jobType,
          location: location.trim(),
          address: address.trim() || null,
          sector: sector.trim() || null,
          description: description.trim(),
          salaryMin: num(salaryMin),
          salaryMax: num(salaryMax),
          salaryPeriod,
          hours: hours.trim() || null,
          remote,
          payments: num(payments),
          overtime,
          tips,
          startDate: startDate || null,
          images,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          // Send the questions as they now stand — dropping blanks — so removing
          // one on the form actually removes it.
          applicationQuestions: questions
            .filter(q => q.label.trim())
            .map(q => ({ id: q.id, label: q.label.trim(), type: q.type, required: q.required, ...(q.options ? { options: q.options.filter(Boolean) } : {}) })),
        })
      } else if (kind === 'property') {
        await c.property.update.mutate({
          listingId: id,
          title: title.trim(),
          description: description.trim(),
          price: Number(price) || 0,
          location: location.trim(),
          images,
          type: propType,
          bedrooms: num(bedrooms),
          bathrooms: num(bathrooms),
          m2: num(m2),
          community: community.trim() || null,
          floor: num(floor),
          hasPool,
          hasGarage,
          energyRating: energyRating.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        })
      } else {
        await c.listings.update.mutate({
          listingId: id,
          title: title.trim(),
          description: description.trim(),
          price: freeItem ? 0 : Number(price) || 0,
          department,
          condition,
          location: location.trim(),
          stock: Math.max(1, Number(stock) || 1),
          deliveryFee: deliveryMethod === '' ? 0 : Number(deliveryFee) || 0,
          deliveryMethod: deliveryMethod === '' ? null : deliveryMethod,
          // A free item can't sensibly auto-accept offers.
          autoAcceptMin: freeItem ? null : num(autoAcceptMin),
          images,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        })
      }
      setSaved(true)
      setTimeout(() => router.push(`/listings/${id}`), 700)
    } catch (e) { setErr(e instanceof Error ? e.message : t('Could not save your changes.')) }
    finally { setBusy(false) }
  }

  const changeStatus = async (next: 'active' | 'removed') => {
    setErr(''); setBusy(true)
    try {
      await (trpcAuthed() as any).listings.setStatus.mutate({ listingId: id, status: next })
      setStatus(next)
    } catch (e) { setErr(e instanceof Error ? e.message : t('Could not update the listing.')) }
    finally { setBusy(false) }
  }

  const shell = (body: React.ReactNode) => (
    <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 40 }}>
      <Topbar />
      {body}
      <Footer />
      <PanelHost />
    </main>
  )

  if (state === 'loading') return shell(<div style={msg}>{t('Loading…')}</div>)
  if (state === 'denied') return shell(<div style={msg}>{t('You can only edit your own listings.')}</div>)
  if (state === 'missing') return shell(<div style={msg}>{t('No results found')}</div>)
  if (state === 'sold') return shell(
    <div style={msg}>
      {t('A sold listing can no longer be edited.')}<br />
      <Link href={`/listings/${id}`} style={{ color: 'var(--orange)', fontWeight: 800 }}>{t('View')} ›</Link>
    </div>
  )

  return shell(
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 20, fontWeight: 700, color: 'var(--dark)' }}>✏️ {t('Edit listing')}</span>
        <Link href={`/listings/${id}`} style={{ marginLeft: 'auto', textDecoration: 'none', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: '#9a8b74' }}>‹ {t('Back')}</Link>
      </div>

      {status === 'removed' && (
        <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 12px', marginBottom: 12, fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#b91c1c' }}>
          {t('This listing is currently unlisted — nobody can see or buy it.')}
        </div>
      )}

      <Card title={t('Photos')}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {images.map((src, i) => (
            <div key={src + i} style={{ position: 'relative', width: 82, height: 82, borderRadius: 10, overflow: 'hidden', border: '1px solid #ece3d7' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} title={t('Remove')}
                style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
            </div>
          ))}
          {images.length < 8 && (
            <label style={{ width: 82, height: 82, borderRadius: 10, border: '1.5px dashed #d9cdb8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9a8b74', fontSize: 22, background: '#fff' }}>
              {uploading ? '…' : '+'}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={uploading}
                onChange={e => { if (e.target.files?.length) addPhotos(e.target.files) }} />
            </label>
          )}
        </div>
        <div style={hint}>{t('First photo is the cover. Up to 8.')}</div>
      </Card>

      <Card title={kind === 'job' ? t('Job details') : kind === 'property' ? t('Property details') : t('Item details')}>
        <label style={lbl}>{kind === 'job' ? t('Job title') : t('Title')}</label>
        <input value={title} onChange={e => setTitle(e.target.value)} style={field} />
        <label style={lbl}>{t('Description')}</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} style={{ ...field, resize: 'vertical' }} />
        {kind === 'item' && (
          <>
            <label style={lbl}>{t('Department')}</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} style={field}>
              {Object.entries(DEPT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label style={lbl}>{t('Condition')}</label>
            <select value={condition} onChange={e => setCondition(e.target.value)} style={field}>
              {Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </>
        )}
        <label style={lbl}>{t('Location')}</label>
        <input value={location} onChange={e => setLocation(e.target.value)} style={field} />
        <label style={lbl}>{t('Map pin')}</label>
        <MapPicker value={coords} onChange={setCoords} />
        <div style={hint}>
          {coords ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : t('Tap the map to drop a pin.')}
          {coords && <> · <button onClick={() => setCoords(null)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--orange)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>{t('Clear')}</button></>}
        </div>
      </Card>

      {kind === 'job' && (
        <Card title={t('Role & pay')}>
          <label style={lbl}>{t('Company')}</label>
          <input value={company} onChange={e => setCompany(e.target.value)} style={field} />
          <label style={lbl}>{t('Contract type')}</label>
          <select value={jobType} onChange={e => setJobType(e.target.value)} style={field}>
            <option value="full_time">{t('Full time')}</option>
            <option value="part_time">{t('Part time')}</option>
            <option value="contract">{t('Contract')}</option>
            <option value="temporary">{t('Temporary')}</option>
            <option value="volunteer">{t('Volunteer')}</option>
          </select>
          <label style={lbl}>{t('Sector')}</label>
          <input value={sector} onChange={e => setSector(e.target.value)} style={field} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Salary from (€)')}</label>
              <input type="number" min={0} value={salaryMin} onChange={e => setSalaryMin(e.target.value)} style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Salary to (€)')}</label>
              <input type="number" min={0} value={salaryMax} onChange={e => setSalaryMax(e.target.value)} style={field} />
            </div>
          </div>
          <label style={lbl}>{t('Salary period')}</label>
          <select value={salaryPeriod} onChange={e => setSalaryPeriod(e.target.value)} style={field}>
            <option value="month">{t('per month')}</option>
            <option value="year">{t('per year')}</option>
            <option value="hour">{t('per hour')}</option>
          </select>
          <label style={lbl}>{t('Hours')}</label>
          <input value={hours} onChange={e => setHours(e.target.value)} placeholder="Mon–Fri 9:00–17:00" style={field} />
          <label style={lbl}>{t('Address')}</label>
          <input value={address} onChange={e => setAddress(e.target.value)} style={field} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Payments per year')}</label>
              <input type="number" min={0} max={20} value={payments} onChange={e => setPayments(e.target.value)} placeholder="12" style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Start date')}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={field} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {([[remote, setRemote, t('Remote / work from home')], [overtime, setOvertime, t('Overtime available')], [tips, setTips, t('Tips')]] as [boolean, (v: boolean) => void, string][]).map(([val, set, label]) => (
              <label key={label} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#444' }}>
                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--orange)' }} />
                {label}
              </label>
            ))}
          </div>
        </Card>
      )}

      {kind === 'job' && (
        <Card title={t('Screening questions')}>
          <div style={{ ...hint, marginTop: 0 }}>{t('Optional. Ask candidates specific questions they answer when applying.')}</div>
          {questions.map(q => (
            <div key={q.id} style={{ border: '1px solid #e5dccd', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={q.label} onChange={e => updateQ(q.id, { label: e.target.value })} placeholder={t('Question, e.g. Do you have a driving licence?')} style={{ ...field, flex: 1, marginBottom: 0 }} />
                <button type="button" onClick={() => removeQ(q.id)} style={{ background: '#fff', border: '1px solid #e5dccd', borderRadius: 8, padding: '0 12px', color: '#c00', cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={q.type} onChange={e => updateQ(q.id, { type: e.target.value as JobQuestionType })} style={{ ...field, width: 'auto', marginBottom: 0 }}>
                  {(Object.keys(QUESTION_TYPE_LABEL) as JobQuestionType[]).map(k => <option key={k} value={k}>{QUESTION_TYPE_LABEL[k]}</option>)}
                </select>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 12.5, color: '#444' }}>
                  <input type="checkbox" checked={q.required} onChange={e => updateQ(q.id, { required: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--orange)' }} />
                  {t('Required')}
                </label>
              </div>
              {q.type === 'choice' && (
                <input value={(q.options ?? []).join(', ')} onChange={e => updateQ(q.id, { options: e.target.value.split(',').map(s => s.trim()) })} placeholder={t('Options, comma separated')} style={{ ...field, marginBottom: 0 }} />
              )}
            </div>
          ))}
          <button type="button" onClick={addQ} style={{ width: '100%', background: '#fff', border: '1.5px solid var(--orange)', color: 'var(--orange)', borderRadius: 10, padding: '10px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>+ {t('Add a question')}</button>
        </Card>
      )}

      {kind === 'property' && (
        <Card title={t('Property & price')}>
          <label style={lbl}>{t('Listing type')}</label>
          <select value={propType} onChange={e => setPropType(e.target.value)} style={field}>
            <option value="sale">{t('For sale')}</option>
            <option value="rent">{t('Long-term rent')}</option>
            <option value="holiday">{t('Holiday let')}</option>
            <option value="commercial">{t('Commercial')}</option>
            <option value="land">{t('Land')}</option>
            <option value="new_build">{t('New build')}</option>
          </select>
          <label style={lbl}>{t('Price (€)')}</label>
          <input type="number" min={0} step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={field} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Bedrooms')}</label>
              <input type="number" min={0} value={bedrooms} onChange={e => setBedrooms(e.target.value)} style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Bathrooms')}</label>
              <input type="number" min={0} value={bathrooms} onChange={e => setBathrooms(e.target.value)} style={field} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Size (m²)')}</label>
              <input type="number" min={0} value={m2} onChange={e => setM2(e.target.value)} style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{t('Floor')}</label>
              <input type="number" value={floor} onChange={e => setFloor(e.target.value)} style={field} />
            </div>
          </div>
          <label style={lbl}>{t('Community fees')}</label>
          <input value={community} onChange={e => setCommunity(e.target.value)} style={field} />
          <label style={lbl}>{t('Energy rating')}</label>
          <input value={energyRating} onChange={e => setEnergyRating(e.target.value)} maxLength={4} style={field} />
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#444' }}>
              <input type="checkbox" checked={hasPool} onChange={e => setHasPool(e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--orange)' }} />
              {t('Pool')}
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#444' }}>
              <input type="checkbox" checked={hasGarage} onChange={e => setHasGarage(e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--orange)' }} />
              {t('Garage')}
            </label>
          </div>
        </Card>
      )}

      {kind === 'item' && (
        <Card title={t('Price & options')}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#444', marginBottom: 10 }}>
            <input type="checkbox" checked={freeItem} onChange={e => setFreeItem(e.target.checked)} style={{ width: 17, height: 17, accentColor: 'var(--orange)' }} />
            {t('This item is free / give-away')}
          </label>
          {!freeItem && (
            <>
              <label style={lbl}>{t('Price (€)')}</label>
              <input type="number" min={0} step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={field} />
              <div style={hint}>{t('Lowering the price alerts everyone who saved this item.')}</div>
              <label style={lbl}>{t('Auto-accept offers at or above (€)')}</label>
              <input type="number" min={0} step="0.01" value={autoAcceptMin} onChange={e => setAutoAcceptMin(e.target.value)} placeholder={t('Leave blank to review every offer')} style={field} />
              <div style={hint}>{t('Offers at or above this amount are accepted automatically. Buyers never see your threshold.')}</div>
            </>
          )}
          <label style={lbl}>{t('Quantity available')}</label>
          <input type="number" min={1} max={999} value={stock} onChange={e => setStock(e.target.value)} style={field} />
          <label style={lbl}>{t('Delivery')}</label>
          <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value as '' | 'courier' | 'in_person')} style={field}>
            <option value="">{t('Collection only')}</option>
            <option value="courier">{t('Tracked courier')}</option>
            <option value="in_person">{t('I deliver in person')}</option>
          </select>
          {deliveryMethod !== '' && (
            <>
              <label style={lbl}>{t('Delivery fee (€)')}</label>
              <input type="number" min={0} step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} style={field} />
            </>
          )}
        </Card>
      )}

      {err && <div style={{ background: '#fff5f5', color: '#ef4444', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, marginBottom: 10 }}>⚠️ {err}</div>}
      {saved && <div style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, marginBottom: 10 }}>✓ {t('Saved ✓')}</div>}

      <button onClick={save} disabled={busy || uploading} style={{ width: '100%', background: busy || uploading ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? t('Saving…') : t('Save changes')}
      </button>

      <div style={{ marginTop: 10 }}>
        {status === 'removed' ? (
          <button onClick={() => changeStatus('active')} disabled={busy} style={secondary}>{t('Relist this item')}</button>
        ) : (
          <button onClick={() => changeStatus('removed')} disabled={busy} style={{ ...secondary, color: '#ef4444', borderColor: '#ef4444' }}>{t('Unlist this item')}</button>
        )}
        <div style={hint}>{t('Unlisting hides it from the marketplace. Your sales history is kept.')}</div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

const msg: React.CSSProperties = { textAlign: 'center', padding: 70, fontFamily: 'var(--font-nunito)', fontSize: 13, color: '#8a7d68', lineHeight: 1.8 }
const lbl: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 5 }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff', marginBottom: 12 }
const hint: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#9a8b74', marginTop: -4, marginBottom: 8, lineHeight: 1.5 }
const secondary: React.CSSProperties = { width: '100%', background: '#fff', color: '#555', border: '1.5px solid #e5dccd', borderRadius: 12, padding: '12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
