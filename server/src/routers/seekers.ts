import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { scoreSuitability } from '../lib/suitability'
import { getStripe } from '../lib/stripe'
import { RECRUITMENT_PRICING } from '@grabitt/design-tokens'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://grabitt.vercel.app'

// The candidate database is an OPTIONAL add-on to an existing paid job advert.
// Searching and opening profiles are free; revealing a candidate's CV + contact
// is a €-charge (RECRUITMENT_PRICING.cvUnlockCents) tied to one of the
// employer's own live job adverts. No credits are used anywhere here.

// An employer may search only while they have a live, paid-for job advert. This
// returns those adverts (so the UI can tie each CV unlock to a specific role).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function liveJobsOf(prisma: any, employerId: string) {
  const now = new Date()
  return prisma.jobListing.findMany({
    where: {
      employerId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      listing: { status: 'active' },
    },
    select: { id: true, jobTitle: true },
    orderBy: { createdAt: 'desc' },
  }) as Promise<Array<{ id: string; jobTitle: string }>>
}

const workExperienceItem = z.object({
  title: z.string().max(120).default(''),
  employer: z.string().max(120).default(''),
  location: z.string().max(120).optional(),
  start: z.string().max(20).optional(),
  end: z.string().max(20).optional(),
  current: z.boolean().optional(),
  bullets: z.array(z.string().max(300)).max(10).optional(),
})
const educationItem = z.object({
  qualification: z.string().max(160).default(''),
  institution: z.string().max(160).default(''),
  start: z.string().max(20).optional(),
  end: z.string().max(20).optional(),
  status: z.string().max(40).optional(),
})

const profileInput = z.object({
  headline: z.string().max(120).optional(),
  sector: z.string().max(60).optional(),
  sectors: z.array(z.string().max(60)).max(12).optional(),
  roles: z.array(z.string().max(60)).max(40).optional(),
  experienceMonths: z.number().int().min(0).max(600).optional(),
  languages: z.array(z.string().max(40)).max(15).optional(),
  languageLevels: z.array(z.object({ language: z.string().max(40), level: z.string().max(20) })).max(15).optional(),
  hours: z.array(z.string().max(40)).max(6).optional(),
  availability: z.string().max(40).optional(),
  rightToWork: z.string().max(40).optional(),
  location: z.string().max(60).optional(),
  town: z.string().max(80).optional(),
  areaDetail: z.string().max(120).optional(),
  active: z.boolean().optional(),
  // CV content
  summary: z.string().max(2000).optional(),
  skills: z.array(z.string().max(60)).max(30).optional(),
  keyStrengths: z.array(z.string().max(60)).max(12).optional(),
  certifications: z.array(z.string().max(120)).max(15).optional(),
  workExperience: z.array(workExperienceItem).max(15).optional(),
  education: z.array(educationItem).max(10).optional(),
})

// Job-seeker profiles + the employer-facing Find Staff match/unlock flow.
export const seekersRouter = router({
  // The current user's own seeker profile (null if they haven't created one).
  myProfile: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.seekerProfile.findUnique({ where: { userId: ctx.user.id } })
  ),

  upsertProfile: protectedProcedure
    .input(profileInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.seekerProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          headline: input.headline ?? null,
          sector: input.sector ?? input.sectors?.[0] ?? null,
          sectors: input.sectors ?? (input.sector ? [input.sector] : []),
          roles: input.roles ?? [],
          experienceMonths: input.experienceMonths ?? 0,
          languages: input.languages ?? [],
          ...(input.languageLevels !== undefined && { languageLevels: input.languageLevels }),
          hours: input.hours ?? [],
          availability: input.availability ?? null,
          rightToWork: input.rightToWork ?? null,
          location: input.location ?? null,
          town: input.town ?? null,
          areaDetail: input.areaDetail ?? null,
          active: input.active ?? true,
          summary: input.summary ?? null,
          skills: input.skills ?? [],
          keyStrengths: input.keyStrengths ?? [],
          certifications: input.certifications ?? [],
          ...(input.workExperience !== undefined && { workExperience: input.workExperience }),
          ...(input.education !== undefined && { education: input.education }),
        },
        update: {
          ...(input.headline !== undefined && { headline: input.headline }),
          ...(input.sector !== undefined && { sector: input.sector }),
          // Keep the legacy single sector in step with the first selection, so
          // anything still reading it stays correct.
          ...(input.sectors !== undefined && { sectors: input.sectors, sector: input.sectors[0] ?? null }),
          ...(input.roles !== undefined && { roles: input.roles }),
          ...(input.experienceMonths !== undefined && { experienceMonths: input.experienceMonths }),
          ...(input.languages !== undefined && { languages: input.languages }),
          ...(input.languageLevels !== undefined && { languageLevels: input.languageLevels }),
          ...(input.hours !== undefined && { hours: input.hours }),
          ...(input.availability !== undefined && { availability: input.availability }),
          ...(input.rightToWork !== undefined && { rightToWork: input.rightToWork }),
          ...(input.location !== undefined && { location: input.location }),
          ...(input.town !== undefined && { town: input.town }),
          ...(input.areaDetail !== undefined && { areaDetail: input.areaDetail }),
          ...(input.active !== undefined && { active: input.active }),
          ...(input.summary !== undefined && { summary: input.summary }),
          ...(input.skills !== undefined && { skills: input.skills }),
          ...(input.keyStrengths !== undefined && { keyStrengths: input.keyStrengths }),
          ...(input.certifications !== undefined && { certifications: input.certifications }),
          ...(input.workExperience !== undefined && { workExperience: input.workExperience }),
          ...(input.education !== undefined && { education: input.education }),
        },
      })
    ),

  // Employer search: returns how many active seekers match the spec plus an
  // anonymised list. Contact details are withheld unless the employer has
  // already unlocked that candidate.
  // Can this account search the candidate database, and can it afford to? The
  // search itself is free; opening a profile costs a credit. Checked before the
  // criteria form is shown so nobody fills one in only to be refused.
  searchAccess: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { isBusiness: true, businessName: true },
    })
    const [viewed, liveJobs] = await Promise.all([
      ctx.prisma.candidateView.count({ where: { employerId: ctx.user.id } }),
      liveJobsOf(ctx.prisma, ctx.user.id),
    ])
    return {
      isBusiness: me.isBusiness,
      businessName: me.businessName,
      // Search is an add-on: allowed only with a live, paid-for job advert.
      hasLiveJob: liveJobs.length > 0,
      liveJobs,
      cvUnlockCents: RECRUITMENT_PRICING.cvUnlockCents,
      canSearch: me.isBusiness && liveJobs.length > 0,
      profilesViewed: viewed,
    }
  }),

  // Open a candidate's full profile. Charged once per candidate — revisiting is
  // free, so an employer isn't billed twice for the same person. Still no
  // contact details; those are the separate, dearer unlock.
  viewCandidate: protectedProcedure
    .input(z.object({ seekerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.seekerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: "That's your own profile" })

      const me = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { isBusiness: true },
      })
      if (!me.isBusiness) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Searching for staff is a Business account feature' })
      }
      // Opening a profile is free, but the database is only open to businesses
      // with a live, paid-for job advert.
      const liveJobs = await liveJobsOf(ctx.prisma, ctx.user.id)
      if (liveJobs.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'The candidate database is available while you have a live job advert. Post a job to search.' })
      }

      const profile = await ctx.prisma.seekerProfile.findUnique({
        where: { userId: input.seekerId },
        include: { user: { select: { avgRating: true, isVerified: true } } },
      })
      if (!profile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' })

      const already = await ctx.prisma.candidateView.findUnique({
        where: { employerId_seekerId: { employerId: ctx.user.id, seekerId: input.seekerId } },
      })

      // Opening a profile is free now — just record it once (for "profiles
      // opened" and so we never double-count).
      if (!already) {
        await ctx.prisma.candidateView.create({ data: { employerId: ctx.user.id, seekerId: input.seekerId } })
      }

      const unlocked = await ctx.prisma.candidateUnlock.findUnique({
        where: { employerId_seekerId: { employerId: ctx.user.id, seekerId: input.seekerId } },
      })

      // Everything except contact — that stays behind the unlock.
      return {
        seekerId: profile.userId,
        headline: profile.headline,
        summary: profile.summary,
        sectors: profile.sectors.length ? profile.sectors : (profile.sector ? [profile.sector] : []),
        roles: profile.roles,
        skills: profile.skills,
        keyStrengths: profile.keyStrengths,
        certifications: profile.certifications,
        languages: profile.languages,
        experienceMonths: profile.experienceMonths,
        hours: profile.hours,
        availability: profile.availability,
        rightToWork: profile.rightToWork,
        location: [profile.areaDetail, profile.town, profile.location].filter(Boolean).join(', '),
        nationality: profile.nationality,
        drives: profile.drives,
        hasCar: profile.hasCar,
        contactUnlockable: profile.contactUnlockable,
        workExperience: profile.workExperience,
        education: profile.education,
        rating: profile.user.avgRating,
        verified: profile.user.isVerified,
        alreadyCharged: !!already,
        contactUnlocked: !!unlocked,
        unlockCents: RECRUITMENT_PRICING.cvUnlockCents,
      }
    }),

  matchCandidates: protectedProcedure
    .input(z.object({
      sector: z.string().optional(),
      role: z.string().optional(),
      // What the employer is looking for — used to rank results by fit.
      skills: z.array(z.string()).optional(),
      experienceMonths: z.number().int().min(0).optional(),
      languages: z.array(z.string()).optional(),
      hours: z.array(z.string()).optional(),
      availability: z.array(z.string()).optional(),
      rightToWork: z.array(z.string()).optional(),
      location: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const me = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { isBusiness: true },
      })
      if (!me.isBusiness) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Searching for staff is a Business account feature' })
      }
      // The search is an optional add-on to a live, paid-for job advert.
      const liveJobs = await liveJobsOf(ctx.prisma, ctx.user.id)
      if (liveJobs.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'The candidate database is available while you have a live job advert. Post a job to search.' })
      }

      const where: Record<string, unknown> = {
        active: true,
        userId: { not: ctx.user.id }, // never match yourself
      }
      if (input.sector) where.OR = [{ sector: input.sector }, { sectors: { has: input.sector } }]
      if (input.role) where.roles = { has: input.role }
      if (input.experienceMonths) where.experienceMonths = { gte: input.experienceMonths }
      if (input.languages?.length) where.languages = { hasEvery: input.languages }
      if (input.hours?.length) where.hours = { hasSome: input.hours }
      if (input.availability?.length) where.availability = { in: input.availability }
      if (input.rightToWork?.length) where.rightToWork = { in: input.rightToWork }
      if (input.location?.length) where.location = { in: input.location }

      const [profiles, unlocks] = await Promise.all([
        ctx.prisma.seekerProfile.findMany({
          where,
          orderBy: [{ experienceMonths: 'desc' }, { createdAt: 'desc' }],
          take: 60,
          include: { user: { select: { avgRating: true } } },
        }),
        ctx.prisma.candidateUnlock.findMany({
          where: { employerId: ctx.user.id },
          select: { seekerId: true },
        }),
      ])
      const unlockedIds = new Set(unlocks.map(u => u.seekerId))
      // Profiles already paid for open again free.
      const views = await ctx.prisma.candidateView.findMany({
        where: { employerId: ctx.user.id },
        select: { seekerId: true },
      })
      const viewedIds = new Set(views.map(v => v.seekerId))

      // Fit against what this employer actually asked for. The same scorer used
      // when someone applies to an advert, with the search criteria standing in
      // for the advert — so it means "matches your search", not "good person".
      // It ranks; it never filters anybody out.
      const candidates = profiles.map(p => {
        const fit = scoreSuitability({
          job: { sector: input.sector ?? null, skills: input.skills ?? [], jobTitle: input.role ?? null },
          candidate: {
            sectors: p.sectors,
            sector: p.sector,
            roles: p.roles,
            skills: p.skills,
            languages: p.languages,
            experienceMonths: p.experienceMonths,
            availability: p.availability,
            hours: p.hours,
          },
        })
        return {
          seekerId: p.userId,
          headline: p.headline,
          sector: p.sector,
          sectors: p.sectors.length ? p.sectors : (p.sector ? [p.sector] : []),
          roles: p.roles,
          skills: p.skills.slice(0, 8),
          experienceMonths: p.experienceMonths,
          languages: p.languages,
          hours: p.hours,
          availability: p.availability,
          rightToWork: p.rightToWork,
          location: [p.areaDetail, p.town, p.location].filter(Boolean).join(', '),
          rating: p.user.avgRating,
          matchScore: fit.score,
          matchNotes: fit.notes,
          unlocked: unlockedIds.has(p.userId),
          viewed: viewedIds.has(p.userId),
        }
      }).sort((a, b) => b.matchScore - a.matchScore)

      return { count: candidates.length, candidates, cvUnlockCents: RECRUITMENT_PRICING.cvUnlockCents, liveJobs }
    }),

  // Reveal a candidate's CV + contact details. This is the one charged step of
  // the database add-on: €RECRUITMENT_PRICING.cvUnlockCents, paid via Stripe and
  // tied to one of the employer's own live job adverts. Idempotent — a candidate
  // already unlocked opens again free and returns their contact straight away.
  // The paid unlock record is created by the Stripe webhook (kind: cv_unlock).
  unlockCandidate: protectedProcedure
    .input(z.object({ seekerId: z.string().uuid(), jobListingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.seekerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: "That's your own profile" })

      const seeker = await ctx.prisma.user.findUnique({
        where: { id: input.seekerId },
        select: { id: true, displayName: true, email: true, phone: true, avatar: true, seekerProfile: true },
      })
      if (!seeker || !seeker.seekerProfile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' })

      // The candidate can switch off contact unlocking entirely.
      if (seeker.seekerProfile.contactUnlockable === false) {
        throw new TRPCError({ code: 'FORBIDDEN', message: "This candidate hasn't allowed their contact details to be unlocked." })
      }

      const already = await ctx.prisma.candidateUnlock.findUnique({
        where: { employerId_seekerId: { employerId: ctx.user.id, seekerId: input.seekerId } },
      })

      // Already unlocked — hand back the contact details, no charge.
      if (already) {
        const p = seeker.seekerProfile
        return {
          paid: false as const,
          unlocked: true as const,
          seekerId: seeker.id,
          name: seeker.displayName,
          email: seeker.email,
          phone: seeker.phone,
          avatar: seeker.avatar,
          headline: p.headline,
          sector: p.sector,
          roles: p.roles,
          experienceMonths: p.experienceMonths,
          languages: p.languages,
          availability: p.availability,
          location: p.location,
        }
      }

      // First unlock — the CV unlock must be tied to one of the employer's own
      // live, paid-for job adverts. Verify the advert belongs to them and is live.
      const job = await ctx.prisma.jobListing.findUnique({
        where: { id: input.jobListingId },
        select: { id: true, employerId: true, jobTitle: true, expiresAt: true, listing: { select: { status: true } } },
      })
      if (!job || job.employerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Choose one of your own job adverts to unlock this candidate for.' })
      }
      const jobLive = job.listing?.status === 'active' && (!job.expiresAt || job.expiresAt > new Date())
      if (!jobLive) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'That job advert is no longer live. Pick a live advert to unlock against.' })
      }

      const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, stripeCustomerId: true } })
      const session = await getStripe().checkout.sessions.create({
        mode: 'payment',
        ...(me.stripeCustomerId ? { customer: me.stripeCustomerId } : { customer_email: me.email ?? undefined }),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: RECRUITMENT_PRICING.cvUnlockCents, product_data: { name: `Grabitt — unlock candidate CV & contact (${job.jobTitle})` } } }],
        payment_intent_data: { metadata: { kind: 'cv_unlock', employerId: ctx.user.id, seekerId: input.seekerId, jobListingId: job.id } },
        success_url: `${appUrl()}/recruitment?unlocked=${input.seekerId}`,
        cancel_url: `${appUrl()}/recruitment?cancelled=1`,
      })
      if (!session.url) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not start checkout' })
      return { paid: true as const, unlocked: false as const, checkoutUrl: session.url }
    }),
})
