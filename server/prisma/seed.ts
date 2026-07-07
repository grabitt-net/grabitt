import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=800&h=600&fit=crop&q=60&auto=format`

// Demo seller/employer that owns the seeded listings. Deterministic id so the
// seed is idempotent (safe to re-run).
const DEMO = {
  id: 'seed-demo-seller',
  supabaseId: 'seed-demo-seller',
  email: 'seed-seller@grabitt.net',
  displayName: 'Grabitt Demo',
}

const JOBS = [
  { id: 'seed-job-1', title: 'Bar Staff Needed', company: 'The Irish Rover', location: 'Playa del Inglés', type: 'full_time', min: 1200, max: 1400, remote: false, img: IMG('photo-1514933651103-005eec06c04b') },
  { id: 'seed-job-2', title: 'Chef — Italian Restaurant', company: 'La Trattoria', location: 'Maspalomas', type: 'full_time', min: 1600, max: 1900, remote: false, img: IMG('photo-1577219491135-ce391730fb2c') },
  { id: 'seed-job-3', title: 'Housekeeper (Part Time)', company: 'Hotel Gran Canaria', location: 'Las Palmas', type: 'part_time', min: 800, max: 900, remote: false, img: IMG('photo-1582719478250-c89cae4dc85b') },
  { id: 'seed-job-4', title: 'Delivery Driver', company: 'FastDeliver GC', location: 'Vecindario', type: 'contract', min: 1100, max: null, remote: false, img: IMG('photo-1526367790999-0150786686a2') },
  { id: 'seed-job-5', title: 'Web Developer — Remote', company: 'TechGC', location: 'Remote', type: 'contract', min: 2400, max: 2800, remote: true, img: IMG('photo-1517694712202-14dd9538aa97') },
]

const PROPS = [
  { id: 'seed-prop-1', title: 'Luxury 2-Bed Apartment', location: 'Playa del Inglés', type: 'sale', price: 185000, beds: 2, baths: 1, m2: 85, pool: true, garage: false, img: IMG('photo-1502672260266-1c1ef2d93688') },
  { id: 'seed-prop-2', title: 'Villa with Sea View', location: 'Mogán', type: 'sale', price: 380000, beds: 4, baths: 3, m2: 220, pool: true, garage: true, img: IMG('photo-1613490493576-7fde63acd811') },
  { id: 'seed-prop-3', title: 'Studio to Rent', location: 'Las Palmas', type: 'rent', price: 550, beds: 0, baths: 1, m2: 38, pool: false, garage: false, img: IMG('photo-1522708323590-d24dbb6b0267') },
  { id: 'seed-prop-4', title: '2-Bed Bungalow', location: 'Maspalomas', type: 'rent', price: 950, beds: 2, baths: 1, m2: 90, pool: false, garage: true, img: IMG('photo-1568605114967-8130f3a36994') },
  { id: 'seed-prop-5', title: 'Holiday Apartment', location: 'Puerto Rico', type: 'holiday', price: 700, beds: 1, baths: 1, m2: 45, pool: true, garage: false, img: IMG('photo-1560448204-e02f11c3d0e2') },
]

async function main() {
  const seller = await prisma.user.upsert({
    where: { id: DEMO.id },
    update: {},
    create: { ...DEMO, grade: 'grabber', isBusiness: true },
  })

  for (const j of JOBS) {
    await prisma.listing.upsert({
      where: { id: j.id },
      update: {},
      create: {
        id: j.id, sellerId: seller.id, title: j.title,
        description: `${j.title} at ${j.company} in ${j.location}. Apply through Grabitt.`,
        price: j.min ?? 0, department: 'jobs', condition: 'good', status: 'active',
        images: [j.img], location: j.location,
      },
    })
    await prisma.jobListing.upsert({
      where: { listingId: j.id },
      update: {},
      create: {
        listingId: j.id, employerId: seller.id, jobTitle: j.title, company: j.company,
        type: j.type as never, salaryMin: j.min ?? undefined, salaryMax: j.max ?? undefined, remote: j.remote,
      },
    })
  }

  for (const p of PROPS) {
    await prisma.listing.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id, sellerId: seller.id, title: p.title,
        description: `${p.title} in ${p.location}. Contact the agent to arrange a viewing.`,
        price: p.price, department: 'property', condition: 'good', status: 'active',
        images: [p.img], location: p.location,
      },
    })
    await prisma.propertyListing.upsert({
      where: { listingId: p.id },
      update: {},
      create: {
        listingId: p.id, type: p.type as never, bedrooms: p.beds, bathrooms: p.baths,
        m2: p.m2, hasPool: p.pool, hasGarage: p.garage,
      },
    })
  }

  console.log(`Seeded ${JOBS.length} jobs and ${PROPS.length} properties (seller: ${seller.displayName}).`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
