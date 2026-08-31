import { redirect } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Grabitt Alerts now live in the hub Message Centre.
export default function AlertsPage() {
  redirect('/account?section=messages&thread=alerts')
}
