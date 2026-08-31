import { redirect } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The standalone Messages centre has moved into the account hub. Anyone landing
// on /messages is forwarded to the hub's Message Centre.
export default function MessagesPage() {
  redirect('/account?section=messages')
}
