'use client'
import { useEffect, useRef, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { uploadVerificationDoc } from '@/lib/storage'
import { MEMBER_STATUSES, MEMBER_STATUS_IDS } from '@grabitt/design-tokens'
import { t } from '@/lib/i18n'

// Lets a member apply for a special status (Student / Blue Light / Charity) and
// see the state of any application. Approval is handled by an admin; on approval
// the discount / free charity account applies automatically.
type App = { id: string; kind: string; status: string; createdAt: string; reviewNote: string | null }
type Mine = { memberStatus: string | null; foundingMember: boolean; applications: App[] }

export default function MemberStatusCard() {
  const [mine, setMine] = useState<Mine | null>(null)
  const [applyFor, setApplyFor] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [evidence, setEvidence] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uid, setUid] = useState<string | null>(null)

  const load = () => trpcAuthed().status.mine.query().then(d => setMine(d as unknown as Mine)).catch(() => {})
  useEffect(() => { load(); trpcAuthed().users.me.query().then((u: any) => setUid(u?.id ?? null)).catch(() => {}) }, [])

  // Upload a proof document (charity registration certificate etc.) to the
  // private verification bucket; the returned path is stored as the evidence.
  const onPickDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file || !uid) return
    setUploading(true); setMsg('')
    try {
      const path = await uploadVerificationDoc(file, uid, 'registration')
      setEvidence(path); setDocName(file.name)
    } catch (err: any) { setMsg(err?.message ? String(err.message) : 'Could not upload document') }
    finally { setUploading(false) }
  }
  // Deep-link ?apply=charity (from the Sell popup's Charity card) pre-opens that
  // application straight away.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const a = new URLSearchParams(window.location.search).get('apply')
    if (a && (MEMBER_STATUS_IDS as readonly string[]).includes(a)) setApplyFor(a)
  }, [])

  const submit = async () => {
    if (!applyFor) return
    setBusy(true); setMsg('')
    try {
      await trpcAuthed().status.applyFor.mutate({ kind: applyFor as never, ...(details.trim() ? { details: details.trim() } : {}), ...(evidence.trim() ? { evidenceUrl: evidence.trim() } : {}) })
      setMsg('✓ Application submitted — we’ll review it shortly.')
      setApplyFor(null); setDetails(''); setEvidence(''); setDocName(''); load()
    } catch (e: any) { setMsg(e?.message ? String(e.message) : 'Could not submit') }
    finally { setBusy(false) }
  }

  const current = mine?.memberStatus ? (MEMBER_STATUSES as any)[mine.memberStatus] : null
  const pendingKinds = new Set((mine?.applications ?? []).filter(a => a.status === 'pending').map(a => a.kind))

  return (
    <div style={{ background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16 }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{t('Discounts & member status')}</div>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#1a1a1a', marginBottom: 12, lineHeight: 1.5 }}>
        {t('Students, Blue Light workers and registered charities can apply for a reduced rate. Approval takes a quick manual check.')}
      </div>

      {(current || mine?.foundingMember) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {current && <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>{current.badge} {current.label} — {t('active')}</span>}
          {mine?.foundingMember && <span style={{ background: '#FFF3EE', border: '1px solid #FFD4A0', color: '#8a5a2a', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>⭐ {t('Founding Member')}</span>}
        </div>
      )}

      {msg && <div style={{ marginBottom: 10, fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, color: msg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{msg}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MEMBER_STATUS_IDS.map(id => {
          const s = (MEMBER_STATUSES as any)[id]
          const isCurrent = mine?.memberStatus === id
          const isPending = pendingKinds.has(id)
          return (
            <div key={id} style={{ border: '1px solid #f0ebe4', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{s.badge}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#1a1a1a', lineHeight: 1.4 }}>{s.blurb}</div>
                </div>
                {isCurrent ? <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#16a34a' }}>✓ {t('Active')}</span>
                  : isPending ? <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#a16207' }}>{t('In review')}</span>
                  : <button onClick={() => { setApplyFor(applyFor === id ? null : id); setMsg('') }} style={{ background: '#FFF3EE', border: '1px solid #FFD4A0', borderRadius: 50, padding: '6px 12px', fontFamily: 'var(--font-nunito)', fontSize: 11.5, fontWeight: 800, color: '#8a5a2a', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('Apply')}</button>}
              </div>
              {applyFor === id && (
                <div style={{ marginTop: 10, borderTop: '1px solid #f4efe8', paddingTop: 10 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', marginBottom: 5 }}>{t('Evidence needed')}: {s.evidence}</div>
                  <input value={details} onChange={e => setDetails(e.target.value)} placeholder={id === 'charity' ? t('Charity name & registration number') : id === 'student' ? t('Institution & course') : t('Employer / service')} style={field} />
                  {id === 'charity' && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#666', marginBottom: 4 }}>{t('Proof of charity registration')} <span style={{ color: '#ef4444' }}>*</span></div>
                      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onPickDoc} style={{ display: 'none' }} />
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: '100%', border: '1.5px dashed #d8c9b4', background: '#fffdf9', borderRadius: 10, padding: '11px 12px', cursor: uploading ? 'wait' : 'pointer', color: docName ? '#16a34a' : '#8a7a63', fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800 }}>
                        {uploading ? t('Uploading…') : docName ? `✓ ${docName}` : t('⬆️ Upload registration certificate (PDF or photo)')}
                      </button>
                      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#aaa', marginTop: 3 }}>{t('Stored privately — only seen by our review team. We approve charities manually.')}</div>
                    </div>
                  )}
                  {id !== 'charity' && <input value={evidence} onChange={e => setEvidence(e.target.value)} placeholder={t('Link to evidence (optional) — e.g. a photo of your ID')} style={field} />}
                  <button onClick={submit} disabled={busy || (id === 'charity' && !evidence)} style={{ marginTop: 4, background: (id === 'charity' && !evidence) ? '#d8c9b4' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 900, cursor: busy ? 'wait' : (id === 'charity' && !evidence) ? 'not-allowed' : 'pointer' }}>{busy ? t('Submitting…') : (id === 'charity' && !evidence) ? t('Upload proof to submit') : t('Submit application')}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5dccd', borderRadius: 10, padding: '9px 11px', fontFamily: 'var(--font-nunito)', fontSize: 12.5, outline: 'none', background: '#fff', marginBottom: 8 }
