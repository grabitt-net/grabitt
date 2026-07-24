'use client'
import { useEffect, useRef, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { uploadVerificationDoc } from '@/lib/storage'
import { useGrabittUid } from '@/hooks/useGrabittUid'

// Applying to become a verified Business. We ask for the same evidence a bank
// would: registered name, tax id, and documents proving the business is real —
// company papers, or a Modelo 036/037 for an autónomo, plus proof of address.
// Nothing here is trusted from the client: submission is validated server-side
// and approval is done by hand.

type Status = {
  status: 'not_started' | 'pending' | 'approved' | 'rejected'
  hasRegistration: boolean; hasModelo036: boolean; hasProofOfAddress: boolean
  legalName: string | null; taxId: string | null; website: string | null
  socials: { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; x?: string } | null
  rejectionReason: string | null; submittedAt: string | null
  isBusiness: boolean; businessVerified: boolean; businessName: string | null
}

type DocKind = 'registration' | 'modelo036' | 'proof'

export default function BusinessVerifyPanel({ onClose }: { onClose: () => void }) {
  const uid = useGrabittUid()
  const [st, setSt] = useState<Status | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState<DocKind | null>(null)
  const [uploaded, setUploaded] = useState<Record<DocKind, boolean>>({ registration: false, modelo036: false, proof: false })
  const [err, setErr] = useState('')

  const [f, setF] = useState({
    legalName: '', taxId: '', website: '',
    instagram: '', facebook: '', tiktok: '', linkedin: '', x: '',
  })
  const regRef = useRef<HTMLInputElement>(null)
  const modRef = useRef<HTMLInputElement>(null)
  const proofRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    trpcAuthed().business.verificationStatus.query().then((s) => {
      const v = s as Status
      setSt(v)
      setF(x => ({
        ...x,
        legalName: v.legalName ?? '', taxId: v.taxId ?? '', website: v.website ?? '',
        instagram: v.socials?.instagram ?? '', facebook: v.socials?.facebook ?? '',
        tiktok: v.socials?.tiktok ?? '', linkedin: v.socials?.linkedin ?? '', x: v.socials?.x ?? '',
      }))
      setUploaded({ registration: v.hasRegistration, modelo036: v.hasModelo036, proof: v.hasProofOfAddress })
    }).catch(() => setSt(null))
  }, [])

  const set = (k: keyof typeof f, v: string) => setF(s => ({ ...s, [k]: v }))

  const saveDetails = async () => {
    setSaving(true); setErr('')
    try {
      await trpcAuthed().business.saveVerification.mutate({
        legalName: f.legalName.trim() || undefined,
        taxId: f.taxId.trim() || undefined,
        website: f.website.trim() || undefined,
        socials: { instagram: f.instagram.trim(), facebook: f.facebook.trim(), tiktok: f.tiktok.trim(), linkedin: f.linkedin.trim(), x: f.x.trim() },
      })
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.') }
    finally { setSaving(false) }
  }

  const upload = async (kind: DocKind, file: File | null) => {
    if (!file || !uid) return
    setUploading(kind); setErr('')
    try {
      const path = await uploadVerificationDoc(file, uid, kind)
      const key = kind === 'registration' ? 'registrationDocPath' : kind === 'modelo036' ? 'modelo036DocPath' : 'proofOfAddressPath'
      await trpcAuthed().business.saveVerification.mutate({ [key]: path })
      setUploaded(u => ({ ...u, [kind]: true }))
    } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed.') }
    finally { setUploading(null) }
  }

  const submit = async () => {
    await saveDetails()
    setSubmitting(true); setErr('')
    try {
      await trpcAuthed().business.submitVerification.mutate()
      const s = await trpcAuthed().business.verificationStatus.query()
      setSt(s as Status)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not submit.') }
    finally { setSubmitting(false) }
  }

  const canSubmit = !!f.legalName.trim() && (uploaded.registration || uploaded.modelo036) && uploaded.proof

  return (
    <div onClick={onClose} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} className="panel-sheet" style={{ background: '#fff', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>🏢 Business verification</span>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {!st ? <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-ui)' }}>Loading…</div>
          : st.status === 'approved' ? (
            <Centered emoji="✅" title="Your business is verified"
              body="Your storefront, 🏢 badge and multibuy pricing are all available. Manage your shop from the Recruitment and Storefront sections." />
          ) : st.status === 'pending' ? (
            <Centered emoji="⏳" title="Application under review"
              body={`We're checking your documents. This usually takes 1–2 working days. We'll message you as soon as it's decided.${st.submittedAt ? ` Submitted ${new Date(st.submittedAt).toLocaleDateString()}.` : ''}`} />
          ) : (
            <>
              {st.status === 'rejected' && st.rejectionReason && (
                <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: '11px 12px', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, color: '#c0392b', marginBottom: 3 }}>Previous application not verified</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>{st.rejectionReason}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#7f1d1d', marginTop: 6 }}>Update the details below and resubmit.</div>
                </div>
              )}

              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>
                A verified Business account gets a storefront, the 🏢 badge and multibuy pricing. To confirm you&apos;re a real business we need a few documents — everything is stored privately and only seen by our review team.
              </div>

              <Label>Registered business name *</Label>
              <input value={f.legalName} onChange={e => set('legalName', e.target.value)} placeholder="As it appears on your registration" style={INPUT} />

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><Label>Tax ID (CIF / NIF)</Label><input value={f.taxId} onChange={e => set('taxId', e.target.value)} style={INPUT} /></div>
                <div style={{ flex: 1 }}><Label>Website</Label><input value={f.website} onChange={e => set('website', e.target.value)} placeholder="https://…" style={INPUT} /></div>
              </div>

              <Label>Social profiles</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <input value={f.instagram} onChange={e => set('instagram', e.target.value)} placeholder="Instagram" style={{ ...INPUT, flex: '1 1 45%', marginBottom: 0 }} />
                <input value={f.facebook} onChange={e => set('facebook', e.target.value)} placeholder="Facebook" style={{ ...INPUT, flex: '1 1 45%', marginBottom: 0 }} />
                <input value={f.tiktok} onChange={e => set('tiktok', e.target.value)} placeholder="TikTok" style={{ ...INPUT, flex: '1 1 45%', marginBottom: 0 }} />
                <input value={f.x} onChange={e => set('x', e.target.value)} placeholder="X / Twitter" style={{ ...INPUT, flex: '1 1 45%', marginBottom: 0 }} />
              </div>

              <div style={{ height: 1, background: '#f0f0f0', margin: '14px 0' }} />
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Documents</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: '#888', marginBottom: 12 }}>
                Registered company? Upload your registration. Autónomo? Upload your Modelo 036 or 037 instead. Either way, add a recent utility bill or invoice in the business name.
              </div>

              <DocRow label="Company registration" hint="Escritura / registro mercantil" done={uploaded.registration} busy={uploading === 'registration'} inputRef={regRef} onPick={f => upload('registration', f)} />
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#aaa', margin: '2px 0 8px' }}>— or —</div>
              <DocRow label="Modelo 036 / 037" hint="If you trade as an autónomo" done={uploaded.modelo036} busy={uploading === 'modelo036'} inputRef={modRef} onPick={f => upload('modelo036', f)} />
              <div style={{ height: 8 }} />
              <DocRow label="Proof of address *" hint="Utility bill or invoice in the business name" done={uploaded.proof} busy={uploading === 'proof'} inputRef={proofRef} onPick={f => upload('proof', f)} />

              {err && <div style={{ background: '#fff5f5', color: '#c0392b', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, margin: '12px 0' }}>⚠️ {err}</div>}

              <button onClick={submit} disabled={!canSubmit || submitting} style={{ width: '100%', marginTop: 14, background: canSubmit ? 'linear-gradient(135deg,#4A2E1A,#7a4419)' : '#ccc', color: '#fff', border: 'none', borderRadius: 50, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                {submitting ? 'Submitting…' : 'Submit for verification'}
              </button>
              {!canSubmit && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', textAlign: 'center', marginTop: 8 }}>Add your business name, one registration document, and proof of address to submit.</div>}
              <button onClick={saveDetails} disabled={saving} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: 8 }}>{saving ? 'Saving…' : 'Save and finish later'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DocRow({ label, hint, done, busy, inputRef, onPick }: {
  label: string; hint: string; done: boolean; busy: boolean
  inputRef: React.RefObject<HTMLInputElement>; onPick: (f: File | null) => void
}) {
  return (
    <div style={{ background: done ? '#f0fdf4' : '#f8f9fa', border: `1px solid ${done ? '#bbf7d0' : '#eee'}`, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => onPick(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
      <span style={{ fontSize: 20 }}>{done ? '✅' : '📄'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 900, color: '#1a1a1a' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888' }}>{done ? 'Uploaded — tap to replace' : hint}</div>
      </div>
      <button onClick={() => inputRef.current?.click()} disabled={busy} style={{ flexShrink: 0, background: '#fff', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 50, padding: '7px 14px', fontFamily: 'var(--font-ui)', fontSize: 11.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? '…' : done ? 'Replace' : 'Upload'}
      </button>
    </div>
  )
}

function Centered({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 8px' }}>
      <div style={{ fontSize: 46, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#666', lineHeight: 1.6 }}>{body}</div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: 6, marginTop: 4 }}>{children}</div>
}

const INPUT: React.CSSProperties = { width: '100%', border: '1.5px solid #eee', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, background: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }
