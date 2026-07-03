import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const usersRouter = router({
  me: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } })
  ),

  profile: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.prisma.user.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          id: true, displayName: true, avatar: true,
          grade: true, salesCount: true, avgRating: true,
          isBusiness: true, businessVerified: true,
          createdAt: true,
        },
      })
    ),

  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(2).max(50).optional(),
      avatar: z.string().url().optional(),
      locale: z.enum(['en', 'es', 'de', 'da', 'sv', 'nl', 'fr', 'pt']).optional(),
      interests: z.array(z.string()).max(20).optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({ where: { id: ctx.user.id }, data: input })
    ),
})
