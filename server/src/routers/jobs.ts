import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'

// Employer-defined screening question shape.
const questionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(200),
  type: z.enum(['short', 'long', 'choice', 'boolean', 'number']),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(100)).max(12).optional(),
})

export const jobsRouter = router({
  // Candidate applies to a job. Free to apply; the application goes straight to
  // the employer (a JobApplication row) and notifies them. Idempotent per
  // (job, applicant) — re-applying just updates the cover note.
  applyToJob: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      coverNote: z.string().max(2000).optional(),
      cvUrl: z.string().max(300).optional(), // private storage path in the `cvs` bucket
      // Structured recruitment data.
      fullName: z.string().max(120).optional(),
      email: z.string().email().max(160).optional(),
      phone: z.string().max(40).optional(),
      location: z.string().max(120).optional(),
      rightToWork: z.string().max(60).optional(),
      languages: z.array(z.string().max(40)).max(15).optional(),
      experienceMonths: z.number().int().min(0).max(720).optional(),
      currentRole: z.string().max(120).optional(),
      expectedSalary: z.number().int().min(0).max(9_999_999).optional(),
      availability: z.string().max(60).optional(),
      linkedinUrl: z.string().url().max(200).optional(),
      // Answers to the employer's screening questions, keyed by question id.
      answers: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
      dataConsent: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const jl = await ctx.prisma.jobListing.findFirst({
        where: { listingId: input.listingId },
        include: { listing: { select: { title: true, sellerId: true } } },
      })
      if (!jl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' })
      if (jl.employerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot apply to your own job' })

      // Validate required screening questions were answered.
      const questions = (jl.applicationQuestions as { id: string; label: string; required: boolean }[] | null) ?? []
      for (const q of questions) {
        const a = input.answers?.[q.id]
        if (q.required && (a === undefined || a === '' || a === null)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Please answer: ${q.label}` })
        }
      }

      const data = {
        coverNote: input.coverNote,
        cvUrl: input.cvUrl,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        location: input.location,
        rightToWork: input.rightToWork,
        languages: input.languages ?? [],
        experienceMonths: input.experienceMonths,
        currentRole: input.currentRole,
        expectedSalary: input.expectedSalary,
        availability: input.availability,
        linkedinUrl: input.linkedinUrl,
        answers: input.answers ?? undefined,
        dataConsent: input.dataConsent,
      }
      const application = await ctx.prisma.jobApplication.upsert({
        where: { jobListingId_applicantId: { jobListingId: jl.id, applicantId: ctx.user.id } },
        create: { jobListingId: jl.id, applicantId: ctx.user.id, ...data },
        update: data,
      })

      // Harvest the standard data into the applicant's SeekerProfile so it's
      // reusable across applications and searchable via Find Staff.
      if (input.dataConsent) {
        await ctx.prisma.seekerProfile.upsert({
          where: { userId: ctx.user.id },
          create: {
            userId: ctx.user.id,
            headline: input.currentRole ?? null,
            languages: input.languages ?? [],
            experienceMonths: input.experienceMonths ?? 0,
            availability: input.availability ?? null,
            rightToWork: input.rightToWork ?? null,
            location: input.location ?? null,
            active: false, // opt-in to Find Staff separately
          },
          update: {
            ...(input.currentRole ? { headline: input.currentRole } : {}),
            ...(input.languages?.length ? { languages: input.languages } : {}),
            ...(input.experienceMonths !== undefined ? { experienceMonths: input.experienceMonths } : {}),
            ...(input.availability ? { availability: input.availability } : {}),
            ...(input.rightToWork ? { rightToWork: input.rightToWork } : {}),
            ...(input.location ? { location: input.location } : {}),
          },
        })
      }

      await ctx.prisma.notification.create({
        data: {
          userId: jl.employerId,
          kind: 'system',
          title: '📩 New job application',
          body: `You received an application for "${jl.jobTitle}".`,
          actionUrl: '/employers',
        },
      })
      return application
    }),

  // Everything the Apply form needs: the job's screening questions + prefill
  // data from the applicant's profile / prior application.
  applyInfo: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const jl = await ctx.prisma.jobListing.findFirst({
        where: { listingId: input.listingId },
        select: { id: true, jobTitle: true, applicationQuestions: true },
      })
      if (!jl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' })

      const [user, profile, prior] = await Promise.all([
        ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { displayName: true, email: true, phone: true } }),
        ctx.prisma.seekerProfile.findUnique({ where: { userId: ctx.user.id } }),
        ctx.prisma.jobApplication.findUnique({
          where: { jobListingId_applicantId: { jobListingId: jl.id, applicantId: ctx.user.id } },
        }),
      ])

      // Prefer prior application, then profile, then account basics.
      const prefill = {
        fullName: prior?.fullName ?? user?.displayName ?? '',
        email: prior?.email ?? user?.email ?? '',
        phone: prior?.phone ?? user?.phone ?? '',
        location: prior?.location ?? profile?.location ?? '',
        rightToWork: prior?.rightToWork ?? profile?.rightToWork ?? '',
        languages: prior?.languages?.length ? prior.languages : (profile?.languages ?? []),
        experienceMonths: prior?.experienceMonths ?? profile?.experienceMonths ?? 0,
        currentRole: prior?.currentRole ?? profile?.headline ?? '',
        expectedSalary: prior?.expectedSalary ?? null,
        availability: prior?.availability ?? profile?.availability ?? '',
        linkedinUrl: prior?.linkedinUrl ?? '',
        coverNote: prior?.coverNote ?? '',
        cvUrl: prior?.cvUrl ?? '',
        answers: (prior?.answers as Record<string, unknown> | null) ?? {},
      }
      return { jobTitle: jl.jobTitle, questions: (jl.applicationQuestions ?? []) as unknown[], alreadyApplied: !!prior, prefill }
    }),

  // Employer edits the screening questions on one of their job listings.
  setJobQuestions: protectedProcedure
    .input(z.object({ listingId: z.string().uuid(), questions: z.array(questionSchema).max(15) }))
    .mutation(async ({ ctx, input }) => {
      const jl = await ctx.prisma.jobListing.findFirst({ where: { listingId: input.listingId }, select: { id: true, employerId: true } })
      if (!jl) throw new TRPCError({ code: 'NOT_FOUND' })
      if (jl.employerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'This is not your job listing' })
      await ctx.prisma.jobListing.update({ where: { id: jl.id }, data: { applicationQuestions: input.questions } })
      return { ok: true }
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
      applicationQuestions: z.array(questionSchema).max(15).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only Business accounts may post job adverts.
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true } })
      if (!me.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'A Business account is required to post jobs' })
      return ctx.prisma.listing.create({
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
              applicationQuestions: input.applicationQuestions ?? undefined,
            },
          },
        },
        include: { jobListing: true },
      })
    }),

  // Edit a job advert you posted. Writes the parent Listing and the JobListing
  // detail together, mirroring create's field mapping so the two stay in step
  // (listing.title tracks jobTitle, listing.price tracks salaryMin).
  update: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      jobTitle: z.string().min(3).max(120).optional(),
      company: z.string().min(1).max(120).optional(),
      type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']).optional(),
      location: z.string().min(1).max(120).optional(),
      address: z.string().max(200).nullable().optional(),
      sector: z.string().max(80).nullable().optional(),
      description: z.string().max(4000).optional(),
      salaryMin: z.number().min(0).nullable().optional(),
      salaryMax: z.number().min(0).nullable().optional(),
      salaryPeriod: z.enum(['month', 'year', 'hour']).optional(),
      payments: z.number().int().min(0).max(20).nullable().optional(),
      overtime: z.boolean().optional(),
      tips: z.boolean().optional(),
      remote: z.boolean().optional(),
      hours: z.string().max(120).nullable().optional(),
      startDate: z.string().nullable().optional(),
      images: z.array(z.string().url()).max(8).optional(),
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
      applicationQuestions: z.array(questionSchema).max(15).optional(),
      // On the model since the start but never exposed anywhere — no create
      // form or edit path ever set them.
      skills: z.array(z.string().max(40)).max(20).optional(),
      applyUrl: z.string().url().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({
        where: { id: input.listingId },
        include: { jobListing: true },
      })
      if (listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the employer can edit this job' })
      if (!listing.jobListing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This listing is not a job advert' })

      const set = <T,>(v: T | undefined, fallback: T) => (v === undefined ? fallback : v)
      const jobTitle = set(input.jobTitle, listing.jobListing.jobTitle)

      await ctx.prisma.$transaction([
        ctx.prisma.listing.update({
          where: { id: listing.id },
          data: {
            title: jobTitle,
            ...(input.description !== undefined ? { description: input.description || jobTitle } : {}),
            ...(input.salaryMin !== undefined ? { price: input.salaryMin ?? 0 } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.images !== undefined ? { images: input.images } : {}),
            ...(input.lat !== undefined ? { lat: input.lat } : {}),
            ...(input.lng !== undefined ? { lng: input.lng } : {}),
          },
        }),
        ctx.prisma.jobListing.update({
          where: { id: listing.jobListing.id },
          data: {
            jobTitle,
            ...(input.company !== undefined ? { company: input.company } : {}),
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.salaryMin !== undefined ? { salaryMin: input.salaryMin } : {}),
            ...(input.salaryMax !== undefined ? { salaryMax: input.salaryMax } : {}),
            ...(input.salaryPeriod !== undefined ? { salaryPeriod: input.salaryPeriod } : {}),
            ...(input.remote !== undefined ? { remote: input.remote } : {}),
            ...(input.sector !== undefined ? { sector: input.sector } : {}),
            ...(input.address !== undefined ? { address: input.address } : {}),
            ...(input.hours !== undefined ? { hours: input.hours } : {}),
            ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
            ...(input.payments !== undefined ? { payments: input.payments } : {}),
            ...(input.overtime !== undefined ? { overtime: input.overtime } : {}),
            ...(input.tips !== undefined ? { tips: input.tips } : {}),
            ...(input.applicationQuestions !== undefined ? { applicationQuestions: input.applicationQuestions } : {}),
            ...(input.skills !== undefined ? { skills: input.skills } : {}),
            ...(input.applyUrl !== undefined ? { applyUrl: input.applyUrl } : {}),
            ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
          },
        }),
      ])
      return { ok: true, id: listing.id }
    }),

  // Employer's applications board: their job listings with applicants. Powers
  // the Employer Dashboard (stats, listing cards, per-applicant pipeline).
  employerApplications: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await ctx.prisma.jobListing.findMany({
      where: { employerId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, status: true, createdAt: true, images: true } },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: { applicant: { select: { id: true, displayName: true } } },
        },
      },
    })
    return jobs.map(j => ({
      id: j.id,
      listingId: j.listingId,
      jobTitle: j.jobTitle,
      company: j.company,
      type: j.type,
      listingStatus: j.listing.status,
      postedAt: j.listing.createdAt,
      image: j.listing.images[0] ?? null,
      questions: (j.applicationQuestions ?? []) as { id: string; label: string }[],
      applications: j.applications.map(a => ({
        id: a.id,
        status: a.status,
        coverNote: a.coverNote,
        employerNote: a.employerNote,
        applicantId: a.applicant.id,
        applicant: a.applicant.displayName,
        createdAt: a.createdAt,
        // Full application detail for the employer.
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        location: a.location,
        rightToWork: a.rightToWork,
        languages: a.languages,
        experienceMonths: a.experienceMonths,
        currentRole: a.currentRole,
        expectedSalary: a.expectedSalary,
        availability: a.availability,
        linkedinUrl: a.linkedinUrl,
        cvUrl: a.cvUrl,
        answers: (a.answers ?? {}) as Record<string, string | number | boolean>,
      })),
    }))
  }),

  // Employer moves an applicant along the hiring pipeline. Rejections require a
  // reason note (mirrors the V20 flow). Only the job's owner may change status.
  setApplicationStatus: protectedProcedure
    .input(z.object({
      applicationId: z.string().uuid(),
      status: z.enum(['applied', 'viewed', 'shortlisted', 'rejected', 'hired']),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.jobApplication.findUnique({
        where: { id: input.applicationId },
        include: { jobListing: { select: { employerId: true, jobTitle: true, listingId: true } } },
      })
      if (!app) throw new TRPCError({ code: 'NOT_FOUND' })
      if (app.jobListing.employerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This is not your job listing' })
      }
      if (input.status === 'rejected' && !input.note?.trim()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A reason note is required when rejecting a candidate' })
      }

      await ctx.prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          status: input.status,
          // Keep the rejection reason; clear it when moving back into the pipeline.
          employerNote: input.status === 'rejected' ? input.note!.trim() : null,
        },
      })

      // Let the applicant know their application progressed.
      const MESSAGE: Record<string, string> = {
        shortlisted: `You've been shortlisted for "${app.jobListing.jobTitle}".`,
        hired: `Great news — you've been hired for "${app.jobListing.jobTitle}"!`,
        rejected: `Your application for "${app.jobListing.jobTitle}" wasn't successful this time.`,
      }
      if (MESSAGE[input.status]) {
        await ctx.prisma.notification.create({
          data: { userId: app.applicantId, kind: 'system', title: '💼 Application update', body: MESSAGE[input.status], actionUrl: `/listings/${app.jobListing.listingId}` },
        })
      }
      return { ok: true, status: input.status }
    }),

  // Exec suite: every job listing on the platform, for admin monitoring.
  adminList: execProcedure
    .input(z.object({ status: z.enum(['all', 'active', 'expired']).default('all') }).optional())
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? 'all'
      const rows = await ctx.prisma.jobListing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          listing: {
            select: {
              id: true, status: true, location: true, createdAt: true, viewCount: true,
              seller: { select: { id: true, displayName: true, email: true, isBusiness: true } },
            },
          },
          _count: { select: { applications: true } },
        },
      })
      return rows
        .filter(r => status === 'all' || r.listing.status === status)
        .map(r => ({
          id: r.id,
          listingId: r.listingId,
          jobTitle: r.jobTitle,
          company: r.company,
          type: r.type,
          sector: r.sector,
          salaryMin: r.salaryMin ? Number(r.salaryMin) : null,
          salaryMax: r.salaryMax ? Number(r.salaryMax) : null,
          status: r.listing.status,
          location: r.listing.location,
          createdAt: r.listing.createdAt,
          views: r.listing.viewCount,
          applicants: r._count.applications,
          employer: r.listing.seller.displayName,
          employerEmail: r.listing.seller.email,
          employerIsBusiness: r.listing.seller.isBusiness,
        }))
    }),
})
