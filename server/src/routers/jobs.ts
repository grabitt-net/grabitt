import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const jobsRouter = router({
  // Candidate applies to a job. Free to apply; the application goes straight to
  // the employer (a JobApplication row) and notifies them. Idempotent per
  // (job, applicant) — re-applying just updates the cover note.
  apply: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), coverNote: z.string().max(2000).optional(), cvUrl: z.string().url().optional() }))
    .mutation(async ({ ctx, input }) => {
      const jl = await ctx.prisma.jobListing.findFirst({
        where: { listingId: input.listingId },
        include: { listing: { select: { title: true, sellerId: true } } },
      })
      if (!jl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' })
      if (jl.employerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot apply to your own job' })

      const application = await ctx.prisma.jobApplication.upsert({
        where: { jobListingId_applicantId: { jobListingId: jl.id, applicantId: ctx.user.id } },
        create: { jobListingId: jl.id, applicantId: ctx.user.id, coverNote: input.coverNote, cvUrl: input.cvUrl },
        update: { coverNote: input.coverNote, cvUrl: input.cvUrl },
      })
      await ctx.prisma.notification.create({
        data: {
          userId: jl.employerId,
          kind: 'system',
          title: '📩 New job application',
          body: `You received an application for "${jl.jobTitle}".`,
        },
      })
      return application
    }),

  // Whether the current user has already applied to this job (for the detail UI).
  hasApplied: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const jl = await ctx.prisma.jobListing.findFirst({ where: { listingId: input.listingId }, select: { id: true } })
      if (!jl) return { applied: false }
      const app = await ctx.prisma.jobApplication.findUnique({
        where: { jobListingId_applicantId: { jobListingId: jl.id, applicantId: ctx.user.id } },
        select: { id: true, status: true },
      })
      return { applied: !!app, status: app?.status ?? null }
    }),

  // Other active jobs from the same employer — powers the "More jobs from this
  // employer" strip on a job detail page.
  byEmployer: publicProcedure
    .input(z.object({ employerId: z.string().uuid(), excludeListingId: z.string().uuid().optional() }))
    .query(({ ctx, input }) =>
      ctx.prisma.jobListing.findMany({
        where: {
          employerId: input.employerId,
          listing: { status: 'active', ...(input.excludeListingId ? { id: { not: input.excludeListingId } } : {}) },
        },
        include: { listing: { select: { id: true, images: true, location: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      })
    ),

  // The candidate's own applications (for a future "My applications" view).
  myApplications: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.jobApplication.findMany({
      where: { applicantId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { jobListing: { include: { listing: { select: { id: true, location: true } } } } },
    })
  ),

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
      lat: z.number().optional(),
      lng: z.number().optional(),
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
          ...(input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : {}),
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
