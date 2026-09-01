import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '@prisma/client'
import { router, publicProcedure, protectedProcedure, execProcedure } from '../trpc'
import { buildCvSnapshot } from '../lib/cvSnapshot'
import { overflowFeeCents } from '../lib/businessLimits'
import { scoreSuitability } from '../lib/suitability'
import { getStripe } from '../lib/stripe'
import { JOBS_PRICING } from '@grabitt/design-tokens'
import { applyPromo } from '../lib/discounts'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

// Employer-defined screening question shape.
const questionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(200),
  type: z.enum(['short', 'long', 'choice', 'boolean', 'number']),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(100)).max(12).optional(),
})

// A job advert never carries the employer's name publicly — browsers see the
// kind of establishment instead. The name is released to a candidate only once
// they're invited to interview. Applied at every public endpoint, so there is no
// route to it by listing, search or "more from this employer".
function publicEmployerName(j: { establishmentType?: string | null; sector?: string | null }): string {
  return j.establishmentType?.trim() || (j.sector?.trim() ? `${j.sector.trim()} employer` : 'Employer')
}

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

      // Snapshot the applicant's CV (from their SeekerProfile + account contact)
      // as it stands right now, so the recruiter sees exactly what was submitted.
      const [applicant, profile] = await Promise.all([
        ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { displayName: true, email: true, phone: true } }),
        ctx.prisma.seekerProfile.findUnique({ where: { userId: ctx.user.id } }),
      ])
      const cvSnapshot = buildCvSnapshot(applicant, profile as never) as unknown as Prisma.InputJsonValue

      // Suitability is scored here, once, against the advert as it stands. It
      // travels to the employer and is never returned to the applicant.
      const suitability = scoreSuitability({
        job: { sector: jl.sector, skills: jl.skills, jobTitle: jl.jobTitle, type: jl.type },
        candidate: {
          sectors: profile?.sectors ?? [],
          sector: profile?.sector ?? null,
          roles: profile?.roles ?? [],
          skills: profile?.skills ?? [],
          languages: input.languages ?? profile?.languages ?? [],
          experienceMonths: input.experienceMonths ?? profile?.experienceMonths ?? 0,
          availability: input.availability ?? profile?.availability ?? null,
          hours: profile?.hours ?? [],
        },
      })

      const data = {
        suitabilityScore: suitability.score,
        suitabilityNotes: suitability.notes as unknown as Prisma.InputJsonValue,
        coverNote: input.coverNote,
        cvUrl: input.cvUrl,
        cvSnapshot,
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
      }).then(rows => rows.map(r => ({
        ...r,
        company: publicEmployerName(r),
        employerNameWithheld: true,
      })))
    ),

  // The candidate's own applications (for a future "My applications" view).
  myApplications: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.jobApplication.findMany({
      where: { applicantId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      // Explicit — returning the whole row would hand the applicant their own
      // suitability score and the employer's private note.
      select: {
        id: true, status: true, coverNote: true, createdAt: true, updatedAt: true,
        jobListing: {
          select: {
            id: true, jobTitle: true, company: true, establishmentType: true,
            type: true, sector: true, salaryMin: true, salaryMax: true, salaryPeriod: true,
            listing: { select: { id: true, location: true } },
          },
        },
      },
    })

    // The employer's name is released to the candidate at the same point it is
    // released to the employer: an interview invitation.
    const KNOWS_EMPLOYER = new Set(['invited', 'arranged', 'offer', 'accepted', 'hired', 'rejected_post'])
    return rows.map(r => ({
      ...r,
      jobListing: {
        ...r.jobListing,
        company: KNOWS_EMPLOYER.has(r.status)
          ? r.jobListing.company
          : (r.jobListing.establishmentType ?? 'Employer'),
        employerRevealed: KNOWS_EMPLOYER.has(r.status),
      },
    }))
  }),

  list: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']).optional(),
      remote: z.boolean().optional(),
      minSalary: z.number().optional(),
      maxSalary: z.number().optional(),
      salaryPeriod: z.enum(['month', 'year', 'hour']).optional(),
      location: z.string().optional(),
      sector: z.string().optional(),
      // A skill the employer asked for, matched against the job's skills[].
      skill: z.string().optional(),
      // Only jobs posted within the last N days.
      postedWithinDays: z.number().optional(),
      // Only jobs starting on or before this date (ISO).
      startsBefore: z.string().optional(),
      sort: z.enum(['newest', 'salary_high', 'salary_low', 'soonest']).default('newest'),
      page: z.number().default(1),
    }))
    .query(({ ctx, input }) => {
      const orderBy =
        input.sort === 'salary_high' ? [{ salaryMax: 'desc' as const }, { createdAt: 'desc' as const }]
        : input.sort === 'salary_low' ? [{ salaryMin: 'asc' as const }, { createdAt: 'desc' as const }]
        : input.sort === 'soonest' ? [{ startDate: 'asc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }]

      const postedFrom = input.postedWithinDays
        ? new Date(Date.now() - input.postedWithinDays * 86400000)
        : undefined

      return ctx.prisma.jobListing.findMany({
        where: {
          ...(input.type && { type: input.type }),
          ...(input.remote !== undefined && { remote: input.remote }),
          ...(input.sector && { sector: { contains: input.sector, mode: 'insensitive' } }),
          ...(input.skill && { skills: { has: input.skill } }),
          ...(input.salaryPeriod && { salaryPeriod: input.salaryPeriod }),
          // Keep jobs whose top-of-range pay meets the floor, and whose bottom
          // stays under the ceiling.
          ...(input.minSalary && { salaryMax: { gte: input.minSalary } }),
          ...(input.maxSalary && { salaryMin: { lte: input.maxSalary } }),
          ...(input.startsBefore && { startDate: { lte: new Date(input.startsBefore) } }),
          // Searching by company name is deliberately absent: matching on a
          // hidden field would leak the employer by inference.
          ...(input.query && {
            OR: [
              { jobTitle: { contains: input.query, mode: 'insensitive' } },
              { sector: { contains: input.query, mode: 'insensitive' } },
              { establishmentType: { contains: input.query, mode: 'insensitive' } },
              { skills: { has: input.query } },
            ],
          }),
          listing: {
            status: 'active',
            ...(input.location && { location: { contains: input.location, mode: 'insensitive' } }),
            ...(postedFrom && { createdAt: { gte: postedFrom } }),
          },
        },
        include: { listing: true },
        orderBy,
        skip: (input.page - 1) * 20,
        take: 20,
      }).then(rows => rows.map(r => ({
        ...r,
        company: publicEmployerName(r),
        employerNameWithheld: true,
      })))
    }),

  // Distinct sectors of active jobs (+counts) — powers the sector filter.
  sectors: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.jobListing.findMany({
      where: { listing: { status: 'active' }, sector: { not: null } },
      select: { sector: true },
    })
    // Merge case-insensitively so one sector doesn't split across spellings.
    const byKey = new Map<string, { label: string; count: number }>()
    for (const r of rows) {
      const sec = r.sector?.trim()
      if (!sec) continue
      const key = sec.toLowerCase()
      const ex = byKey.get(key)
      if (ex) ex.count++
      else byKey.set(key, { label: sec, count: 1 })
    }
    return [...byKey.values()]
      .map(v => ({ sector: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector))
  }),

  // Distinct locations of active jobs (+counts) — powers the location filters,
  // which update automatically as jobs are posted.
  locations: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.jobListing.findMany({
      where: { listing: { status: 'active' } },
      select: { remote: true, listing: { select: { location: true } } },
    })
    // Merge locations case-insensitively ("maspalomas" and "Maspalomas" are one
    // place) and keep the best-cased label for each. Remote jobs are counted on
    // their own, not under whatever town happens to be on the record — a remote
    // role isn't a Las Palmas role.
    const byKey = new Map<string, { label: string; count: number }>()
    let remote = 0
    for (const r of rows) {
      if (r.remote) { remote++; continue }
      const loc = r.listing?.location?.trim()
      if (!loc) continue
      const key = loc.toLowerCase()
      const existing = byKey.get(key)
      if (existing) {
        existing.count++
        // Prefer the more-capitalised spelling as the display label.
        const caps = (v: string) => v.replace(/[^A-Z]/g, '').length
        if (caps(loc) > caps(existing.label)) existing.label = loc
      } else {
        byKey.set(key, { label: loc, count: 1 })
      }
    }
    const locations = [...byKey.values()]
      .map(v => ({ location: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location))
    return { locations, remote }
  }),

  // Post a Job — creates the base Listing (department=jobs) plus the JobListing
  // detail row in one transaction. The poster is the employer.
  create: protectedProcedure
    .input(z.object({
      jobTitle: z.string().min(3).max(120),
      company: z.string().min(1).max(120),
      // Shown publicly in place of the employer name.
      establishmentType: z.string().max(80).optional(),
      type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']),
      location: z.string().min(1).max(120),
      address: z.string().max(200).optional(),
      sector: z.string().max(80).optional(),
      // Structured matching data (canonical taxonomy) for candidate auto-matching.
      roles: z.array(z.string().max(140)).max(20).optional(),
      languages: z.array(z.string().max(40)).max(10).optional(),
      experienceMonths: z.number().int().min(0).max(600).optional(),
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
      discountCode: z.string().max(40).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only Business accounts may post job adverts.
      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { isBusiness: true, isPropertyAgent: true, email: true, stripeCustomerId: true } })
      if (me.isPropertyAgent && !me.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'Property agent accounts can only list property.' })
      if (!me.isBusiness) throw new TRPCError({ code: 'FORBIDDEN', message: 'A Business account is required to post jobs' })
      // Beyond the tier's monthly free allowance, a job advert is €29 (14 days).
      // The listing is created hidden until the fee is paid; the webhook publishes
      // it. Within allowance, it publishes immediately.
      let fee = await overflowFeeCents(ctx.prisma, ctx.user.id, 'jobs', JOBS_PRICING.perJobCents)
      const promo = fee > 0 ? await applyPromo(ctx.prisma, input.discountCode, ctx.user.id, 'job', fee) : { codeId: null, discountCents: 0, meta: {} as Record<string, string> }
      fee -= promo.discountCents
      const created = await ctx.prisma.listing.create({
        data: {
          sellerId: ctx.user.id,
          title: input.jobTitle,
          description: input.description || `${input.jobTitle} at ${input.company}.`,
          price: input.salaryMin ?? 0,
          department: 'jobs',
          condition: 'good',
          status: fee > 0 ? 'draft' : 'active',
          images: input.images ?? [],
          location: input.location,
          ...(input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : {}),
          jobListing: {
            create: {
              employerId: ctx.user.id,
              jobTitle: input.jobTitle,
              company: input.company,
              establishmentType: input.establishmentType,
              type: input.type,
              salaryMin: input.salaryMin,
              salaryMax: input.salaryMax,
              salaryPeriod: input.salaryPeriod,
              remote: input.remote,
              sector: input.sector,
              roles: input.roles ?? [],
              languages: input.languages ?? [],
              experienceMonths: input.experienceMonths,
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

      // Within the free allowance — published straight away.
      if (fee === 0) return created

      // Over allowance — take the €29 fee, then the webhook flips the listing to
      // active (kind: listing_publish).
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(me.stripeCustomerId ? { customer: me.stripeCustomerId } : { customer_email: me.email }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: fee, product_data: { name: `Grabitt job advert — ${input.jobTitle} (14 days)` } } }],
        payment_intent_data: { metadata: { kind: 'listing_publish', listingId: created.id, ...promo.meta } },
        success_url: `${appUrl()}/listings/${created.id}?published=1`,
        cancel_url: `${appUrl()}/jobs/new?cancelled=1`,
      })
      return { ...created, pendingPayment: true, checkoutUrl: session.url }
    }),

  // Edit a job advert you posted. Writes the parent Listing and the JobListing
  // detail together, mirroring create's field mapping so the two stay in step
  // (listing.title tracks jobTitle, listing.price tracks salaryMin).
  update: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      jobTitle: z.string().min(3).max(120).optional(),
      company: z.string().min(1).max(120).optional(),
      establishmentType: z.string().max(80).optional(),
      type: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']).optional(),
      location: z.string().min(1).max(120).optional(),
      address: z.string().max(200).nullable().optional(),
      sector: z.string().max(80).nullable().optional(),
      roles: z.array(z.string().max(140)).max(20).optional(),
      languages: z.array(z.string().max(40)).max(10).optional(),
      experienceMonths: z.number().int().min(0).max(600).nullable().optional(),
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
            ...(input.establishmentType !== undefined ? { establishmentType: input.establishmentType } : {}),
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.salaryMin !== undefined ? { salaryMin: input.salaryMin } : {}),
            ...(input.salaryMax !== undefined ? { salaryMax: input.salaryMax } : {}),
            ...(input.salaryPeriod !== undefined ? { salaryPeriod: input.salaryPeriod } : {}),
            ...(input.remote !== undefined ? { remote: input.remote } : {}),
            ...(input.sector !== undefined ? { sector: input.sector } : {}),
            ...(input.roles !== undefined ? { roles: input.roles } : {}),
            ...(input.languages !== undefined ? { languages: input.languages } : {}),
            ...(input.experienceMonths !== undefined ? { experienceMonths: input.experienceMonths } : {}),
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
    // Candidates this employer has unlocked (paid credits) — their identity is
    // revealed even before shortlisting.
    const unlocks = await ctx.prisma.candidateUnlock.findMany({
      where: { employerId: ctx.user.id },
      select: { seekerId: true },
    })
    const unlockedIds = new Set(unlocks.map(u => u.seekerId))
    // A candidate is identified to the employer once shortlisted/hired, or if
    // separately unlocked. Until then their PII is withheld — the "anonymous
    // until you shortlist" model.
    // Identity is released when the employer asks to meet the candidate. Up to
    // that point they're judged on the profile alone.
    const REVEALING = new Set(['invited', 'arranged', 'offer', 'accepted', 'hired', 'shortlisted', 'rejected_post'])
    const isRevealed = (status: string, applicantId: string) =>
      REVEALING.has(status) || unlockedIds.has(applicantId)

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
      applications: j.applications.map(a => {
        const revealed = isRevealed(a.status, a.applicant.id)
        return {
          id: a.id,
          status: a.status,
          coverNote: a.coverNote,
          employerNote: a.employerNote,
          applicantId: a.applicant.id,
          revealed,
          // Employer-only. Never returned on any applicant-facing endpoint.
          suitabilityScore: a.suitabilityScore,
          suitabilityNotes: a.suitabilityNotes,
          // Identity is anonymised until the candidate is revealed.
          applicant: revealed ? a.applicant.displayName : `Candidate ${a.applicant.id.slice(-4).toUpperCase()}`,
          createdAt: a.createdAt,
          // PII — only sent once revealed.
          fullName: revealed ? a.fullName : null,
          email: revealed ? a.email : null,
          phone: revealed ? a.phone : null,
          linkedinUrl: revealed ? a.linkedinUrl : null,
          // Non-identifying detail, always shown so the employer can assess fit.
          location: a.location,
          rightToWork: a.rightToWork,
          languages: a.languages,
          experienceMonths: a.experienceMonths,
          currentRole: a.currentRole,
          expectedSalary: a.expectedSalary,
          availability: a.availability,
          cvUrl: a.cvUrl,
          answers: (a.answers ?? {}) as Record<string, string | number | boolean>,
        }
      }),
    }))
  }),

  // Employer moves an applicant along the hiring pipeline. Rejections require a
  // reason note (mirrors the V20 flow). Only the job's owner may change status.
  // The recruiter's private note on a candidate. Never shown to the applicant.
  setApplicationNote: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid(), note: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.jobApplication.findUnique({
        where: { id: input.applicationId },
        select: { id: true, jobListing: { select: { employerId: true } } },
      })
      if (!app) throw new TRPCError({ code: 'NOT_FOUND' })
      if (app.jobListing.employerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This is not your job listing' })
      }
      await ctx.prisma.jobApplication.update({
        where: { id: app.id },
        data: { employerNote: input.note.trim() || null },
      })
      return { ok: true }
    }),

  setApplicationStatus: protectedProcedure
    .input(z.object({
      applicationId: z.string().uuid(),
      status: z.enum([
        'applied', 'viewed', 'shortlisted', 'rejected', 'hired',
        'invited', 'arranged', 'offer', 'accepted', 'rejected_pre', 'rejected_post',
      ]),
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
      const isRejection = input.status === 'rejected' || input.status === 'rejected_pre' || input.status === 'rejected_post'
      if (isRejection && !input.note?.trim()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A reason note is required when rejecting a candidate' })
      }

      await ctx.prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          status: input.status,
          // A note given with the move is kept; rejections require one. Moving a
          // candidate on without a note leaves any existing note alone rather
          // than wiping the recruiter's own record of the conversation.
          ...(input.note?.trim() ? { employerNote: input.note.trim() } : {}),
        },
      })

      // Let the applicant know their application progressed.
      const MESSAGE: Record<string, string> = {
        shortlisted: `You've been shortlisted for "${app.jobListing.jobTitle}".`,
        invited: `You've been invited to interview for "${app.jobListing.jobTitle}".`,
        arranged: `Your interview for "${app.jobListing.jobTitle}" has been arranged.`,
        offer: `You've been offered the role of "${app.jobListing.jobTitle}".`,
        accepted: `Your acceptance of "${app.jobListing.jobTitle}" is confirmed.`,
        hired: `Great news — you've been hired for "${app.jobListing.jobTitle}"!`,
        rejected: `Your application for "${app.jobListing.jobTitle}" wasn't successful this time.`,
        rejected_pre: `Your application for "${app.jobListing.jobTitle}" wasn't successful this time.`,
        rejected_post: `Thank you for interviewing for "${app.jobListing.jobTitle}" — you weren't successful this time.`,
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
