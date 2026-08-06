import { BUSINESS_ADDONS, BUSINESS_ADDON_IDS, isBusinessAddon } from '@grabitt/design-tokens'
import type { PrismaClient } from '@prisma/client'

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
