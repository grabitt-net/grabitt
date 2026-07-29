// JS/TS constants that mirror tokens.css
// Import these in server code, Expo, or anywhere CSS vars aren't available.

export const colors = {
  orange: '#FF4500',
  orange2: '#FF7A00',
  dark: '#1A1A1A',
  sand: '#F5ECD7',
  topbarCrm: '#E8DDD5',
  ocean: '#1B6CA8',
  terra: '#C1440E',
  sage: '#6B8F71',
  cream: '#FFFFFF',
  sand2: '#EDE0C4',
  pipeline: {
    lead: '#E2E8F0',
    qual: '#DBEAFE',
    pitch: '#FEF3C7',
    close: '#D1FAE5',
    won: '#4ADE80',
    lost: '#FCA5A5',
    nurture: '#E9D5FF',
  },
} as const

export const fonts = {
  body: "'Comfortaa', sans-serif",
  ui: "'Nunito', sans-serif",
  display: "'Playfair Display', serif",
} as const

// Business rules — hard-coded, never configurable
export const FEE_RATES = {
  grabber: 0.08,
  dealer: 0.06,
  trader: 0.04,
  pro: 0.025,
} as const

export const LISTING_CAPS = {
  grabber: 10,
  dealer: 50,
  trader: 200,
  pro: Infinity,
} as const

export const GRADE_THRESHOLDS = {
  dealer: { sales: 11, rating: 4.0 },
  trader: { sales: 51, rating: 4.5 },
  pro: { sales: 201, rating: 4.8 },
} as const

export const PRICES = {
  grabItNow: 4.99,
  featuredPerWeek: 1.99,
  businessMonthly: 29,
  businessVerification: 19,
  creditsPerShare: 10,
  maxSharesPerMonth: 10,
  registrationBonus: 50,
  // Both referrer and referred earn this when the referred user lists their
  // first item.
  referralBonus: 50,
} as const

// Recurring subscription catalogue (from the original prototype). Amounts are
// in cents (EUR). `trialDays` 0 = no trial. `grantsGrade` = a grade floor while
// the sub is active. `verifyFeeCents` = one-off business verification.
export const SUBSCRIPTION_PLANS = {
  // 7 days free — sign up as a business at no cost, then
  // billing starts. Feeds Stripe's trial_period_days, so this constant IS the
  // free period; changing it changes what customers actually get.
  business:    { label: 'Business',            amountCents: 2900, interval: 'month', trialDays: 7, grantsGrade: 'dealer', verifyFeeCents: 1900,
                 blurb: 'Your own storefront, 🏢 badge & instant Dealer status. 7 days free, then €29/mo — pause any time.' },
  service_ad:  { label: 'Advertise a service', amountCents: 2900, interval: 'month', trialDays: 0,
                 blurb: 'Promote your service to locals. €29/mo.' },
  page_banner: { label: 'Page banners',        amountCents: 3900, interval: 'month', trialDays: 0,
                 blurb: 'Your banner across Grabitt pages, with monthly click stats. €39/mo.' },
  directory:   { label: 'Business directory',  amountCents: 9900, interval: 'year',  trialDays: 0,
                 blurb: 'Year-round directory listing, with click stats. €99/yr.' },
  // Property-agent plans — a monthly fee that includes an active-listing
  // allowance. Enforced on property.create; managed by admins via approval.
  agent_15:    { label: 'Agent — 15 listings',  amountCents: 4900, interval: 'month', trialDays: 0, propertyAllowance: 15,
                 blurb: 'List up to 15 active properties. €49/mo.' },
  agent_40:    { label: 'Agent — 40 listings',  amountCents: 9900, interval: 'month', trialDays: 0, propertyAllowance: 40,
                 blurb: 'List up to 40 active properties. €99/mo.' },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Business add-ons — optional recurring extras billed ON TOP of the €29 base
// business subscription. The business opts in/out at signup or later from the
// dashboard; the selected set is stored on the user and the Stripe subscription's
// line items are reconciled to match, so the monthly charge updates automatically.
// All amounts are per MONTH in cents (EUR). `comingSoon` add-ons are billed but
// their delivery engine isn't live yet (see docs/whatsapp-blast-spec.md).
export const BUSINESS_ADDONS = {
  headline_sponsor:   { label: 'Headline Sponsor',   icon: '🥇', amountCents: 29900, blurb: 'Your brand on the homepage hero + a Featured Partner badge across Grabitt.' },
  department_sponsor: { label: 'Department Sponsor', icon: '🤝', amountCents: 14900, blurb: 'Own a department page (e.g. Motors, Property) with your banner + badge.' },
  featured_partner:   { label: 'Featured Partner',   icon: '⭐', amountCents: 7900,  blurb: 'Listed on the Sponsors & Partners page with logo, blurb and link.' },
  page_banners:       { label: 'Page banners',       icon: '🖼️', amountCents: 4900,  blurb: 'A rotating banner slot across department & search pages, with click stats.' },
  sponsored_placement:{ label: 'Sponsored placement',icon: '🚀', amountCents: 1900,  blurb: 'Priority placement of your listings in search and category results.' },
  business_directory: { label: 'Business directory', icon: '📒', amountCents: 900,   blurb: 'Year-round listing in the Grabitt business directory.' },
  whatsapp_blast:     { label: 'WhatsApp blast',     icon: '💬', amountCents: 2900,  blurb: 'Broadcast promotions to your opted-in customers on WhatsApp.', comingSoon: true },
} as const

export type BusinessAddonId = keyof typeof BUSINESS_ADDONS
export const BUSINESS_ADDON_IDS = Object.keys(BUSINESS_ADDONS) as BusinessAddonId[]
export const isBusinessAddon = (id: string): id is BusinessAddonId => id in BUSINESS_ADDONS

/** Monthly total (cents) for the base business plan + a set of add-ons. */
export function businessMonthlyTotalCents(addonIds: readonly string[]): number {
  return SUBSCRIPTION_PLANS.business.amountCents
    + addonIds.reduce((sum, id) => sum + (isBusinessAddon(id) ? BUSINESS_ADDONS[id].amountCents : 0), 0)
}

// Property-agent plan ids and their active-listing allowance.
export const AGENT_PLANS = {
  agent_15: 15,
  agent_40: 40,
} as const
export type AgentPlanId = keyof typeof AGENT_PLANS

export type SubPlanId = keyof typeof SUBSCRIPTION_PLANS

// ─────────────────────────────────────────────────────────────────────────────
// Business tiers — the three levels a Business account climbs. They ride on top
// of the existing seller `grade` (dealer/trader/pro) so fees, caps and the
// promote/demote engine stay in one place; this map is the business-facing
// naming, the reduced item-sale fee, the monthly listing allowances, and the
// rolling criteria a business must MEET AND MAINTAIN to hold the tier.
//
// Fees apply to ITEM SALES ONLY — never to property or job listings.
// `sales90d` counts completed sales in the trailing 90 days, so a business that
// stops trading slips back down a level. `dealer` (Business) is the floor for
// any business account — it has no criteria.
export const BUSINESS_TIERS = {
  dealer: { key: 'dealer', label: 'Business',      feeRate: FEE_RATES.dealer, // 6%
            caps: { items: 30,  jobs: 3,  property: 5  }, criteria: { sales90d: 0,  rating: 0   } },
  trader: { key: 'trader', label: 'Business Plus', feeRate: FEE_RATES.trader, // 4%
            caps: { items: 100, jobs: 10, property: 20 }, criteria: { sales90d: 25, rating: 4.3 } },
  pro:    { key: 'pro',    label: 'Business Pro',  feeRate: FEE_RATES.pro,    // 2.5%
            caps: { items: 500, jobs: 30, property: 60 }, criteria: { sales90d: 75, rating: 4.6 } },
} as const

export const BUSINESS_TIER_ORDER = ['dealer', 'trader', 'pro'] as const
export type BusinessGrade = typeof BUSINESS_TIER_ORDER[number]

/** The business tier for any grade — anything below dealer floors at Business. */
export function businessTierForGrade(grade: string) {
  const key: BusinessGrade = grade === 'pro' ? 'pro' : grade === 'trader' ? 'trader' : 'dealer'
  return BUSINESS_TIERS[key]
}

/** Highest tier a business qualifies for on trailing sales + rating. */
export function qualifyingBusinessGrade(sales90d: number, rating: number): BusinessGrade {
  if (sales90d >= BUSINESS_TIERS.pro.criteria.sales90d && rating >= BUSINESS_TIERS.pro.criteria.rating) return 'pro'
  if (sales90d >= BUSINESS_TIERS.trader.criteria.sales90d && rating >= BUSINESS_TIERS.trader.criteria.rating) return 'trader'
  return 'dealer'
}

export const GRAB_IT_NOW_WINDOWS = [2, 4, 6, 12, 24] as const

export const EXEC_SESSION_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours, NO silent refresh

export const FUND_RELEASE_AUTO_DAYS = 14

// Postal/courier orders. Funds are released 48 hours AFTER the parcel is
// confirmed delivered — never on dispatch — so the buyer has the item in hand
// before the seller is paid. The buyer has 24 hours from delivery to raise a
// dispute; after that the item is deemed accepted. The 24h window closing
// before the 48h release leaves a deliberate buffer to action a late dispute.
export const COURIER_RELEASE_HOURS = 48
export const COURIER_DISPUTE_WINDOW_HOURS = 24
