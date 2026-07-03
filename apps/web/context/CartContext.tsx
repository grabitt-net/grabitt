'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface CartItem {
  key: string            // stable id (listingId or synthetic)
  listingId?: string
  title: string
  price: number          // unit price in €
  emoji?: string
  location?: string
  deliveryFee?: number
  deliveryMethod?: 'courier' | 'in_person'
  qty: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  total: number
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue>({
  items: [], count: 0, total: 0, add: () => {}, setQty: () => {}, remove: () => {}, clear: () => {},
})

const STORAGE_KEY = 'grabitt_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load once on mount (client only) to avoid SSR hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  const add = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.key === item.key)
      if (existing) return prev.map(i => i.key === item.key ? { ...i, qty: i.qty + qty } : i)
      return [...prev, { ...item, qty }]
    })
  }, [])

  const setQty = useCallback((key: string, qty: number) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, qty: Math.max(1, qty) } : i))
  }, [])

  const remove = useCallback((key: string) => setItems(prev => prev.filter(i => i.key !== key)), [])
  const clear = useCallback(() => setItems([]), [])

  const count = items.reduce((s, i) => s + i.qty, 0)
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)

  return (
    <CartContext.Provider value={{ items, count, total, add, setQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
