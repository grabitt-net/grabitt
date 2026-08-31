import { redirect } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Grabitt Team chat now lives in the hub Message Centre.
export default function TeamPage() {
  redirect('/account?section=messages&thread=team')
}
