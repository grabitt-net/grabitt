'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface Category { id: string; name: string; slug: string; icon: string }

interface Props {
  categories: Category[]
  userId: string
}

const listingTypes = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'service', label: 'Service' },
  { value: 'wanted', label: 'Wanted' },
  { value: 'free', label: 'Free' },
]

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

export default function CreateListingForm({ categories, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [listingType, setListingType] = useState('sale')
  const [condition, setCondition] = useState('good')
  const [categoryId, setCategoryId] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showPrice = listingType !== 'free' && listingType !== 'wanted'
  const showCondition = listingType === 'sale' || listingType === 'free'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.from('listings').insert({
      seller_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      price: showPrice && price ? parseFloat(price) : null,
      listing_type: listingType,
      condition: showCondition ? condition : null,
      category_id: categoryId || null,
      location: location.trim() || null,
      status: 'active',
    }).select('id').single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/listings/${data.id}`)
  }

  return (
    <main style={{ background: 'var(--sand)', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Header */}
      <header style={{
        background: 'var(--sand)', padding: '12px 16px',
        borderBottom: '1.5px solid var(--sand2)',
        display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/listings" style={{ fontSize: 22, textDecoration: 'none', color: 'var(--dark)' }}>←</Link>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 18, fontWeight: 700, color: 'var(--dark)' }}>
          Post a Listing
        </span>
      </header>

      <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Listing type */}
        <div style={cardStyle}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {listingTypes.map(t => (
              <button key={t.value} type="button" onClick={() => setListingType(t.value)} style={{
                padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800,
                background: listingType === t.value ? 'var(--orange)' : '#f0f0f0',
                color: listingType === t.value ? '#fff' : '#666',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={cardStyle}>
          <label style={labelStyle}>Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What are you selling?"
            required
            maxLength={100}
            style={inputStyle}
          />
          <span style={{ fontSize: 10, color: '#bbb', marginTop: 4, fontFamily: 'var(--font-nunito)' }}>
            {title.length}/100
          </span>
        </div>

        {/* Description */}
        <div style={cardStyle}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the item — condition, size, any defects, why you're selling…"
            rows={4}
            maxLength={2000}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {/* Category */}
        <div style={cardStyle}>
          <label style={labelStyle}>Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle}>
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        {/* Price */}
        {showPrice && (
          <div style={cardStyle}>
            <label style={labelStyle}>Price (€)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={inputStyle}
            />
          </div>
        )}

        {/* Condition */}
        {showCondition && (
          <div style={cardStyle}>
            <label style={labelStyle}>Condition</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {conditions.map(c => (
                <button key={c.value} type="button" onClick={() => setCondition(c.value)} style={{
                  padding: '7px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800,
                  background: condition === c.value ? 'var(--orange)' : '#f0f0f0',
                  color: condition === c.value ? '#fff' : '#666',
                }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        <div style={cardStyle}>
          <label style={labelStyle}>Location</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Las Palmas, Maspalomas, Telde…"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 12,
            padding: '12px 14px', fontSize: 13, color: '#c62828',
            fontFamily: 'var(--font-nunito)',
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !title.trim()} style={{
          background: 'var(--orange)', color: '#fff', border: 'none',
          borderRadius: 14, padding: '15px 20px', width: '100%',
          fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900,
          cursor: 'pointer', opacity: loading || !title.trim() ? 0.6 : 1,
          boxShadow: '0 4px 14px rgba(255,69,0,0.3)',
        }}>
          {loading ? 'Posting…' : 'Post Listing'}
        </button>
      </form>
    </main>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '16px 14px',
  display: 'flex', flexDirection: 'column', gap: 8,
  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-nunito)', fontSize: 10, fontWeight: 800,
  color: '#888', textTransform: 'uppercase', letterSpacing: 0.5,
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px',
  fontFamily: 'var(--font-comfortaa)', fontSize: 13, color: 'var(--dark)',
  outline: 'none', width: '100%', background: '#fafafa',
}
