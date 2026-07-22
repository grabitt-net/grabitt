'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PanelProvider } from '@/context/PanelContext'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { createTrpcClient } from '@/lib/trpc'
import { compressAndUpload, listingPhotoPath } from '@/lib/storage'
import { COND_LABEL } from '@/lib/listingMap'
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
    try {
      await (trpcAuthed() as any).listings.update.mutate({
        listingId: id,
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        condition,
        location: location.trim(),
        stock: Math.max(1, Number(stock) || 1),
        deliveryFee: Number(deliveryFee) || 0,
        deliveryMethod: deliveryMethod === '' ? null : deliveryMethod,
        images,
      })
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

      <Card title={t('Item details')}>
        <label style={lbl}>{t('Title')}</label>
        <input value={title} onChange={e => setTitle(e.target.value)} style={field} />
        <label style={lbl}>{t('Description')}</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} style={{ ...field, resize: 'vertical' }} />
        <label style={lbl}>{t('Condition')}</label>
        <select value={condition} onChange={e => setCondition(e.target.value)} style={field}>
          {Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label style={lbl}>{t('Location')}</label>
        <input value={location} onChange={e => setLocation(e.target.value)} style={field} />
      </Card>

      <Card title={t('Price & options')}>
        <label style={lbl}>{t('Price (€)')}</label>
        <input type="number" min={0} step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={field} />
        <div style={hint}>{t('Lowering the price alerts everyone who saved this item.')}</div>
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
