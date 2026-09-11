'use client'
import { useCallback, useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { toast } from '@/lib/ui'

// A jobseeker's pending "invited to apply" invitations from employers who found
// them via the candidate database search. Accepting shares the candidate's name
// and contact with that employer (and only then); declining removes it. Until a
// candidate accepts, the employer sees them anonymously.
type Invite = {
  id: string
  status: string
  jobListing: { id: string; jobTitle: string; company: string; employerRevealed: boolean; listing?: { location?: string | null } | null }
}

export default function SeekerInvites() {
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const rows = await trpcAuthed().jobs.myApplications.query() as unknown as Invite[]
      setInvites(rows.filter(r => r.status === 'invited_pending'))
    } catch { setInvites([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const respond = async (jobListingId: string, accept: boolean) => {
    setBusy(jobListingId)
    try {
      await trpcAuthed().jobs.respondToInvite.mutate({ jobListingId, accept })
      toast(accept ? 'Invitation accepted — the employer can now see your details.' : 'Invitation declined.')
      setInvites(prev => (prev ?? []).filter(i => i.jobListing.id !== jobListingId))
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not respond to the invitation.') }
    finally { setBusy(null) }
  }

  if (!invites || invites.length === 0) return null

  return (
    <div style={{ background: '#fff', border: '1.5px solid #FFD4C0', borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: 'var(--orange)', marginBottom: 4 }}>📨 Invitations to apply ({invites.length})</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#666', marginBottom: 10, lineHeight: 1.5 }}>
        An employer found you in the candidate database and would like you to apply. Your name and contact are shared <strong>only if you accept</strong>.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {invites.map(inv => (
          <div key={inv.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{inv.jobListing.jobTitle}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11.5, color: '#777', marginTop: 2 }}>
              {inv.jobListing.company}{inv.jobListing.listing?.location ? ` · ${inv.jobListing.listing.location}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => respond(inv.jobListing.id, true)} disabled={busy === inv.jobListing.id} style={{ flex: 1, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '9px 0', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>{busy === inv.jobListing.id ? '…' : '✓ Accept & apply'}</button>
              <button onClick={() => respond(inv.jobListing.id, false)} disabled={busy === inv.jobListing.id} style={{ flex: '0 0 auto', background: '#fff', color: '#888', border: '1.5px solid #e5dccd', borderRadius: 50, padding: '9px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Decline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
