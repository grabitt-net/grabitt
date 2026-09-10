import type { Metadata } from 'next'
import { prisma } from 'server/src/db'

export const runtime = 'nodejs'

// Per-listing SEO: real title, description and share image so each listing has
// its own metadata / OpenGraph card instead of the generic site default. The
// page itself stays a client component; this server layout supplies the <head>.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const l = await prisma.listing.findUnique({
      where: { id: params.id },
      select: { title: true, description: true, price: true, location: true, images: true, status: true },
    })
    if (!l) return { title: 'Listing' }
    const price = `€${Number(l.price).toLocaleString()}`
    const desc = (l.description || '').replace(/\s+/g, ' ').trim().slice(0, 155) || `${l.title} — ${price} in ${l.location}, on Grabitt.`
    const img = l.images?.[0]
    return {
      title: `${l.title} — ${price}`,
      description: desc,
      alternates: { canonical: `/listings/${params.id}` },
      robots: l.status === 'active' ? undefined : { index: false, follow: true },
      openGraph: {
        type: 'website',
        title: `${l.title} — ${price}`,
        description: desc,
        url: `/listings/${params.id}`,
        ...(img ? { images: [{ url: img }] } : {}),
      },
      twitter: {
        card: img ? 'summary_large_image' : 'summary',
        title: `${l.title} — ${price}`,
        description: desc,
        ...(img ? { images: [img] } : {}),
      },
    }
  } catch {
    return { title: 'Listing' }
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

// Product structured data so AI/search engines can read each listing as an
// offer (name, price, availability, image) and cite/recommend it.
export default async function ListingLayout({ params, children }: { params: { id: string }; children: React.ReactNode }) {
  let jsonLd: string | null = null
  try {
    const l = await prisma.listing.findUnique({
      where: { id: params.id },
      select: { title: true, description: true, price: true, location: true, images: true, status: true },
    })
    if (l) {
      jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: l.title,
        description: (l.description || '').replace(/\s+/g, ' ').trim().slice(0, 500),
        ...(l.images?.length ? { image: l.images } : {}),
        offers: {
          '@type': 'Offer',
          price: Number(l.price),
          priceCurrency: 'EUR',
          availability: l.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `${APP_URL}/listings/${params.id}`,
          areaServed: l.location,
        },
      })
    }
  } catch { /* non-fatal — page still renders */ }

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      {children}
    </>
  )
}
