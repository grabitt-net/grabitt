import { redirect } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Conversations now open inside the hub Message Centre — forward the thread id
// so the inbox selects it on load.
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/account?section=messages&thread=${encodeURIComponent(id)}`)
}
