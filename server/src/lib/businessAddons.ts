import type { PrismaClient } from '@prisma/client'
import { getStripe } from './stripe'
import { BUSINESS_ADDONS, isBusinessAddon } from '@grabitt/design-tokens'

// Reconciles a business's Stripe subscription line items to match the add-on set
// stored on the user (User.businessAddons). We only ever touch items we created
// (tagged with metadata.addon) — the base business price is left untouched. This
// is the single code path used both at signup (via the webhook once the base
// subscription exists) and when the business toggles an add-on in the dashboard,
// so the monthly charge always tracks the selected set with Stripe proration.
export async function reconcileSubscriptionAddons(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessAddons: true },
  })
  if (!user) return

  const sub = await prisma.subscription.findFirst({
    where: { userId, plan: 'business', status: { in: ['active', 'trialing', 'past_due'] } },
    orderBy: { createdAt: 'desc' },
    select: { stripeSubscriptionId: true },
  })
  if (!sub) return // no live base subscription yet — nothing to attach add-ons to

  const desiredIds = (user.businessAddons ?? []).filter(isBusinessAddon)
  const desired = new Set<string>(desiredIds)
  const stripe = getStripe()
  const remote = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId, { expand: ['items'] })

  // Items we manage carry metadata.addon; index them by add-on id.
  const managed = new Map<string, string>() // addonId -> subscription item id
  for (const item of remote.items.data) {
    const addon = item.metadata?.addon
    if (addon) managed.set(addon, item.id)
  }

  // Add any desired add-ons not already present. Subscription items need a Price
  // (not inline product_data), so mint a Product + monthly Price per add-on.
  for (const id of desiredIds) {
    if (managed.has(id)) continue
    const a = BUSINESS_ADDONS[id]
    const product = await stripe.products.create({ name: `Grabitt — ${a.label}`, metadata: { addon: id } })
    const price = await stripe.prices.create({
      currency: 'eur',
      unit_amount: a.amountCents,
      recurring: { interval: 'month' },
      product: product.id,
    })
    await stripe.subscriptionItems.create({
      subscription: sub.stripeSubscriptionId,
      price: price.id,
      quantity: 1,
      metadata: { addon: id },
      proration_behavior: 'create_prorations',
    })
  }

  // Remove any managed items no longer desired.
  for (const [addon, itemId] of managed) {
    if (!desired.has(addon)) {
      await stripe.subscriptionItems.del(itemId, { proration_behavior: 'create_prorations' })
    }
  }
}
