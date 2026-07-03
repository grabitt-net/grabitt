'use client'
import { useCart } from '@/context/CartContext'
import { usePanel } from '@/context/PanelContext'

// Floating cart button — appears only when the cart has items, so it doesn't
// clutter the 7-button icon rail (which mirrors the HTML exactly).
export default function CartFab() {
  const { count } = useCart()
  const { openPanel } = usePanel()
  if (count === 0) return null

  return (
    <button
      onClick={() => openPanel('cart')}
      aria-label={`Open cart, ${count} items`}
      style={{
        position: 'fixed', right: 16, bottom: 96, zIndex: 300,
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff',
        fontSize: 24, boxShadow: '0 6px 20px rgba(255,69,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      🛒
      <span style={{
        position: 'absolute', top: -2, right: -2, background: '#1a1a1a', color: '#fff',
        fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900,
        minWidth: 20, height: 20, borderRadius: 50, border: '2px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
      }}>{count > 99 ? '99+' : count}</span>
    </button>
  )
}
