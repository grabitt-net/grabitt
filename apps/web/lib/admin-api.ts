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

    // Audit trail — who did what, to whom
    auditTrail: (targetUserId?: string) =>
      rpc<any[]>('crm.auditTrail', 'query', { targetUserId, limit: 100 }, execToken),

    // E-marketing
    eshots: () => rpc<any[]>('eshots.list', 'query', undefined, execToken),
    eshotAudienceSize: (segment: string) =>
      rpc<number>('eshots.audienceSize', 'query', { segment }, execToken),
    createEshot: (data: Record<string, unknown>) =>
      rpc<any>('eshots.create', 'mutation', data, execToken),
    updateEshot: (data: Record<string, unknown>) =>
      rpc<any>('eshots.update', 'mutation', data, execToken),
    removeEshot: (id: string) =>
      rpc<any>('eshots.remove', 'mutation', { id }, execToken),
    sendEshotTest: (id: string, to: string) =>
      rpc<any>('eshots.sendTest', 'mutation', { id, to }, execToken),
    sendEshot: (id: string) =>
      rpc<{ sent: number; failed: number; recipients: number }>('eshots.send', 'mutation', { id }, execToken),
    eshotRecipients: (id: string, page = 1) =>
      rpc<{ rows: any[]; page: number; hasMore: boolean }>('eshots.recipients', 'query', { id, page }, execToken),

    // Everything about one member (360° view)
    memberDetail: (userId: string) =>
      rpc<any>('crm.memberDetail', 'query', { userId }, execToken),

    // Page through one section of that view
    memberSection: (userId: string, section: string, page: number) =>
      rpc<{ rows: any[]; page: number; hasMore: boolean }>('crm.memberSection', 'query', { userId, section, page }, execToken),

    // Full transcript for a disputed trade (audit-logged)
    disputeTranscript: (disputeId: string) =>
      rpc<any>('crm.disputeTranscript', 'query', { disputeId }, execToken),

    // Creating a member / email / password live in Supabase Auth, so they go
    // via a dedicated exec-gated route rather than the tRPC routers.
    memberAuthAction: async (body:
      | { action: 'change_email'; userId: string; email: string }
      | { action: 'reset_password'; userId: string }
      | { action: 'set_admin'; userId: string; isAdmin: boolean }
      | { action: 'create_member'; email: string; displayName: string; grade?: string; isBusiness?: boolean; phone?: string; businessName?: string }
    ) => {
      const res = await fetch('/api/admin/user-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${execToken}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Request failed')
      return json as { ok: true; id?: string; email?: string; sentTo?: string; invited?: boolean; isAdmin?: boolean }
    },
  }
}

export type CrmApi = ReturnType<typeof makeCrmApi>
