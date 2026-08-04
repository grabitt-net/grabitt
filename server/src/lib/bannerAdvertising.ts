import { BANNER_SLOTS, BANNER_SLOT_IDS, BANNER_DISCOUNTS, BANNER_INFEED_EVERY_ROWS, BANNER_MAX_MONTHS, isBannerSlot } from '@grabitt/design-tokens'
import type { PrismaClient } from '@prisma/client'

// A banner slot id is also the BannerPosition enum value. Kept as a string here
// so the Prisma enum and the token catalogue stay in lock-step without a cast
// wall at every call site.
export type SlotId = string

export type BannerSlot = {
  id: SlotId
  label: string
  monthlyCents: number
  cap: number
  exclusive: boolean
  perPage: boolean
  scope: string
  active: boolean
}

type SlotOverride = { monthlyCents?: number; cap?: number; active?: boolean }
type BannerConfigData = {
  slots?: Record<string, SlotOverride>
  infeedEveryRows?: number
  discounts?: { byLocations?: Record<number, number>; byDuration?: Record<number, number>; maxPct?: number }
  testMode?: boolean
}

async function readConfig(prisma: PrismaClient): Promise<BannerConfigData> {
  const row = await prisma.bannerConfig.findUnique({ where: { id: 'default' } })
  return (row?.data as BannerConfigData | undefined) ?? {}
}

/** The full slot catalogue merged with admin price/cap/active overrides. */
export async function getBannerCatalog(prisma: PrismaClient): Promise<BannerSlot[]> {
  const cfg = await readConfig(prisma)
  const o = cfg.slots ?? {}
  return BANNER_SLOT_IDS.map(id => {
    const base = BANNER_SLOTS[id]
    const ov = o[id] ?? {}
    return {
      id,
      label: base.label,
      monthlyCents: typeof ov.monthlyCents === 'number' ? ov.monthlyCents : base.monthlyCents,
      cap: typeof ov.cap === 'number' ? ov.cap : base.cap,
      exclusive: base.exclusive,
      perPage: base.perPage,
      scope: base.scope,
      active: ov.active !== false,
    }
  })
}

export async function getSlot(prisma: PrismaClient, id: SlotId): Promise<BannerSlot | null> {
  if (!isBannerSlot(id)) return null
  return (await getBannerCatalog(prisma)).find(s => s.id === id) ?? null
}

export async function getInfeedEveryRows(prisma: PrismaClient): Promise<number> {
  const cfg = await readConfig(prisma)
  return typeof cfg.infeedEveryRows === 'number' && cfg.infeedEveryRows > 0 ? cfg.infeedEveryRows : BANNER_INFEED_EVERY_ROWS
}

export async function isTestMode(prisma: PrismaClient): Promise<boolean> {
  return (await readConfig(prisma)).testMode === true
}

// ── Pricing ──────────────────────────────────────────────────────────────────

/**
 * Prorate the FIRST month when a booking starts part-way through a calendar
 * month: charge only the remaining days of that month. `months` whole months
 * follow. Returns the cents for the first (possibly partial) month.
 */
export function firstMonthCents(monthlyCents: number, startsAt: Date): number {
  const daysInMonth = new Date(startsAt.getFullYear(), startsAt.getMonth() + 1, 0).getDate()
  const startDay = startsAt.getDate()
  // Day 1 → full month; later → remaining days / days in month.
  if (startDay <= 1) return monthlyCents
  const remaining = daysInMonth - startDay + 1
  return Math.round(monthlyCents * (remaining / daysInMonth))
}

/**
 * Automatic discount percentage for an order, from the number of distinct slot
 * locations and the longest single-line duration. The best qualifying tier of
 * each axis is summed, capped at maxPct. Admin-editable via config.
 */
export function bannerDiscountPct(numLocations: number, maxMonths: number, cfg?: BannerConfigData): number {
  const byLoc = cfg?.discounts?.byLocations ?? BANNER_DISCOUNTS.byLocations
  const byDur = cfg?.discounts?.byDuration ?? BANNER_DISCOUNTS.byDuration
  const cap = cfg?.discounts?.maxPct ?? BANNER_DISCOUNTS.maxPct
  const best = (tiers: Record<number, number>, n: number) =>
    Object.entries(tiers).reduce((acc, [k, pct]) => (n >= Number(k) && pct > acc ? pct : acc), 0)
  return Math.min(cap, best(byLoc, numLocations) + best(byDur, maxMonths))
}

export type OrderLine = { position: SlotId; pageTarget?: string | null; months: number; startsAt: Date }
export type PricedLine = OrderLine & { monthlyCents: number; grossCents: number }
export type OrderQuote = { lines: PricedLine[]; subtotalCents: number; discountPct: number; totalCents: number }

/** Price a whole order: prorate each line's first month, apply auto-discounts. */
export async function quoteOrder(prisma: PrismaClient, lines: OrderLine[]): Promise<OrderQuote> {
  const cfg = await readConfig(prisma)
  const catalog = await getBannerCatalog(prisma)
  const priced: PricedLine[] = lines.map(l => {
    const slot = catalog.find(s => s.id === l.position)
    const monthly = slot?.monthlyCents ?? 0
    const months = Math.max(1, Math.min(BANNER_MAX_MONTHS, l.months))
    // First month prorated, remaining whole months at full rate.
    const gross = firstMonthCents(monthly, l.startsAt) + monthly * (months - 1)
    return { ...l, months, monthlyCents: monthly, grossCents: gross }
  })
  const subtotal = priced.reduce((s, l) => s + l.grossCents, 0)
  const distinctLocations = new Set(priced.map(l => `${l.position}:${l.pageTarget ?? ''}`)).size
  const maxMonths = priced.reduce((m, l) => Math.max(m, l.months), 0)
  const discountPct = bannerDiscountPct(distinctLocations, maxMonths, cfg)
  const total = Math.round(subtotal * (1 - discountPct / 100))
  return { lines: priced, subtotalCents: subtotal, discountPct, totalCents: total }
}

// ── Availability ─────────────────────────────────────────────────────────────

/** Bookings that overlap [startsAt, endsAt) for a slot (+page), for date-picker UI. */
export async function bookedRanges(prisma: PrismaClient, position: SlotId, pageTarget: string | null) {
  return prisma.bannerBooking.findMany({
    where: { position: position as never, pageTarget: pageTarget ?? null, status: 'active', endsAt: { gt: new Date() } },
    select: { startsAt: true, endsAt: true, userId: true },
    orderBy: { startsAt: 'asc' },
  })
}

/**
 * How many bookings already overlap the window on this slot+page. Callers
 * compare against the slot cap (exclusive = cap 1) to decide availability.
 */
export async function overlapCount(prisma: PrismaClient, position: SlotId, pageTarget: string | null, startsAt: Date, endsAt: Date): Promise<number> {
  return prisma.bannerBooking.count({
    where: {
      position: position as never,
      pageTarget: pageTarget ?? null,
      status: 'active',
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  })
}

/** End date for a booking of `months` whole months from `startsAt`. */
export function bookingEnd(startsAt: Date, months: number): Date {
  const end = new Date(startsAt)
  end.setMonth(end.getMonth() + Math.max(1, Math.min(BANNER_MAX_MONTHS, months)))
  return end
}
