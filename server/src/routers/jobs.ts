import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const jobsRouter = router({
  list: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']).optional(),
      remote: z.boolean().optional(),
      minSalary: z.number().optional(),
      location: z.string().optional(),
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) =>
      ctx.prisma.jobListing.findMany({
        where: {
          ...(input.type && { type: input.type }),
          ...(input.remote !== undefined && { remote: input.remote }),
          // Keep jobs whose top-of-range pay meets the threshold.
          ...(input.minSalary && { salaryMax: { gte: input.minSalary } }),
          ...(input.query && {
            OR: [
              { jobTitle: { contains: input.query, mode: 'insensitive' } },
              { company: { contains: input.query, mode: 'insensitive' } },
            ],
          }),
          listing: {
            status: 'active',
            ...(input.location && { location: { contains: input.location, mode: 'insensitive' } }),
          },
        },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * 20,
        take: 20,
      })
    ),

  // Distinct locations of active jobs (+counts) — powers the location filters,
  // which update automatically as jobs are posted.
  locations: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.jobListing.findMany({
      where: { listing: { status: 'active' } },
      select: { listing: { select: { location: true } } },
    })
    const counts = new Map<string, number>()
    for (const r of rows) {
      const loc = r.listing?.location?.trim()
      if (loc) counts.set(loc, (counts.get(loc) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location))
  }),

  // Post a Job — creates the base Listing (department=jobs) plus the JobListing
  // detail row in one transaction. The poster is the employer.
  create: protectedProcedure
    .input(z.object({
      jobTitle: z.string().min(3).max(120),
      company: z.string().min(1).max(120),
      type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']),
      location: z.string().min(1).max(120),
      address: z.string().max(200).optional(),
      sector: z.string().max(80).optional(),
      description: z.string().max(4000).optional(),
      salaryMin: z.number().min(0).optional(),
      salaryMax: z.number().min(0).optional(),
      salaryPeriod: z.enum(['month', 'year', 'hour']).default('month'),
      payments: z.number().int().min(0).max(20).optional(),
      overtime: z.boolean().default(false),
      tips: z.boolean().default(false),
      remote: z.boolean().default(false),
      hours: z.string().max(120).optional(),
      startDate: z.string().optional(),
      images: z.array(z.string().url()).max(8).optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.listing.create({
        data: {
          sellerId: ctx.user.id,
          title: input.jobTitle,
          description: input.description || `${input.jobTitle} at ${input.company}.`,
          price: input.salaryMin ?? 0,
          department: 'jobs',
          condition: 'good',
          status: 'active',
          images: input.images ?? [],
          location: input.location,
          jobListing: {
            create: {
              employerId: ctx.user.id,
              jobTitle: input.jobTitle,
              company: input.company,
              type: input.type,
              salaryMin: input.salaryMin,
              salaryMax: input.salaryMax,
              salaryPeriod: input.salaryPeriod,
              remote: input.remote,
              sector: input.sector,
              address: input.address,
              hours: input.hours,
              startDate: input.startDate ? new Date(input.startDate) : undefined,
              payments: input.payments,
              overtime: input.overtime,
              tips: input.tips,
            },
          },
        },
        include: { jobListing: true },
      })
    ),

  // Employer's applications board: their job listings with applicants.
  employerApplications: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await ctx.prisma.jobListing.findMany({
      where: { employerId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          include: { applicant: { select: { id: true, displayName: true } } },
        },
      },
    })
    return jobs.map(j => ({
      id: j.id,
      jobTitle: j.jobTitle,
      company: j.company,
      applications: j.applications.map(a => ({
        id: a.id,
        status: a.status,
        coverNote: a.coverNote,
        applicant: a.applicant.displayName,
        createdAt: a.createdAt,
      })),
    }))
  }),
})
