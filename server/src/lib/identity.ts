// Who a member appears as, publicly.
//
// A business account trades under its business name — the whole point of the
// badge and the storefront is that buyers know who they're dealing with, so a
// business must not appear under a personal name on a listing, a storefront or
// a message. Buying is different: a business account may buy for the business
// or personally, chosen per purchase at checkout.

export type SellerIdentityInput = {
  displayName: string
  isBusiness?: boolean | null
  businessName?: string | null
}

/** The name to show for someone acting as a seller. */
export function sellerName(u: SellerIdentityInput): string {
  if (u.isBusiness && u.businessName?.trim()) return u.businessName.trim()
  return u.displayName
}

/**
 * Business accounts must have a business name before they can list, otherwise
 * we'd have to fall back to their personal name — exactly what selling as the
 * business is meant to prevent.
 */
export function missingBusinessName(u: SellerIdentityInput): boolean {
  return !!u.isBusiness && !u.businessName?.trim()
}
