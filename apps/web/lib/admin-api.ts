/**
 * Thin fetch wrapper for tRPC exec-protected endpoints.
 * Used by admin client components. The execToken is generated server-side
 * by the admin page and passed down as a prop — it never touches the browser's
 * localStorage and is scoped to the admin shell's render.
 */

// Same-origin tRPC endpoint served by this Next.js app (/api/trpc), unless an
// external standalone server URL is configured.
const API = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/trpc` : '/api/trpc'

async function rpc<T>(
  procedure: string,
  type: 'query' | 'mutation',
  input: unknown,
  execToken: string,
): Promise<T> {
  const url = type === 'query'
    ? `${API}/${procedure}${input !== undefined ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ''}`
    : `${API}/${procedure}`

  const res = await fetch(url, {
    method: type === 'query' ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${execToken}`,
    },
    ...(type === 'mutation' ? { body: JSON.stringify(input) } : {}),
  })

  const json = await res.json()
  if (json.error) throw new Error(json.error.message ?? 'tRPC error')
  return json.result?.data as T
}

export function makeCrmApi(execToken: string) {
  return {
    // Contacts
    contacts: (stage?: string) =>
      rpc<any[]>('crm.contacts', 'query', { stage, page: 1 }, execToken),

    upsertContact: (data: Record<string, unknown>) =>
      rpc<any>('crm.upsertContact', 'mutation', data, execToken),

    moveStage: (id: string, stage: string) =>
      rpc<any>('crm.moveStage', 'mutation', { id, stage }, execToken),

    // Members
    members: (grade?: string) =>
      rpc<any[]>('crm.members', 'query', { grade, page: 1 }, execToken),

    // Disputes
    disputes: (status?: string) =>
      rpc<any[]>('crm.disputes', 'query', { status }, execToken),

    resolveDispute: (id: string, resolution: string, outcome: string) =>
      rpc<any>('crm.resolveDispute', 'mutation', { id, resolution, outcome }, execToken),

    // Financials
    financialsSummary: (from: string, to: string) =>
      rpc<{ gmv: number; revenue: number; transactionCount: number; newMembers: number; disputes: number }>(
        'financials.summary', 'query', { from, to }, execToken
      ),

    // Banners (CMS)
    banners: () => rpc<any[]>('banners.all', 'query', undefined, execToken),
    upsertBanner: (data: Record<string, unknown>) =>
      rpc<any>('banners.upsert', 'mutation', data, execToken),
    removeBanner: (id: string) =>
      rpc<any>('banners.remove', 'mutation', { id }, execToken),

    // Compliance (GDPR consent log + deletion requests)
    consentLog: (kind?: 'gdpr' | 'withdrawal_waiver') =>
      rpc<any[]>('compliance.consentLog', 'query', kind ? { kind } : undefined, execToken),
    deletionRequests: () =>
      rpc<any[]>('compliance.deletionRequests', 'query', undefined, execToken),

    // Homepage layout CMS
    homeSections: () => rpc<any[]>('homepage.sections', 'query', undefined, execToken),
    saveHomeSections: (sections: { key: string; enabled: boolean; sortOrder: number }[]) =>
      rpc<any>('homepage.save', 'mutation', { sections }, execToken),

    // Parallax hero slides
    heroSlides: () => rpc<any[]>('homepage.allHeroSlides', 'query', undefined, execToken),
    upsertHeroSlide: (data: Record<string, unknown>) =>
      rpc<any>('homepage.upsertHeroSlide', 'mutation', data, execToken),
    removeHeroSlide: (id: string) =>
      rpc<any>('homepage.removeHeroSlide', 'mutation', { id }, execToken),

    // Community content (Grabitt Guides)
    communityPosts: () => rpc<any[]>('community.all', 'query', undefined, execToken),
    upsertCommunityPost: (data: Record<string, unknown>) =>
      rpc<any>('community.upsert', 'mutation', data, execToken),
    removeCommunityPost: (id: string) =>
      rpc<any>('community.remove', 'mutation', { id }, execToken),

    // Job & property listing oversight
    adminJobs: (status?: string) =>
      rpc<any[]>('jobs.adminList', 'query', { status: status ?? 'all' }, execToken),
    adminProperties: (status?: string) =>
      rpc<any[]>('property.adminList', 'query', { status: status ?? 'all' }, execToken),

    // Member administration
    updateMember: (data: Record<string, unknown>) =>
      rpc<any>('crm.updateMember', 'mutation', data, execToken),

    // Creating a member / email / password live in Supabase Auth, so they go
    // via a dedicated exec-gated route rather than the tRPC routers.
    memberAuthAction: async (body:
      | { action: 'change_email'; userId: string; email: string }
      | { action: 'reset_password'; userId: string }
      | { action: 'create_member'; email: string; displayName: string; grade?: string; isBusiness?: boolean; phone?: string; businessName?: string }
    ) => {
      const res = await fetch('/api/admin/user-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${execToken}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Request failed')
      return json as { ok: true; id?: string; email?: string; sentTo?: string; invited?: boolean }
    },
  }
}

export type CrmApi = ReturnType<typeof makeCrmApi>
