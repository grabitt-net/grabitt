'use client'
import { useEffect, useState } from 'react'
import { createLooseTrpcClient } from '@/lib/trpc'
import { subcategoriesForSlug } from '@/lib/subcategories'

// Returns a resolver that merges the built-in default subcategories for a
// department with any admin-added ones (Admin → Categories → Subcategories),
// so newly-added subcategories appear in the Sell form, edit form and category
// filters. Falls back to just the defaults until the custom list has loaded.
export function useSubcategories() {
  const [custom, setCustom] = useState<Record<string, string[]>>({})
  useEffect(() => {
    createLooseTrpcClient().homepage.subcategories.query()
      .then((rows: unknown) => {
        const m: Record<string, string[]> = {}
        for (const r of (rows as { department: string; name: string }[]) ?? []) {
          (m[r.department] ??= []).push(r.name)
        }
        setCustom(m)
      })
      .catch(() => {})
  }, [])
  return (dept: string): string[] => {
    const base = subcategoriesForSlug(dept)
    const extra = (custom[dept] ?? []).filter(n => !base.includes(n))
    return [...base, ...extra]
  }
}
