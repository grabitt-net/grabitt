// Resolves what an affiliate earns for a signup, given the config and tier.
// A date-scoped campaign (if one is active for this tier / all tiers) overrides
// the tier's base reward — so admins can offer e.g. "€1 cash per signup" for a
// window and points the rest of the time.
export type RewardKind = 'cash' | 'points'
export type Reward = { kind: RewardKind; amount: number } // amount = cents (cash) or points

type Campaign = { name?: string; from?: string; to?: string; tier?: 'all' | 'founding' | 'standard'; kind?: RewardKind; amount?: number }

type AffiliateConfigLike = {
  foundingKind: string; foundingAmount: number
  standardKind: string; standardAmount: number
  campaigns: unknown
}

export function resolveAffiliateReward(cfg: AffiliateConfigLike, tier: 'founding' | 'standard', now = new Date()): Reward {
  const t = now.getTime()
  const campaigns = Array.isArray(cfg.campaigns) ? (cfg.campaigns as Campaign[]) : []
  const active = campaigns.find(c => {
    if (!c || c.amount == null) return false
    const fromOk = !c.from || new Date(c.from).getTime() <= t
    const toOk = !c.to || new Date(c.to).getTime() >= t
    const tierOk = !c.tier || c.tier === 'all' || c.tier === tier
    return fromOk && toOk && tierOk
  })
  if (active) return { kind: active.kind === 'points' ? 'points' : 'cash', amount: Math.max(0, Math.round(Number(active.amount))) }

  const kind = (tier === 'founding' ? cfg.foundingKind : cfg.standardKind) === 'points' ? 'points' : 'cash'
  const amount = tier === 'founding' ? cfg.foundingAmount : cfg.standardAmount
  return { kind, amount: Math.max(0, Math.round(Number(amount ?? 0))) }
}
