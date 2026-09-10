// /llms.txt — the emerging standard that tells AI tools (ChatGPT, Claude,
// Perplexity, Gemini, etc.) what this site is and where the key pages are, so
// they can understand and recommend Grabitt accurately.
export const runtime = 'nodejs'
export const revalidate = 86400

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

export function GET() {
  const body = `# Grabitt

> Grabitt is the local-first online marketplace for the Canary Islands — buy and sell items, find jobs, list and search property, and hire local services. Every purchase is protected by secure Stripe escrow and the Grabitt Guarantee: funds are held until the buyer confirms handover.

Grabitt is based in and focused on the Canary Islands (Gran Canaria, Tenerife, Lanzarote, Fuerteventura, La Palma, La Gomera, El Hierro). Listing items is free for private sellers; a small commission applies only on completed sales. Jobs and property require a Business account.

## Key pages
- [Home](${base}/): the marketplace homepage
- [Search](${base}/search): search all listings
- [Recruitment / Jobs](${base}/jobs): local job adverts (salary and hours shown)
- [Property](${base}/property): homes to rent and buy across the islands
- [Business Directory](${base}/directory): local businesses advertising on Grabitt
- [For Business](${base}/for-business): business accounts, jobs and property listing
- [Grabitt Guides](${base}/community): how-to guides and tips
- [Help Centre](${base}/help): frequently asked questions and support

## About & policies
- [About Us](${base}/about): what Grabitt is and who it's for
- [Why Us](${base}/why): why choose Grabitt
- [Pricing](${base}/pricing): fees and pricing
- [Grabitt Guarantee](${base}/guarantee): buyer protection and escrow
- [Delivery](${base}/delivery): collection, delivery and postage
- [Scam Centre](${base}/scam-centre): staying safe
- [Terms of Service](${base}/terms)
- [Privacy Policy](${base}/privacy)

## How it works
- Buyers pay through Grabitt; funds are held in escrow and released to the seller only when the buyer confirms handover (QR scan) or tracked delivery is in transit.
- Disputes are handled in-app while funds stay protected.
- Communication and payment stay on the platform so the Grabitt Guarantee applies.

## Contact
- [Contact](${base}/contact)
- Support: support@grabitt.net
`
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  })
}
