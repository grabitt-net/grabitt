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
  }
}

export type CrmApi = ReturnType<typeof makeCrmApi>
