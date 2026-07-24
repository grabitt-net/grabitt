import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

// Auto counter-offer ladder (mirrors the v20 prototype): when a buyer offers
// below the seller's auto-accept minimum, the system counters automatically —
// tier 1 halfway between the ask and the min, tier 2 a quarter of the way, tier 3
// (final) the minimum itself. The seller's true minimum is only reached at the
// final tier, so it's never revealed up front.
function counterForTier(ask: number, min: number, tier: number): number {
  const gap = Math.max(0, ask - min)
  if (tier <= 1) return Math.round(min + gap * 0.5)
  if (tier === 2) return Math.round(min + gap * 0.25)
  return Math.round(min) // tier >= 3 → final = minimum
}

export const offersRouter = router({
  make: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      amount: z.number().min(0.01),
      message: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: input.listingId } })
      if (listing.sellerId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot make offer on own listing' })
      }

      const min = listing.autoAcceptMin != null ? Number(listing.autoAcceptMin) : null
      const ask = Number(listing.price)
      // Auto-accept: at/above the minimum → accepted without seller action (the
      // threshold is never exposed to the buyer). Below the minimum → the auto
      // counter ladder kicks in instead of leaving it pending.
      const autoAccept = min != null && input.amount >= min
      const autoCounter = !autoAccept && min != null && input.amount < min
      const counterAmount = autoCounter ? counterForTier(ask, min!, 1) : null

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)
      const offer = await ctx.prisma.offer.create({
        data: {
          listingId: input.listingId,
          buyerId: ctx.user.id,
          amount: input.amount,
          message: input.message,
          expiresAt,
          status: autoAccept ? 'accepted' : autoCounter ? 'countered' : 'pending',
          ...(autoCounter ? { counterAmount, counterTier: 1 } : {}),
        },
      })

      if (autoAccept) {
        await ctx.prisma.notification.create({
          data: {
            userId: ctx.user.id,
            kind: 'offer_accepted',
            title: '✅ Offer accepted!',
            body: `Your €${input.amount.toFixed(2)} offer on "${listing.title}" was accepted. Complete payment to secure it.`,
            actionUrl: `/listings/${listing.id}`,
          },
        })
      } else if (autoCounter) {
        await ctx.prisma.notification.create({
          data: {
            userId: ctx.user.id,
            kind: 'offer_countered',
            title: '🤝 Seller countered',
            body: `Your €${input.amount.toFixed(2)} offer on "${listing.title}" was countered at €${counterAmount!.toFixed(2)}. Accept it or counter lower.`,
            actionUrl: `/listings/${listing.id}`,
          },
        })
      } else {
        await ctx.prisma.notification.create({
          data: {
            userId: listing.sellerId,
            kind: 'offer_received',
            title: '💰 New offer',
            body: `You received a €${input.amount.toFixed(2)} offer on "${listing.title}".`,
            // Deep-links to this offer in the Offers received card, which
            // scrolls to and highlights it.
            actionUrl: `/account?offer=${offer.id}#offers`,
          },
        })
      }

      return offer
    }),

  // Buyer responds to an auto counter-offer: accept it (pay at the counter
  // price) or reject to step the ladder down. Rejecting the final tier refers
  // the offer back to the seller for a manual decision.
  respondToCounter: protectedProcedure
    .input(z.object({
      offerId: z.string().uuid(),
      action: z.enum(['accept', 'reject']),
      // Rejecting can carry the buyer's own new offer. Without one we just step
      // the seller's ladder down, but a negotiation where only one side names a
      // number isn't a negotiation.
      amount: z.number().min(0.01).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUniqueOrThrow({
        where: { id: input.offerId },
        include: { listing: true },
      })
      if (offer.buyerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      if (offer.status !== 'countered' || offer.counterAmount == null) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active counter-offer to respond to' })
      }

      if (input.action === 'accept') {
        // Agreed at the counter price — that becomes the amount the buyer pays.
        const updated = await ctx.prisma.offer.update({
          where: { id: offer.id },
          data: { status: 'accepted', amount: offer.counterAmount },
        })
        await ctx.prisma.notification.create({
          data: {
            userId: offer.listing.sellerId,
            kind: 'offer_accepted',
            title: '🤝 Counter accepted',
            body: `A buyer accepted your €${Number(offer.counterAmount).toFixed(2)} counter on "${offer.listing.title}".`,
            actionUrl: `/account?offer=${offer.id}#offers`,
          },
        })
        return updated
      }

      // Reject → the buyer may name a new figure. If they do, it's a fresh offer
      // and gets the same treatment as the original: at or above the seller's
      // minimum it's accepted outright, below it the ladder steps down.
      const min = offer.listing.autoAcceptMin != null ? Number(offer.listing.autoAcceptMin) : Number(offer.counterAmount)
      const ask = Number(offer.listing.price)
      const nextTier = offer.counterTier + 1

      if (input.amount != null && input.amount !== Number(offer.amount)) {
        if (input.amount > ask) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'That is more than the asking price' })
        }
        if (offer.listing.autoAcceptMin != null && input.amount >= min) {
          const accepted = await ctx.prisma.offer.update({
            where: { id: offer.id },
            data: { status: 'accepted', amount: input.amount, counterAmount: null },
          })
          await ctx.prisma.notification.create({
            data: {
              userId: offer.listing.sellerId,
              kind: 'offer_accepted',
              title: '✅ Offer accepted automatically',
              body: `A buyer's €${input.amount.toFixed(2)} offer on "${offer.listing.title}" met your minimum and was accepted.`,
              actionUrl: `/account?offer=${offer.id}#offers`,
            },
          })
          return accepted
        }
        // Still short of the minimum — counter again from the new position.
        if (offer.counterTier >= 3) {
          const referred = await ctx.prisma.offer.update({
            where: { id: offer.id },
            data: { status: 'pending', amount: input.amount, counterAmount: null },
          })
          await ctx.prisma.notification.create({
            data: {
              userId: offer.listing.sellerId,
              kind: 'offer_received',
              title: '💰 Offer needs your decision',
              body: `A buyer's €${input.amount.toFixed(2)} offer on "${offer.listing.title}" is below your minimum — review it manually.`,
              actionUrl: `/account?offer=${offer.id}#offers`,
            },
          })
          return referred
        }
        const stepped = counterForTier(ask, min, nextTier)
        const countered = await ctx.prisma.offer.update({
          where: { id: offer.id },
          data: { amount: input.amount, counterAmount: stepped, counterTier: nextTier },
        })
        await ctx.prisma.notification.create({
          data: {
            userId: offer.buyerId,
            kind: 'offer_countered',
            title: nextTier >= 3 ? '🔔 Seller’s final offer' : '🤝 Seller countered',
            body: `${nextTier >= 3 ? 'Final counter' : 'New counter'} on "${offer.listing.title}": €${stepped.toFixed(2)}.`,
            actionUrl: `/listings/${offer.listing.id}`,
          },
        })
        return countered
      }

      if (offer.counterTier >= 3) {
        // Final tier already rejected — hand back to the seller to decide.
        const updated = await ctx.prisma.offer.update({
          where: { id: offer.id },
          data: { status: 'pending', counterAmount: null },
        })
        await ctx.prisma.notification.create({
          data: {
            userId: offer.listing.sellerId,
            kind: 'offer_received',
            title: '💰 Offer needs your decision',
            body: `A buyer's €${Number(offer.amount).toFixed(2)} offer on "${offer.listing.title}" is below your minimum — review it manually.`,
            actionUrl: `/account?offer=${offer.id}#offers`,
          },
        })
        return updated
      }
      const nextCounter = counterForTier(ask, min, nextTier)
      const updated = await ctx.prisma.offer.update({
        where: { id: offer.id },
        data: { counterAmount: nextCounter, counterTier: nextTier },
      })
      await ctx.prisma.notification.create({
        data: {
          userId: offer.buyerId,
          kind: 'offer_countered',
          title: nextTier >= 3 ? '🔔 Seller’s final offer' : '🤝 Seller countered',
          body: `${nextTier >= 3 ? 'Final counter' : 'New counter'} on "${offer.listing.title}": €${nextCounter.toFixed(2)}.`,
          actionUrl: `/listings/${offer.listing.id}`,
        },
      })
      return updated
    }),

  respond: protectedProcedure
    .input(z.object({ offerId: z.string().uuid(), action: z.enum(['accept', 'decline', 'counter']), counterAmount: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUniqueOrThrow({
        where: { id: input.offerId },
        include: { listing: true },
      })
      if (offer.listing.sellerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' })
      const status = input.action === 'accept' ? 'accepted' : input.action === 'decline' ? 'declined' : 'countered'
      return ctx.prisma.offer.update({ where: { id: input.offerId }, data: { status } })
    }),

  received: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.offer.findMany({
      where: { listing: { sellerId: ctx.user.id }, status: 'pending' },
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    })
  ),

  sent: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.offer.findMany({
      where: { buyerId: ctx.user.id },
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    })
  ),
})
