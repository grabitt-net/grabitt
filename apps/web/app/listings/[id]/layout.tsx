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

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
