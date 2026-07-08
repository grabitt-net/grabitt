'use client'

// Auto-submitting sort dropdown for the /listings browse page. Must be a client
// component — a server component can't pass an onChange handler to <select>.
export default function SortSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select
      name="sort"
      defaultValue={defaultValue ?? ''}
      onChange={e => e.currentTarget.form?.submit()}
      style={{
        border: '1.5px solid #eee', borderRadius: 50, padding: '5px 12px',
        fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 700,
        background: '#fff', cursor: 'pointer', outline: 'none',
      }}
    >
      <option value="">Newest</option>
      <option value="price_asc">Price: Low → High</option>
      <option value="price_desc">Price: High → Low</option>
    </select>
  )
}
