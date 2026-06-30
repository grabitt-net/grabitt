import { z } from 'zod'
import { router, execProcedure } from '../trpc'

export const financialsRouter = router({
  summary: execProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.from)
      const to = new Date(input.to)

      const [transactions, members, disputes] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { createdAt: { gte: from, lte: to } },
          _sum: { amount: true, platformFee: true },
          _count: true,
        }),
        ctx.prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
        ctx.prisma.dispute.count({ where: { createdAt: { gte: from, lte: to } } }),
      ])

      return {
        gmv: Number(transactions._sum.amount ?? 0),
        revenue: Number(transactions._sum.platformFee ?? 0),
        transactionCount: transactions._count,
        newMembers: members,
        disputes,
      }
    }),
})
