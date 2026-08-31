import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

// Charity accounts (memberStatus === 'charity') get a back-office Charity Hub,
// reached from Account like any other account. It mirrors the Business account:
// a storefront that carries the charity's details, their registration info, and
// a fundraising snapshot. Charities pay 0% selling fees.
export const charityRouter = router({
  // Everything the Charity Hub needs: status, registration details, storefront
  // link and a fundraising snapshot.
  mine: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: {
        memberStatus: true, displayName: true,
        charityRegName: true, charityRegNo: true, charityCountry: true,
      },
    })
    const isCharity = user.memberStatus === 'charity'

    const [shop, active, sold] = await Promise.all([
      ctx.prisma.storefront.findUnique({ where: { userId: ctx.user.id }, select: { slug: true, published: true } }),
      ctx.prisma.listing.count({ where: { sellerId: ctx.user.id, status: { in: ['active', 'grab_it_now'] } } }),
      ctx.prisma.listing.aggregate({ where: { sellerId: ctx.user.id, status: 'sold' }, _count: true, _sum: { price: true } }),
    ])

    return {
      isCharity,
      displayName: user.displayName,
      regName: user.charityRegName,
      regNo: user.charityRegNo,
      country: user.charityCountry,
      storefront: shop,
      stats: {
        activeListings: active,
        soldCount: sold._count,
        // Charities keep 100% — 0% fees — so raised ≈ total value of items sold.
        raisedCents: Math.round(Number(sold._sum.price ?? 0) * 100),
      },
    }
  }),

  // Save/update the charity's registration details from the Charity Hub.
  saveDetails: protectedProcedure
    .input(z.object({
      regName: z.string().max(160).optional(),
      regNo: z.string().max(60).optional(),
      country: z.string().max(60).optional(),
    }))
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.regName != null ? { charityRegName: input.regName.trim() } : {}),
          ...(input.regNo != null ? { charityRegNo: input.regNo.trim() } : {}),
          ...(input.country != null ? { charityCountry: input.country.trim() } : {}),
        },
      })
      return { ok: true as const }
    }),
})
