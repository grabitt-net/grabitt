import { BUSINESS_ADDONS, BUSINESS_ADDON_IDS, isBusinessAddon, BLAST_BUNDLES } from '@grabitt/design-tokens'
import type { PrismaClient } from '@prisma/client'

// Email / WhatsApp blasts are priced by SEND-QUANTITY bundles (not months), per
// the revenue model: email €149 / €400 / €900 for 1 / 3 / 10 sends; WhatsApp
// €199 / €500 / €900 for 1 / 3 / 9 sends. These helpers keep the basket, the
// checkout and the client in step.
export function blastKind(addonId: string): 'email' | 'whatsapp' | null {
  return addonId === 'email_blast' ? 'email' : addonId === 'whatsapp_blast' ? 'whatsapp' : null
}
export function blastQuantities(addonId: string): number[] {
  const k = blastKind(addonId)
  return k ? Object.keys(BLAST_BUNDLES[k]).map(Number).sort((a, b) => a - b) : []
}
export function blastPriceCents(addonId: string, qty: number): number | null {
  const k = blastKind(addonId)
  return k ? (BLAST_BUNDLES[k][qty] ?? null) : null
}

export type SponsorItem = { id: string; label: string; icon: string; blurb: string; comingSoon: boolean; monthlyCents: number; active: boolean }

// Buyable durations. 12 months gets 2 months free (×10 not ×12).
export const SPONSOR_DURATIONS = [1, 3, 6, 12] as const

// Which add-ons map to a banner slot, the slot position, the per-page cap, and
// whether the buyer picks a specific page. Category Sponsor is one advertiser per
// page (fixed top); Featured Partner rotates up to 7 in the bottom slot.
export const ADDON_BANNER: Record<string, { position: string; cap: number; needsPage: boolean; label: string }> = {
  homepage_sponsor: { position: 'home_top', cap: 3, needsPage: false, label: 'Homepage sponsor (3 rotating)' },
  category_sponsor: { position: 'category', cap: 1, needsPage: true, label: 'Category top banner' },
  featured_partner: { position: 'sponsor_footer', cap: 5, needsPage: false, label: 'Featured banner (5 rotating slots)' },
}
export const bannerForAddon = (addonId: string) => ADDON_BANNER[addonId] ?? null

// Pages a Category Sponsor can own (department slugs + home).
export const SPONSOR_PAGES = [
  'home', 'motors', 'property', 'fashion', 'electronics', 'home_garden', 'sport',
  'gaming', 'kids_baby', 'jobs', 'grab_it_now', 'services',
] as const

/** Total (cents) to buy `months` of an add-on at `monthlyCents`. 12 = ×10. */
export function sponsorshipTotalCents(monthlyCents: number, months: number): number {
  const multiplier = months >= 12 ? 10 : months
  return monthlyCents * multiplier
}

// Banner sponsor placements (Homepage / Category / Featured) are booked 1–3
// months at a time — max 3 so the slot frees up for others. Discounts: 20% off
// for 2 months, 30% off for 3 months.
export const BANNER_SPONSOR_MONTHS = [1, 2, 3] as const
export function bannerSponsorTotalCents(monthlyCents: number, months: number): number {
  const m = Math.max(1, Math.min(3, months))
  const mult = m === 3 ? 3 * 0.7 : m === 2 ? 2 * 0.8 : 1
  return Math.round(monthlyCents * mult)
}
// The Business Directory is offered monthly (€15) or yearly (€150) in the menu.
export const DIRECTORY_MENU_DURATIONS = [1, 12] as const

// Line total for any menu add-on, by its pricing model:
//  • blasts        → fixed send-quantity bundle
//  • banner sponsor → 1–3 months with the 20/30% discount
//  • directory      → months × monthly (12 = ×10 = one year)
export function addonLineCents(addonId: string, monthlyCents: number, n: number): number {
  if (blastKind(addonId)) return blastPriceCents(addonId, n) ?? 0
  if (bannerForAddon(addonId)) return bannerSponsorTotalCents(monthlyCents, n)
  return sponsorshipTotalCents(monthlyCents, n)
}
// Is `n` a valid quantity/duration for this add-on's pricing model?
export function isValidAddonQty(addonId: string, n: number): boolean {
  if (blastKind(addonId)) return blastQuantities(addonId).includes(n)
  if (bannerForAddon(addonId)) return (BANNER_SPONSOR_MONTHS as readonly number[]).includes(n)
  return (DIRECTORY_MENU_DURATIONS as readonly number[]).includes(n)
}

/** The catalogue merged with admin overrides. */
export async function getSponsorshipCatalog(prisma: PrismaClient): Promise<SponsorItem[]> {
  const row = await prisma.sponsorshipConfig.findUnique({ where: { id: 'default' } })
  const overrides = (row?.data as { addons?: Record<string, { monthlyCents?: number; active?: boolean }> } | undefined)?.addons ?? {}
  return BUSINESS_ADDON_IDS.map(id => {
    const a = BUSINESS_ADDONS[id]
    const o = overrides[id] ?? {}
    return {
      id,
      label: a.label,
      icon: a.icon,
      blurb: a.blurb,
      comingSoon: 'comingSoon' in a && !!a.comingSoon,
      monthlyCents: typeof o.monthlyCents === 'number' ? o.monthlyCents : a.amountCents,
      active: o.active !== false,
    }
  })
}

export async function sponsorMonthlyCents(prisma: PrismaClient, addonId: string): Promise<number | null> {
  if (!isBusinessAddon(addonId)) return null
  const cat = await getSponsorshipCatalog(prisma)
  const item = cat.find(c => c.id === addonId)
  return item && item.active ? item.monthlyCents : null
}
