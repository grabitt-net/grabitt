// The pages whose text Steve can edit from the CRM (Admin → Page Content).
// `key` is the pageKey stored on PageContent and passed to InfoPage as `dept`.
// When a page has saved content, InfoPage renders that rich text in place of the
// built-in copy. The editor pre-fills with EDITABLE_PAGE_DEFAULTS so Steve can
// amend the wording that's already there rather than starting from a blank box.
//
// Only pure-prose pages are listed here. Pages with forms or live data (Contact,
// Suggest Ideas, Guides, Economic Living, News) are deliberately excluded so a
// whole-page text override can't wipe out their working parts.
export const EDITABLE_PAGES: { key: string; label: string; path: string }[] = [
  { key: 'about', label: 'About Us', path: '/about' },
  { key: 'why', label: 'Why Us?', path: '/why' },
  { key: 'pricing', label: 'Pricing', path: '/pricing' },
  { key: 'delivery', label: 'Delivery', path: '/delivery' },
  { key: 'guarantee', label: 'Grabitt Guarantee', path: '/guarantee' },
  { key: 'scam-centre', label: 'Scam Centre', path: '/scam-centre' },
  { key: 'dos', label: "Dos & Don'ts", path: '/dos' },
]

// The current built-in copy for each page, as HTML — the editor loads this when
// a page has no saved override yet, so Steve edits the real words. Keep in rough
// sync with the pages if the built-in copy changes.
export const EDITABLE_PAGE_DEFAULTS: Record<string, string> = {
  about: `
<p>We identified a huge need for a few things that would make life easier for residents and visitors on the Canary Islands: buying, selling, property, charity, recruitment, and finding help and services for work or home.</p>
<p>The current offerings are, let's be honest, scattered and disjointed across social media and a couple of broader marketplaces that don't focus on the Canary Islands.</p>
<p>It makes it so hard — to find replies, to keep track of what you're buying or selling, to find a job or the right staff, to move home, or even to set up your own little business selling from home.</p>
<p>So we decided to create Grabitt, and bring it all together in one easy to use marketplace! Grabitt IS your local, Everything!</p>
<h2>Our Mission</h2>
<p>Very simple: to make life easier. Businesses finding great staff, people finding jobs and homes, charities raising money and awareness at no cost, and everyone having a little extra cash during tough times.</p>
`.trim(),

  why: `
<p>Easy! Take a look at some great ideas below to help you learn how good this site is — and how to use it to your advantage.</p>
<p>Plus, any suggestions or ideas, fire them over to us. This is an ever-evolving site, built with one thing in mind: building the community!</p>
<h2>What you get with Grabitt</h2>
<ul>
<li><strong>Easy to Use</strong> — everything simple, in one clean place.</li>
<li><strong>Everything in One Place</strong> — buy, sell, work, rent, give — no more app-hopping.</li>
<li><strong>Selling Made Easy</strong> — list in minutes, sell to people near you.</li>
<li><strong>Find Your Home</strong> — browse property to buy or rent across the islands.</li>
<li><strong>Sell or Rent Your Property</strong> — reach local buyers and tenants directly.</li>
<li><strong>Local Trading</strong> — deal with people on your island, not strangers abroad.</li>
<li><strong>Scam Avoidance &amp; Help Guides</strong> — spot the traps before they catch you.</li>
<li><strong>Safety Shield</strong> — extra layers of protection built in.</li>
<li><strong>Loyalty Points Scheme</strong> — get rewarded just for using Grabitt.</li>
<li><strong>Ratings Reassurance</strong> — buy and sell with people you can trust.</li>
<li><strong>Saved Searches</strong> — let the right listings come to you.</li>
<li><strong>Make an Offer</strong> — negotiate directly, your price.</li>
<li><strong>Local Services Finder</strong> — plumbers, cleaners, sparkies — all nearby.</li>
<li><strong>Free Charity Section</strong> — good causes raise funds and awareness at no cost.</li>
<li><strong>Tips &amp; Ideas</strong> — smart ways to get more out of Grabitt.</li>
<li><strong>Grabitt NOW</strong> — for things you need to buy or sell urgently.</li>
<li><strong>CV Builder &amp; Job Applications</strong> — find work and apply in a few taps.</li>
<li><strong>Build Your Online Business</strong> — your own storefront on the islands' marketplace.</li>
<li><strong>Directory Listings</strong> — get found by the whole island.</li>
<li><strong>Sponsorship Opportunities</strong> — put your business front and centre.</li>
<li><strong>Library of Local Guides</strong> — island know-how in one place.</li>
<li><strong>News &amp; Events</strong> — what's happening near you.</li>
<li><strong>Dispute Management</strong> — problems handled fairly and fast.</li>
<li><strong>Robust Help Centre</strong> — answers whenever you need them.</li>
</ul>
`.trim(),

  pricing: `
<p>Nice clean transparent pricing to help you make good decisions. Here is a list of our pricing!</p>
<h2>For You</h2>
<h3>Buying — Free</h3>
<p>Buy as much as you like, as often as you like — Grabitt never charges you a penny to buy. The only thing to watch for is postage or packaging fees set by the seller, so always check the listing before you commit. Simple.</p>
<h3>Selling Items — 2.5% to 8%</h3>
<p>Keep more of what you make. Selling fees run from just 2.5% up to 8%, depending on which business account you set up — the higher your level, the lower your fee. Listings run for 21 days and are auto-refreshed weekly.</p>
<h3>Featured Listing — €1.99 per week</h3>
<p>Want eyes on your item fast? For just €1.99 a week, your listing jumps into the Featured area right at the top of the homepage — pimped-up visibility that puts you in front of everyone browsing Grabitt.</p>
<h3>Grabitt NOW! — €4.99 per listing</h3>
<p>Got something that needs gone fast? Grabitt NOW! is built for urgency — discounted items and hot offers that can't wait. For €4.99 your listing lands right at the top of the homepage for a full 72 hours, in its own dedicated carousel alongside boosted listings.</p>
<h3>Handy Help — Free (personal accounts)</h3>
<p>Need a hand — or want to lend one? Personal accounts post a Handy Help request completely free. Every post stays live for 30 days with a countdown on the card, and your contact details stay hidden until you accept a response. Fees apply for business (see For Business).</p>
<h3>Property or Rental — €29 per listing</h3>
<p>List a property to rent or sell. Everyone gets one free property listing every month — after that it's just €29 per listing. Business accounts get an allowance included with their plan.</p>
<h2>For Business</h2>
<h3>Post a Job — €29 per listing</h3>
<p>Need some superstars to add to your team? Place an ad on Grabitt which enables you to filter and manage the candidates real time. You can buy job listings in bulk or pay per listing. Live for 14 days. Paid business accounts only.</p>
<h3>Recruitment Database Search — Optional extra</h3>
<p>An optional add-on that speeds up your recruitment — available only to businesses with a live, paid-for job advert. Enter your criteria, click search, and it brings up already-registered candidates who match. Unlocking a candidate's CV and contact details is charged per candidate and tied to the job advert you're hiring for.</p>
<h3>Handy Help — €9.99 to place · €2.99 to reply</h3>
<p>Business Lite and Directory accounts can take part in Handy Help: €9.99 to place your own advert, or €2.99 to unlock a listing so you can reply to it. Personal accounts post for free. Every post runs for 30 days and the poster's contact details stay hidden until they accept.</p>
<h3>Business Directory — €15/month</h3>
<p>Get found. List your business in the Grabitt Directory for €15 a month, or go annual for a tidy discount. Split into industry, you come up when people search for a plumber, dentist, doctor, lawyer — you name it. You get your logo, contact details, and a brief description of what you do and where you are, with a map pin.</p>
<h3>Property or Rental — €29 per listing</h3>
<p>Agents and businesses: property listings are included in your plan's allowance — list up to your tier's limit each month, then it's just €29 per extra listing.</p>
<h2>Sponsorship — Get Seen</h2>
<h3>Homepage Sponsor — €299 per month</h3>
<p>Grab prime position! THE most prominent banner on the entire site. Visible to everyone who visits the page, clickable to your listing, and you get a business directory listing for the duration of your banner sponsorship. You must be a minimum Business Light account for this type of sponsorship.</p>
<h3>Category Sponsor — €149 per month</h3>
<p>Industry domination! Grab this banner to be in front of buyers looking for a certain item in a certain department — they get to see you right at the top of their page! It clicks through to your business directory listing.</p>
<h3>Featured Partner — €79 per month</h3>
<p>A fantastic way to be almost everywhere. Your banner rotates with up to 7 featured partners across the site — the message box, alerts, saved and more — not the top of the homepage or the landing pages, but everything else, on rotation.</p>
`.trim(),

  delivery: `
<h2>Important: Confirmation of Receipt Is Required to Complete Your Transaction</h2>
<p>Whether your item is delivered or collected, the buyer must scan the transaction code at the point of handover to confirm the outcome. This step is mandatory and is required to complete the transaction and release payment.</p>
<p><strong>The buyer will be presented with two options:</strong></p>
<ul>
<li><strong>Accept</strong> — Confirm the item has been received safely and in good condition. This completes the transaction and releases payment to the seller.</li>
<li><strong>Reject</strong> — Confirm the item is being rejected and state the reason. This opens a formal dispute, and payment remains securely held pending resolution.</li>
</ul>
<p>Payment is only released once the buyer has scanned to accept. Until the transaction is confirmed, all funds remain protected and held securely.</p>
<h2>Collection in person</h2>
<p>Meet in a safe, busy public place. The seller shows their handover QR code (or the 6-character code beneath it). The buyer scans or types it, checks the item, and chooses Accept or Reject. Payment releases only on Accept.</p>
<h2>Delivery by the seller</h2>
<p>If the seller delivers in person, the same scan happens on arrival — the buyer scans the code at the door and confirms Accept or Reject. Nothing is released until they do.</p>
<h2>Tracked courier</h2>
<p>For items sent by a tracked courier, there's no code to scan — funds release automatically once tracking shows the item delivered, and the buyer has a short window to report a problem and open a dispute if needed.</p>
`.trim(),

  guarantee: `
<h2>Your money is protected from start to finish</h2>
<p>When you buy on Grabitt, your payment doesn't go straight to the seller. It's taken securely through <strong>Stripe</strong> — a globally trusted, regulated payment processor — and <strong>held</strong> until the deal is done properly. Grabitt never touches your money directly; it stays protected in the payment system until you're happy.</p>
<h2>How the Guarantee works</h2>
<ol>
<li><strong>You pay securely</strong> — your payment is captured by Stripe and held; it is not released to the seller yet.</li>
<li><strong>You meet or receive your item</strong> — at handover, whether delivered or collected, you check the item is exactly as described.</li>
<li><strong>You scan to confirm</strong> — you scan the transaction code and choose Accept (all good) or Reject (there's a problem). Nothing is released until you do.</li>
<li><strong>Payment releases — or is held</strong> — Accept releases the funds to the seller and completes the sale. Reject opens a formal dispute and your money stays held while it's resolved.</li>
</ol>
<h2>Fair for buyers and sellers</h2>
<p>The Guarantee protects <strong>both</strong> sides. Buyers never pay out for an item they haven't received and approved. Sellers know the buyer's money is real and waiting — so once the item is handed over and accepted, they get paid promptly and fairly. If something goes wrong, our dispute process steps in and reviews it, with the funds held safely in the meantime.</p>
<h2>What's always covered</h2>
<ul>
<li>Items that never arrive, or arrive not as described.</li>
<li>Payments — held via Stripe until you confirm receipt.</li>
<li>A clear, formal dispute route if you're not satisfied.</li>
<li>Protection when you keep everything on Grabitt — chat, payment and handover.</li>
</ul>
<p>The one rule: stay on Grabitt. The moment a deal moves off-platform — cash, bank transfer or another app — the Guarantee can no longer protect you.</p>
`.trim(),

  'scam-centre': `
<h2>How Grabitt keeps you safe</h2>
<p>Grabitt is built to make scams hard. Payments are held securely via <strong>Stripe</strong> until you scan to confirm you've received your item, handovers are verified with a transaction code, and every member carries a rating. As long as you keep everything on Grabitt, the protections work for you. Scammers know this — so their whole game is talking you out of the safe path.</p>
<h2>Common scams to watch for</h2>
<ul>
<li><strong>Move off-platform</strong> — 'Let's chat on WhatsApp instead' or 'pay by bank transfer to save fees.' Moving off Grabitt removes every protection — that's exactly why they ask. Keep chat, payment and handover on Grabitt.</li>
<li><strong>Overpayment trick</strong> — a buyer 'accidentally' overpays and asks you to refund the difference. Their original payment later bounces and you're left out of pocket. Never refund an overpayment.</li>
<li><strong>Fake payment proof</strong> — a screenshot or email 'proving' they've paid. Only ever trust money you can see confirmed in your own Grabitt transaction — never a screenshot.</li>
<li><strong>Too good to be true</strong> — a brand-new phone for a fraction of its price, luxury goods dirt cheap. If a deal looks unreal, it's bait. Slow down and check.</li>
<li><strong>Fakes &amp; replicas</strong> — counterfeit trainers, bags, watches and electronics sold as genuine. Check brand details, ask for proof of purchase, and report anything suspicious.</li>
<li><strong>Phishing messages</strong> — fake emails or texts posing as Grabitt, your bank or a courier, asking you to 'confirm details' or click a link. Don't click — open the official app or site directly.</li>
</ul>
<h2>Think something's wrong?</h2>
<ul>
<li>Stop — don't pay, refund or hand anything over.</li>
<li>Keep the conversation on Grabitt so there's a record.</li>
<li>Use <strong>Report a Listing</strong> to flag it to our team.</li>
<li>If money is already involved, open a <strong>dispute</strong> from the transaction — your funds stay held.</li>
</ul>
`.trim(),

  dos: `
<h2>✓ Do</h2>
<ul>
<li>Be honest and accurate in your listings and messages.</li>
<li>Keep chat, payments and arrangements on Grabitt — it protects you.</li>
<li>Treat everyone with respect and patience.</li>
<li>Inspect items at handover and confirm only when you're happy.</li>
<li>Report anything that feels off — fakes, scams or rude behaviour.</li>
</ul>
<h2>✕ Don't</h2>
<ul>
<li>Don't share or ask for personal contact details before a purchase.</li>
<li>Don't list fakes, replicas or anything illegal.</li>
<li>Don't try to dodge fees by taking deals off-platform.</li>
<li>Don't pressure, harass or abuse other members.</li>
</ul>
<h2>🚫 Zero tolerance</h2>
<p>The following lead to immediate removal and a permanent ban — and may be reported to authorities: disrespect &amp; harassment, scams &amp; fraud, fakes &amp; counterfeits, abuse or threats, circumventing Grabitt fees, anything that endangers a child.</p>
<h2>🤝 Meeting up safely</h2>
<ul>
<li>Meet in a busy public place in daylight — cafés, shopping centres, petrol stations.</li>
<li>Women and younger members: never go to a private address alone — take someone with you.</li>
<li>Keep your phone charged and tell someone where you're going and when.</li>
<li>Trust your instincts — if it feels wrong, walk away. No deal is worth your safety.</li>
<li>Use the QR handover at collection so the transaction is confirmed and protected.</li>
</ul>
`.trim(),
}
