import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

// Credits an employer spends to reveal one candidate's contact details.
const UNLOCK_COST = 10

const profileInput = z.object({
  headline: z.string().max(120).optional(),
  sector: z.string().max(60).optional(),
  roles: z.array(z.string().max(60)).max(10).optional(),
  experienceMonths: z.number().int().min(0).max(600).optional(),
  languages: z.array(z.string().max(40)).max(15).optional(),
  hours: z.array(z.string().max(40)).max(6).optional(),
  availability: z.string().max(40).optional(),
  rightToWork: z.string().max(40).optional(),
  location: z.string().max(60).optional(),
  active: z.boolean().optional(),
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
          sector: input.sector ?? null,
          roles: input.roles ?? [],
          experienceMonths: input.experienceMonths ?? 0,
          languages: input.languages ?? [],
          hours: input.hours ?? [],
          availability: input.availability ?? null,
          rightToWork: input.rightToWork ?? null,
          location: input.location ?? null,
          active: input.active ?? true,
        },
        update: {
          ...(input.headline !== undefined && { headline: input.headline }),
          ...(input.sector !== undefined && { sector: input.sector }),
          ...(input.roles !== undefined && { roles: input.roles }),
          ...(input.experienceMonths !== undefined && { experienceMonths: input.experienceMonths }),
          ...(input.languages !== undefined && { languages: input.languages }),
          ...(input.hours !== undefined && { hours: input.hours }),
          ...(input.availability !== undefined && { availability: input.availability }),
          ...(input.rightToWork !== undefined && { rightToWork: input.rightToWork }),
          ...(input.location !== undefined && { location: input.location }),
          ...(input.active !== undefined && { active: input.active }),
        },
      })
    ),

  // Employer search: returns how many active seekers match the spec plus an
  // anonymised list. Contact details are withheld unless the employer has
  // already unlocked that candidate.
  matchCandidates: protectedProcedure
    .input(z.object({
      sector: z.string().optional(),
      role: z.string().optional(),
      experienceMonths: z.number().int().min(0).optional(),
      languages: z.array(z.string()).optional(),
      hours: z.array(z.string()).optional(),
      availability: z.array(z.string()).optional(),
      rightToWork: z.array(z.string()).optional(),
      location: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        active: true,
        userId: { not: ctx.user.id }, // never match yourself
      }
      if (input.sector) where.sector = input.sector
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

      // Anonymised cards — no name/email/phone here.
      const candidates = profiles.map(p => ({
        seekerId: p.userId,
        headline: p.headline,
        sector: p.sector,
        roles: p.roles,
        experienceMonths: p.experienceMonths,
        languages: p.languages,
        hours: p.hours,
        availability: p.availability,
        rightToWork: p.rightToWork,
        location: p.location,
        rating: p.user.avgRating,
        unlocked: unlockedIds.has(p.userId),
      }))

      return { count: candidates.length, candidates, unlockCost: UNLOCK_COST }
    }),

  // Spend credits to reveal a candidate's contact details. Idempotent: if this
  // employer already unlocked the seeker, it's free.
  unlockCandidate: protectedProcedure
    .input(z.object({ seekerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.seekerId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: "That's your own profile" })

      const seeker = await ctx.prisma.user.findUnique({
        where: { id: input.seekerId },
        select: { id: true, displayName: true, email: true, phone: true, avatar: true, seekerProfile: true },
      })
      if (!seeker || !seeker.seekerProfile) throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' })

      const already = await ctx.prisma.candidateUnlock.findUnique({
        where: { employerId_seekerId: { employerId: ctx.user.id, seekerId: input.seekerId } },
      })

      if (!already) {
        const me = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { credits: true } })
        if (me.credits < UNLOCK_COST) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `You need ${UNLOCK_COST} credits to unlock this candidate` })
        }
        const newBalance = me.credits - UNLOCK_COST
        await ctx.prisma.$transaction([
          ctx.prisma.user.update({ where: { id: ctx.user.id }, data: { credits: newBalance } }),
          ctx.prisma.creditEvent.create({
            data: { userId: ctx.user.id, kind: 'admin_adjustment', delta: -UNLOCK_COST, balance: newBalance, note: `Unlocked candidate ${input.seekerId}` },
          }),
          ctx.prisma.candidateUnlock.create({ data: { employerId: ctx.user.id, seekerId: input.seekerId } }),
        ])
        // Let the seeker know an employer is interested.
        await ctx.prisma.notification.create({
          data: { userId: input.seekerId, kind: 'system', title: '👀 An employer unlocked your profile', body: 'A registered employer has viewed your work profile and contact details.', actionUrl: '/account' },
        })
      }

      const p = seeker.seekerProfile
      return {
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
    }),
})
