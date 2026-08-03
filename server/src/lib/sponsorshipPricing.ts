import { BUSINESS_ADDONS, BUSINESS_ADDON_IDS, isBusinessAddon } from '@grabitt/design-tokens'
import type { PrismaClient } from '@prisma/client'

export type SponsorItem = { id: string; label: string; icon: string; blurb: string; comingSoon: boolean; monthlyCents: number; active: boolean }

// Buyable durations. 12 months gets 2 months free (×10 not ×12).
export const SPONSOR_DURATIONS = [1, 3, 6, 12] as const

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
