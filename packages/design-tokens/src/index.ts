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

// ─────────────────────────────────────────────────────────────────────────────
// Revenue-model pricing (Steve's draft) — the canonical figures for the paid
// verticals. These constants are the source of truth for the numbers; where a
// charging FLOW isn't wired yet (per-job / per-property fees, blast bundles,
// standalone directory subscription), that is tracked separately — the money
// isn't collected just because the constant exists.

// Jobs beyond the tier's free allowance: €29/job initially, 14 days live.
// Bundle prices are provisional (not yet wired to checkout) — confirm with Steve
// before surfacing them; kept below €29/job so "buy in bulk and save" holds.
export const JOBS_PRICING = {
  perJobCents: 2900,
  daysLive: 14,
  bundles: { 5: 13000, 10: 24500 } as Record<number, number>, // provisional: €130 / €245
} as const

// Recruitment database search — an OPTIONAL add-on, available only to a business
// that has a live, paid-for job advert. Searching/browsing matches is free; the
// charge is per candidate you unlock (CV + contact details), and each unlock is
// tied to one of your live job adverts. No credits — a straight €-charge.
export const RECRUITMENT_PRICING = {
  cvUnlockCents: 499,   // €4.99 to unlock one candidate's CV + contact
} as const

// Property. Private: 1 free/month, €9 featured boost, €39 per extra listing.
// Business: €39/listing with the same 5/10 bundles. Advertising only — Grabitt
// takes no commission or deposit on property.
export const PROPERTY_PRICING = {
  privateFreePerMonth: 1,
  privateFeaturedBoostCents: 900,   // €9
  privateExtraListingCents: 3900,   // €39
  businessPerListingCents: 3900,    // €39
  businessBundles: { 5: 17500, 10: 35000 } as Record<number, number>,
} as const

// Handy Help — classified section (decided 2026-08). A personal account posts a
// request for FREE. Business Lite / Directory accounts pay to place an advert or
// to unlock a listing so they can reply. Every post is valid for 30 days.
// Poster's details stay hidden until they accept a proposal.
export const HANDY_PRICING = {
  personalPostFree: true,
  businessPlaceCents: 999,   // €9.99 for a business to place a Handy Help advert
  businessUnlockCents: 299,  // €2.99 for a business to unlock a listing to reply
  validityDays: 30,
} as const

// Standalone business-directory subscription (company name, phone, email,
// website, short description, logo — not a storefront). NOTE: the CURRENT build
// grants a directory entry only while a paid banner runs; this standalone
// subscription pricing is Steve's alternative model and is not yet wired.
export const DIRECTORY_PRICING = {
  monthlyCents: 1500,     // €15/mo
  quarterlyCents: 4000,   // €40/quarter
  yearlyCents: 15000,     // €150/year
} as const

// Direct-marketing blast bundles (all double opt-in). Single-send prices live on
// the BUSINESS_ADDONS email_blast / whatsapp_blast entries.
export const BLAST_BUNDLES = {
  email:    { 1: 14900, 3: 40000, 10: 90000 } as Record<number, number>,
  whatsapp: { 1: 19900, 3: 50000, 9: 90000 } as Record<number, number>,
} as const

// Business Light — the entry business tier: free membership, 8% commission, but
// €0.99 per listing (no free item allowance). NOTE: not yet a selectable tier in
// the subscription/grade system — captured here for the model.
export const BUSINESS_LIGHT = {
  label: 'Business Light',
  feeRate: 0.08,
  freeMembership: true,
  perListingCents: 99,   // €0.99
  // Free-tier monthly allowance: 3 free item listings a month. Also used as the
  // CEILING during a paid Business trial — a trialing business can't exceed the
  // free account until the trial ends and billing begins.
  caps: { items: 3, jobs: 0, property: 0 },
} as const

// Recurring subscription catalogue (from the original prototype). Amounts are
// in cents (EUR). `trialDays` 0 = no trial. `grantsGrade` = a grade floor while
// the sub is active. `verifyFeeCents` = one-off business verification.
export const SUBSCRIPTION_PLANS = {
  // 7 days free — sign up as a business at no cost, then
  // billing starts. Feeds Stripe's trial_period_days, so this constant IS the
  // free period; changing it changes what customers actually get.
  business:    { label: 'Business',            amountCents: 2900, interval: 'month', trialDays: 14, grantsGrade: 'dealer', verifyFeeCents: 1900,
                 blurb: 'Your own storefront, 🏢 badge & instant Dealer status. 14 days free, then €29/mo — pause any time.' },
  // Standard annual business plan — 2 months free vs paying monthly.
  business_annual: { label: 'Business (annual)', amountCents: 29000, interval: 'year', trialDays: 14, grantsGrade: 'dealer',
                 blurb: 'Everything in Business, billed yearly — €290/year (2 months free). 14 days free.' },
  // Founding cohort: a one-off annual lock-in for early businesses.
  business_founding_annual: { label: 'Founding Business (annual)', amountCents: 24900, interval: 'year', trialDays: 0, grantsGrade: 'dealer',
                 blurb: 'Founding annual plan — €249/year locked in. Everything in Business, prepaid for a year.' },
  service_ad:  { label: 'Advertise a service', amountCents: 2900, interval: 'month', trialDays: 0,
                 blurb: 'Promote your service to locals. €29/mo.' },
  page_banner: { label: 'Page banners',        amountCents: 3900, interval: 'month', trialDays: 0,
                 blurb: 'Your banner across Grabitt pages, with monthly click stats. €39/mo.' },
  directory:   { label: 'Business directory',  amountCents: 15000, interval: 'year',  trialDays: 0,
                 blurb: 'Year-round directory listing (name, phone, email, website, logo — not a storefront). €150/yr (also €15/mo or €40/quarter).' },
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
// Sponsorship & advertising add-ons. Each has a monthly (amountCents) and a
// discounted yearly (yearlyCents ≈ 10× monthly = 2 months free) price. These are
// the default prices; admins can override them in the executive suite.
export const BUSINESS_ADDONS = {
  homepage_sponsor:  { label: 'Homepage Sponsor',  icon: '🥇', amountCents: 29900, yearlyCents: 299000, blurb: 'Your brand on the homepage hero — the single most prominent slot on Grabitt.' },
  category_sponsor:  { label: 'Category Sponsor',  icon: '🤝', amountCents: 14900, yearlyCents: 149000, blurb: 'Own the fixed top banner of one category page — exclusive, a single advertiser per month, never rotates.' },
  featured_partner:  { label: 'Featured Partner',  icon: '⭐', amountCents: 7900,  yearlyCents: 79000,  blurb: 'A rotating banner in the bottom slot across pages (shared by up to 7 partners), plus your logo, blurb and link on the Sponsors & Partners page.' },
  directory:         { label: 'Business Directory', icon: '📖', amountCents: 1500,  yearlyCents: 15000,  blurb: 'A year-round directory listing — name, phone, email, website & logo (not a storefront). €15/mo, or 12 months for €150 (2 months free). Add your details after checkout.' },
  email_blast:       { label: 'Email blast',       icon: '📧', amountCents: 14900, yearlyCents: 149000, blurb: 'A promotional email to opted-in members (double opt-in). €149 for 1 · bundles: €400 for 3, €900 for 10.' },
  whatsapp_blast:    { label: 'WhatsApp blast',    icon: '💬', amountCents: 19900, yearlyCents: 199000, blurb: 'Broadcast promotions to opted-in customers on WhatsApp (double opt-in). €199 for 1 · bundles: €500 for 3, €900 for 9.', comingSoon: true },
} as const

export type BusinessAddonId = keyof typeof BUSINESS_ADDONS
export const BUSINESS_ADDON_IDS = Object.keys(BUSINESS_ADDONS) as BusinessAddonId[]
export const isBusinessAddon = (id: string): id is BusinessAddonId => id in BUSINESS_ADDONS

// ─────────────────────────────────────────────────────────────────────────────
// Banner advertising slots — the single source of truth for every place a
// sponsor banner can appear on Grabitt. Each slot maps to a BannerPosition enum
// value. `monthlyCents` is the default price (admins override in the executive
// suite). `cap` is how many advertisers can share the slot (1 = exclusive, it
// rotates otherwise). `exclusive` slots can only be sold to one advertiser for
// an overlapping period. `perPage` slots are sold per category/page. `scope`
// documents where it renders. All prices are amendable by admins.
export const BANNER_SLOTS = {
  home_top:         { label: 'Homepage sponsor',         monthlyCents: 29900, cap: 3, exclusive: false, perPage: false, scope: 'Top of the homepage — 3 rotating sponsors.' },
  category:         { label: 'Category — top banner',    monthlyCents: 14900, cap: 1, exclusive: true,  perPage: true,  scope: 'Fixed top banner of one category page (Category Sponsor overrides it).' },
  category_infeed:  { label: 'Category — in-feed',       monthlyCents: 9900,  cap: 5, exclusive: false, perPage: true,  scope: 'Between listing rows in category views (every N rows).' },
  category_footer:  { label: 'Category — bottom banner', monthlyCents: 7900,  cap: 5, exclusive: false, perPage: true,  scope: 'Bottom of a category page (Featured banner — 5 rotating slots).' },
  search_top:       { label: 'Search — top banner',      monthlyCents: 9900,  cap: 1, exclusive: true,  perPage: false, scope: 'Top of search results.' },
  search_footer:    { label: 'Search — bottom banner',   monthlyCents: 6900,  cap: 5, exclusive: false, perPage: false, scope: 'Bottom of search results (Featured banner — 5 rotating slots).' },
  sticky_bottom:    { label: 'Sticky bottom bar',        monthlyCents: 19900, cap: 1, exclusive: true,  perPage: false, scope: 'A dismissible bar pinned to the bottom of the viewport site-wide.' },
  similar_items:    { label: 'Similar-items sponsored',  monthlyCents: 8900,  cap: 4, exclusive: false, perPage: false, scope: 'A sponsored slot among “similar items” on listing pages.' },
  seller_dashboard: { label: 'Profile dashboard (business)', monthlyCents: 29900, cap: 3, exclusive: false, perPage: false, scope: 'Top of the business dashboard — 3 rotating sponsors.' },
  user_dashboard:   { label: 'Profile dashboard (personal)', monthlyCents: 29900, cap: 3, exclusive: false, perPage: false, scope: 'Top of the personal account dashboard — 3 rotating sponsors.' },
  checkout:         { label: 'Checkout (non-intrusive)', monthlyCents: 12900, cap: 1, exclusive: true,  perPage: false, scope: 'A relevant, non-blocking banner beside the checkout — never interrupts the flow.' },
  messages:         { label: 'Message centre',           monthlyCents: 14900, cap: 3, exclusive: false, perPage: false, scope: 'Message centre (premium placement).' },
  notifications:    { label: 'Notifications popup',      monthlyCents: 9900,  cap: 3, exclusive: false, perPage: false, scope: 'Featured sponsor inside the notifications popup.' },
  jobs:             { label: 'Recruitment page',         monthlyCents: 7900,  cap: 5, exclusive: false, perPage: false, scope: 'The jobs/recruitment page.' },
  home_mid:         { label: 'Homepage — mid feed',      monthlyCents: 12900, cap: 3, exclusive: false, perPage: false, scope: 'Between homepage sections.' },
  sponsor_footer:   { label: 'Featured banner (footer)', monthlyCents: 7900,  cap: 5, exclusive: false, perPage: false, scope: 'Bottom banner across Alerts, Saved, Messages & Departments — 5 rotating slots.' },
  sponsor_top:      { label: 'Site-wide top strip',      monthlyCents: 12900, cap: 1, exclusive: true,  perPage: false, scope: 'Top strip shown under the search bar across the site.' },
} as const
export type BannerSlotId = keyof typeof BANNER_SLOTS
export const BANNER_SLOT_IDS = Object.keys(BANNER_SLOTS) as BannerSlotId[]
export const isBannerSlot = (id: string): id is BannerSlotId => id in BANNER_SLOTS

// Banner sponsorship is sold by whole months, capped at 3 initially. Prorated
// for the current (already-started) month at purchase.
export const BANNER_MAX_MONTHS = 3
export const BANNER_DURATIONS = [1, 2, 3] as const

// How many listing rows between each in-feed category banner (admin-editable).
export const BANNER_INFEED_EVERY_ROWS = 3

// Automatic discounts, applied to the banner order subtotal (whichever tiers
// qualify stack multiplicatively is avoided — the single best % of each axis is
// summed then capped). Admin-editable.
export const BANNER_DISCOUNTS = {
  // % off by number of DISTINCT slot locations bought in one order.
  byLocations: { 2: 5, 3: 10, 4: 15 } as Record<number, number>,
  // % off by number of MONTHS on a single line.
  byDuration:  { 2: 5, 3: 10 } as Record<number, number>,
  maxPct: 25,
}
export type BillingInterval = 'month' | 'year'
export const addonPriceCents = (id: BusinessAddonId, interval: BillingInterval) =>
  interval === 'year' ? BUSINESS_ADDONS[id].yearlyCents : BUSINESS_ADDONS[id].amountCents

/** Monthly total (cents) for the base business plan + a set of add-ons. */
export function businessMonthlyTotalCents(addonIds: readonly string[]): number {
  return SUBSCRIPTION_PLANS.business.amountCents
    + addonIds.reduce((sum, id) => sum + (isBusinessAddon(id) ? BUSINESS_ADDONS[id].amountCents : 0), 0)
}

/** Combined add-on total (cents) for the chosen billing interval. */
export function addonsTotalCents(addonIds: readonly string[], interval: BillingInterval): number {
  return addonIds.reduce((sum, id) => sum + (isBusinessAddon(id) ? addonPriceCents(id, interval) : 0), 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Special member statuses — applied for by the member, validated by an admin,
// then granted. Each carries a badge and a benefit. `feeDiscountPct` is
// subtracted (in percentage points) from the seller's item-sale fee while the
// status is held (floored at 0). Charity is a free Business account for
// registered charities, capped at `listingCap` active listings, at 0% fees.
export const MEMBER_STATUSES = {
  student:    { label: 'Student',    badge: '🎓', appliesTo: 'personal', feeDiscountPct: 3,   evidence: 'Student ID, enrolment letter or valid .edu/university email',
                blurb: 'Reduced selling fees for verified students — 3% off your fee.' },
  blue_light: { label: 'Blue Light', badge: '🔷', appliesTo: 'personal', feeDiscountPct: 4,   evidence: 'Work ID or payslip for NHS/health, emergency services or armed forces',
                blurb: 'A thank-you rate for health, emergency-service and armed-forces workers — 4% off your fee.' },
  charity:    { label: 'Charity',    badge: '❤️', appliesTo: 'business', feeDiscountPct: 100, freeBusiness: true, listingCap: 100,
                evidence: 'Charity registration number and proof of registration',
                blurb: 'Free Business account and 0% selling fees for registered charities, up to 100 active listings.' },
} as const
export type MemberStatusId = keyof typeof MEMBER_STATUSES
export const MEMBER_STATUS_IDS = Object.keys(MEMBER_STATUSES) as MemberStatusId[]
export const isMemberStatus = (id: string): id is MemberStatusId => id in MEMBER_STATUSES

// ─────────────────────────────────────────────────────────────────────────────
// Founding Member — the first FOUNDING.cap WEB signups (admin-created accounts
// never auto-qualify) get a permanent ⭐ badge, 50% off the standard selling fee
// for the first `weeks` weeks from signup, standard Grabber grade & limits, and
// immediate affiliate status. The discount applies to the sales commission ONLY
// — listing upgrades (Featured, Grab It Now, etc.) are still charged at normal
// rates. feeDiscountPct is in percentage points: 4 = 50% of the 8% Grabber fee.
export const FOUNDING = {
  cap: 250,
  feeDiscountPct: 4, // 50% off the 8% Grabber sales fee
  weeks: 12,
} as const

// The €249/yr Founding Business annual plan is limited to the first N businesses.
export const FOUNDING_BUSINESS_CAP = 100

// Affiliate programme — an affiliate earns a fixed cash amount per validated
// signup made through their referral link. Founding affiliates earn the higher
// rate. These are the defaults; admins can change them in the executive suite.
export const AFFILIATE_DEFAULTS = {
  foundingRateCents: 500, // €5.00 per signup (to be finalised)
  standardRateCents: 200, // €2.00 per signup
} as const
export type AffiliateTier = 'founding' | 'standard'

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
            caps: { items: 30,  jobs: 1, property: 1 }, criteria: { sales90d: 0,  rating: 0   } },
  trader: { key: 'trader', label: 'Business Plus', feeRate: FEE_RATES.trader, // 4%
            caps: { items: 100, jobs: 2, property: 2 }, criteria: { sales90d: 25, rating: 4.7 } },
  pro:    { key: 'pro',    label: 'Business Pro',  feeRate: FEE_RATES.pro,    // 2.5%
            caps: { items: 500, jobs: 5, property: 5 }, criteria: { sales90d: 75, rating: 4.9 } },
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
