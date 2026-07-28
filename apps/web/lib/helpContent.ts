// Help Centre content — topic categories, each with articles (Q + A). Kept as
// plain data so it powers the /help page, its search, and the context handed to
// the AI assistant. Answers are plain text (short paragraphs) for readability.

export type HelpArticle = { q: string; a: string }
export type HelpTopic = { id: string; icon: string; title: string; blurb: string; articles: HelpArticle[] }

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started', icon: '🚀', title: 'Getting started', blurb: 'New to Grabitt? Start here.',
    articles: [
      { q: 'What is Grabitt?', a: 'Grabitt is a local-first marketplace for Gran Canaria — buy and sell items, find jobs, rent or buy property, and hire tradespeople, all in one place. Grabitt is an intermediary: the contract is between the buyer and seller.' },
      { q: 'How do I create an account?', a: 'Tap Sign Up, choose an Individual or Business account, and register with email or Google. Individual accounts are free with 50 welcome credits.' },
      { q: 'Is it free to use?', a: 'Browsing and buying are free. You only pay when you sell (a small commission on completed sales), promote a listing, or take a paid plan such as Business or an agent plan.' },
    ],
  },
  {
    id: 'buying', icon: '🛒', title: 'Buying', blurb: 'Orders, offers and delivery.',
    articles: [
      { q: 'How do I buy an item?', a: 'Open a listing and tap Buy Now, or Make an Offer to negotiate. Payment is taken securely by Stripe and held in escrow until you confirm you have the item.' },
      { q: 'How do offers work?', a: 'Send your price with Make an Offer. Some sellers set an auto-accept minimum, so an offer at or above it is accepted instantly; otherwise the seller can accept, decline or counter.' },
      { q: 'What is Grab It Now?', a: 'Grab It Now shows time-limited flash deals near you on a map. Offers expire, so grab them before the countdown ends.' },
      { q: 'When is my money released to the seller?', a: 'For collection, funds release once you confirm handover (via the QR code). For courier delivery, funds release 48 hours after delivery is confirmed, giving you time to check the item.' },
    ],
  },
  {
    id: 'selling', icon: '🏷️', title: 'Selling', blurb: 'List items and get paid.',
    articles: [
      { q: 'How do I list an item?', a: 'Tap Sell, add photos, a title, description, price and location, then go live. Category-specific fields (size, colour, type, etc.) appear based on what you are selling.' },
      { q: 'What fee do I pay?', a: 'A commission is taken from completed sales only — the rate depends on your seller grade. The listing itself is free; the payout you set is what you receive after commission if it sells.' },
      { q: 'What is the expected payout?', a: 'On the listing screen this is what you would receive after our commission if the item sells at that price — you are not charged that amount to list.' },
      { q: 'Can I sell in bulk?', a: 'Business accounts can bulk-import a whole catalogue from a CSV and set multibuy discounts. Individual (Grabber) accounts can list one of each item.' },
    ],
  },
  {
    id: 'payments', icon: '💳', title: 'Payments & escrow', blurb: 'Secure payments and refunds.',
    articles: [
      { q: 'How are payments protected?', a: 'Payments are processed by Stripe and held in escrow. The seller is only paid once the transaction is confirmed complete, so your money is protected until then.' },
      { q: 'Can I get a refund?', a: 'If something goes wrong, open a dispute from the order and our team will review it. Buying from a business seller also gives you the statutory 14-day withdrawal right.' },
      { q: 'Keep payments on Grabitt', a: 'Never pay outside Grabitt. Moving a deal off-platform removes escrow protection and breaches our terms.' },
    ],
  },
  {
    id: 'business', icon: '🏢', title: 'Business accounts', blurb: 'Storefronts, badges and tools.',
    articles: [
      { q: 'What does a Business account give me?', a: 'Your own storefront, a verified 🏢 badge, instant Dealer grade (lower fees), multibuy pricing, bulk import and the ability to list property and jobs. 7 days free, then €29/mo.' },
      { q: 'How do I verify my business?', a: 'Upload your registration documents (or modelo 036/037 if autónomo), a recent utility bill or invoice in the business name, and your website/socials. Verification unlocks the shield badge.' },
    ],
  },
  {
    id: 'property', icon: '🏠', title: 'Property & agents', blurb: 'Listing and renting property.',
    articles: [
      { q: 'Who can list property?', a: 'Property is listed by Business (agent) accounts on a monthly agent plan, which includes an active-listing allowance (e.g. 15 or 40 listings).' },
      { q: 'Why is my property listing "pending"?', a: 'Every property listing is reviewed by our team before it goes live, to keep quality high. You will be notified when it is approved.' },
      { q: 'Holiday rentals and licences', a: 'Holiday lets in the Canary Islands require a Vivienda Vacacional (VV) licence — the licence number must be shown on the advert.' },
      { q: 'What is a tenant profile?', a: 'Renters can fill in a tenant profile (budget, move-in date, occupants, employment) and share it when enquiring so agents can pre-qualify them.' },
    ],
  },
  {
    id: 'recruitment', icon: '💼', title: 'Recruitment', blurb: 'Jobs, hiring and CVs.',
    articles: [
      { q: 'How do I find work?', a: 'Open Recruitment → Browse Jobs, filter by sector, location and salary, and apply in a couple of taps. You can also list yourself for work so employers find you.' },
      { q: 'How do I hire staff?', a: 'From Recruitment → Hire Staff you can post a job advert or search the candidate database (a Business feature).' },
      { q: 'Is my CV shared with my name?', a: 'No — your CV is anonymised (an applicant reference, not your name/contact) until an employer shortlists you or invites you to interview.' },
    ],
  },
  {
    id: 'safety', icon: '🛡️', title: 'Safety', blurb: 'Stay safe buying and selling.',
    articles: [
      { q: 'How do I stay safe?', a: 'Keep chat and payment on Grabitt, meet in safe public places for collection, inspect items at handover, and use the Safety Shield. Report anything suspicious.' },
      { q: 'How do I report a problem or user?', a: 'Use the Report option on a listing or profile, or the Report tab in the app. Our team reviews every report.' },
      { q: 'Avoiding scams', a: 'Never release a held payment, send cash, or post an item before the other side has genuinely done their part. Watch for fakes and off-platform requests.' },
    ],
  },
  {
    id: 'account', icon: '⚙️', title: 'Account & privacy', blurb: 'Settings, data and credits.',
    articles: [
      { q: 'How do credits work?', a: 'Credits are used for things like candidate searches. They have no cash value, are non-refundable once spent, and may expire.' },
      { q: 'How is my data handled?', a: 'See our Privacy Policy. Contact details are only shared when a transaction requires it. You can request erasure of your personal data at any time.' },
      { q: 'How do I change my email or password?', a: 'From Account → Settings. Changing your email sends a confirmation link to the new address; it only changes once you click that link.' },
    ],
  },
]

// A compact plain-text digest of all articles, used as grounding context for the
// AI assistant so its answers stay accurate to how Grabitt actually works.
export function helpDigest(): string {
  return HELP_TOPICS.map(t =>
    `## ${t.title}\n` + t.articles.map(a => `Q: ${a.q}\nA: ${a.a}`).join('\n')
  ).join('\n\n')
}
