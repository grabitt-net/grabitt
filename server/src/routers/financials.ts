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

  // Completed transactions for the current calendar year, powering the Forecast
  // view's monthly marketplace-revenue chart, GMV and commission KPIs. Returns
  // only settled money (completed/released), already filtered so the client
  // doesn't have to know our status vocabulary.
  ordersThisYear: execProcedure.query(async ({ ctx }) => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    const txs = await ctx.prisma.transaction.findMany({
      where: { status: { in: ['completed', 'released'] }, createdAt: { gte: yearStart } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return txs.map(t => ({ amount: Number(t.amount), createdAt: t.createdAt.toISOString() }))
  }),
})
