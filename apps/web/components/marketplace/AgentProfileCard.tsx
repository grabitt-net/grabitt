'use client'
import { useEffect, useState } from 'react'
import { trpcAuthed } from '@/lib/authToken'
import { t } from '@/lib/i18n'

// Property-agent contact editor for the account page. Saves the WhatsApp/email/
// agency shown on the agent's property listings.
export default function AgentProfileCard() {
  const [loaded, setLoaded] = useState(false)
  const [on, setOn] = useState(false)
  const [agencyName, setAgencyName] = useState('')
  const [agentWhatsapp, setWhatsapp] = useState('')
  const [agentEmail, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    (trpcAuthed() as any).users.me.query().then((me: any) => {
      setOn(!!me?.isPropertyAgent)
      setAgencyName(me?.agencyName ?? me?.businessName ?? '')
      setWhatsapp(me?.agentWhatsapp ?? '')
      setEmail(me?.agentEmail ?? '')
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      await (trpcAuthed() as any).users.updateAgentProfile.mutate({
        isPropertyAgent: on,
        agencyName: agencyName.trim() || null,
        agentWhatsapp: agentWhatsapp.trim() || null,
        agentEmail: agentEmail.trim() || null,
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  if (!loaded) return null

  return (
    <div style={card}>
      <div style={title}>🏢 {t('Property agent profile')}</div>
      <p style={hint}>{t('Shown on your property listings so buyers can contact you directly.')}</p>
      <label style={toggle}>
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} /> {t('Show my contact details on my property listings')}
      </label>
      <input value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder={t('Agency name')} style={inp} />
      <input value={agentWhatsapp} onChange={e => setWhatsapp(e.target.value)} inputMode="tel" placeholder={t('WhatsApp number (e.g. +34 600 123 456)')} style={inp} />
      <input value={agentEmail} onChange={e => setEmail(e.target.value)} inputMode="email" placeholder={t('Contact email')} style={inp} />
      <button onClick={save} disabled={saving} style={btn}>{saving ? t('Saving…') : saved ? t('Saved ✓') : t('Save agent profile')}</button>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }
const title: React.CSSProperties = { fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }
const hint: React.CSSProperties = { fontFamily: 'var(--font-comfortaa)', fontSize: 11.5, color: '#777', lineHeight: 1.5, margin: 0 }
const toggle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-nunito)', fontSize: 12.5, fontWeight: 700, color: '#555', cursor: 'pointer' }
const inp: React.CSSProperties = { border: '1.5px solid #e5dccd', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-nunito)', fontSize: 13, outline: 'none', background: '#fff', color: 'var(--dark)' }
const btn: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 16px', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, cursor: 'pointer' }
