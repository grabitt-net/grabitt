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
  // 21 days free per the V20 prototype — sign up as a business at no cost, then
  // billing starts. Feeds Stripe's trial_period_days, so this constant IS the
  // free period; changing it changes what customers actually get.
  business:    { label: 'Business',            amountCents: 2900, interval: 'month', trialDays: 21, grantsGrade: 'dealer', verifyFeeCents: 1900,
                 blurb: 'Your own storefront, 🏢 badge & instant Dealer status. 21 days free, then €29/mo — pause any time.' },
  service_ad:  { label: 'Advertise a service', amountCents: 2900, interval: 'month', trialDays: 0,
                 blurb: 'Promote your service to locals. €29/mo.' },
  page_banner: { label: 'Page banners',        amountCents: 3900, interval: 'month', trialDays: 0,
                 blurb: 'Your banner across Grabitt pages, with monthly click stats. €39/mo.' },
  directory:   { label: 'Business directory',  amountCents: 9900, interval: 'year',  trialDays: 0,
                 blurb: 'Year-round directory listing, with click stats. €99/yr.' },
} as const

export type SubPlanId = keyof typeof SUBSCRIPTION_PLANS

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
