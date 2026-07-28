'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import MessageComposer from './MessageComposer'
import { tenantSummary } from './TenantProfileCard'
import { t } from '@/lib/i18n'

// On a rental listing, lets the renter enquire with their saved tenant profile
// attached, so the agent can pre-qualify them. Pulls the profile, pre-fills the
// message, and opens the compose sheet. If they haven't filled a profile in yet,
// we send them to the account page to complete it first.
export default function TenantEnquireButton({ listingId, sellerId }: { listingId: string; sellerId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [initial, setInitial] = useState('')
  const [loading, setLoading] = useState(false)

  const start = async () => {
    setLoading(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { router.push(`/auth?next=/listings/${listingId}`); return }
      const me: any = await (trpcAuthed() as any).users.me.query()
      const summary = tenantSummary(me ?? {})
      const hasProfile = me?.tenantBudget || me?.tenantMoveIn || me?.tenantOccupants || me?.tenantEmployment || me?.tenantAbout
      if (!hasProfile) {
        if (confirm(t('Set up your tenant profile first so the agent can pre-qualify you. Go to your account now?'))) router.push('/account?tab=settings')
        return
      }
      setInitial(`Hi, I'm interested in this property. Here are my details:\n\n${summary}\n\nCould you tell me more / arrange a viewing?`)
      setOpen(true)
    } catch { router.push(`/auth?next=/listings/${listingId}`) }
    finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={start} disabled={loading} style={{ width: '100%', marginTop: 8, background: '#fff', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 12, padding: '11px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
        📋 {t('Enquire with my tenant profile')}
      </button>
      {open && (
        <MessageComposer listingId={listingId} sellerId={sellerId} title={t('Enquire')} initialBody={initial} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
