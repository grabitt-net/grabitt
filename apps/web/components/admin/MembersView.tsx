'use client'
import { useCallback, useEffect, useState } from 'react'
import { useCrmApi } from './AdminApp'

// Exec suite — full member administration: profile details, account level,
// verification, credits, suspension, plus email change & password reset
// (which go through Supabase Auth via /api/admin/user-auth).

interface Member {
  id: string
  displayName: string
  email: string
  grade: string
  salesCount: number
  avgRating: number | null
  credits: number
  createdAt: string
  phone: string | null
  collectionAddress: string | null
  avatar: string | null
  isBusiness: boolean
  businessVerified: boolean
  businessName: string | null
  isVerified: boolean
  emailVerified: boolean
  phoneVerified: boolean
  idVerified: boolean
  addressVerified: boolean
  strikeCount: number
  suspendedUntil: string | null
  suspendedReason: string | null
  deletedAt: string | null
  locale: string
}

const GRADES = ['grabber', 'dealer', 'trader', 'pro'] as const
const gradeColors: Record<string, string> = { grabber: '#FF4500', dealer: '#f59e0b', trader: '#3b82f6', pro: '#7c3aed' }
const FILTERS = ['All', 'Business', 'Suspended', 'New'] as const

function statusOf(m: Member): { label: string; color: string } {
  if (m.deletedAt) return { label: 'deleted', color: '#888' }
  if (m.suspendedUntil && new Date(m.suspendedUntil) > new Date()) return { label: 'suspended', color: '#ef4444' }
  return { label: 'active', color: '#16a34a' }
}

interface Props { members: Member[]; focusUserId?: string | null }

export default function MembersView({ members: initial, focusUserId }: Props) {
  const api = useCrmApi()
  const [members, setMembers] = useState<Member[]>(initial ?? [])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All')
  const [selected, setSelected] = useState<Member | null>(null)

  const refresh = useCallback(async () => {
    try {
      const rows = (await api.members()) as Member[]
      setMembers(rows)
      setSelected(s => (s ? rows.find(r => r.id === s.id) ?? null : null))
    } catch { /* keep current */ }
  }, [api])
  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!focusUserId) return
    const m = members.find(x => x.id === focusUserId)
    if (m) setSelected(m)
  }, [focusUserId, members])

  const thirtyDaysAgo = Date.now() - 30 * 86400000
  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    if (q && ![m.displayName, m.email, m.businessName].some(v => v?.toLowerCase().includes(q))) return false
    if (filter === 'Business') return m.isBusiness
    if (filter === 'Suspended') return statusOf(m).label === 'suspended'
    if (filter === 'New') return new Date(m.createdAt).getTime() > thirtyDaysAgo
    return true
  })

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Members</span>
          <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginLeft: 8 }}>{members.length} total</span>
        </h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, business…"
          style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 50, fontFamily: 'Nunito, sans-serif', fontSize: 12, width: 240, outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>{f}</button>
        ))}
        <button onClick={refresh} style={{ ...chip(false), marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {['Member', 'Email', 'Grade', 'Account', 'Sales', 'Credits', 'Joined', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const st = statusOf(m)
              return (
                <tr key={m.id} onClick={() => setSelected(m)} style={{ borderBottom: '1px solid #f9f9f9', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFF3EE')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...td, fontWeight: 800, fontSize: 13, color: '#1a1a1a' }}>
                    {m.displayName}
                    {m.businessName && <div style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>{m.businessName}</div>}
                  </td>
                  <td style={{ ...td, color: '#888' }}>{m.email}</td>
                  <td style={td}><span style={{ color: gradeColors[m.grade] ?? '#aaa', fontWeight: 900, fontSize: 11, textTransform: 'capitalize' }}>{m.grade}</span></td>
                  <td style={td}>{m.isBusiness ? <span style={pill('#7c3aed')}>Business{m.businessVerified ? ' ✓' : ''}</span> : <span style={{ color: '#bbb', fontSize: 11 }}>Personal</span>}</td>
                  <td style={td}>{m.salesCount}</td>
                  <td style={td}>{m.credits}</td>
                  <td style={{ ...td, fontSize: 11, color: '#999' }}>{new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={td}><span style={pill(st.color)}>{st.label}</span></td>
                  <td style={{ ...td, color: '#FF4500', fontWeight: 800, fontSize: 11 }}>Edit →</td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#ccc', fontFamily: 'Nunito, sans-serif', fontSize: 13 }}>No members found</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <MemberDrawer member={selected} onClose={() => setSelected(null)} onSaved={refresh} />}
    </div>
  )
}

function MemberDrawer({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const api = useCrmApi()
  const [f, setF] = useState({
    displayName: member.displayName ?? '',
    phone: member.phone ?? '',
    collectionAddress: member.collectionAddress ?? '',
    businessName: member.businessName ?? '',
    grade: member.grade,
    isBusiness: member.isBusiness,
    businessVerified: member.businessVerified,
    isVerified: member.isVerified,
    emailVerified: member.emailVerified,
    phoneVerified: member.phoneVerified,
    idVerified: member.idVerified,
    addressVerified: member.addressVerified,
    credits: String(member.credits),
  })
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [suspendUntil, setSuspendUntil] = useState('')
  const [suspendReason, setSuspendReason] = useState(member.suspendedReason ?? '')

  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  const flash = (m: string) => { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 4000) }
  const fail = (e: any) => { setErr(e?.message ?? 'Something went wrong'); setMsg('') }

  const saveDetails = async () => {
    setBusy('details'); setErr('')
    try {
      await api.updateMember({
        userId: member.id,
        displayName: f.displayName.trim(),
        phone: f.phone.trim() || null,
        collectionAddress: f.collectionAddress.trim() || null,
        businessName: f.businessName.trim() || null,
        grade: f.grade,
        isBusiness: f.isBusiness,
        businessVerified: f.businessVerified,
        isVerified: f.isVerified,
        emailVerified: f.emailVerified,
        phoneVerified: f.phoneVerified,
        idVerified: f.idVerified,
        addressVerified: f.addressVerified,
        credits: Number(f.credits) || 0,
      })
      flash('✓ Saved'); onSaved()
    } catch (e) { fail(e) } finally { setBusy('') }
  }

  const changeEmail = async () => {
    setBusy('email'); setErr('')
    try {
      const r = await api.memberAuthAction({ action: 'change_email', userId: member.id, email: newEmail })
      flash(`✓ Email changed to ${r.email}`); setNewEmail(''); onSaved()
    } catch (e) { fail(e) } finally { setBusy('') }
  }

  const resetPassword = async () => {
    if (!confirm(`Send a password-reset email to ${member.email}?`)) return
    setBusy('password'); setErr('')
    try {
      await api.memberAuthAction({ action: 'reset_password', userId: member.id })
      flash(`✓ Reset email sent to ${member.email}`)
    } catch (e) { fail(e) } finally { setBusy('') }
  }

  const applySuspension = async (lift: boolean) => {
    setBusy('suspend'); setErr('')
    try {
      await api.updateMember({
        userId: member.id,
        suspendedUntil: lift ? null : new Date(suspendUntil).toISOString(),
        suspendedReason: lift ? null : suspendReason.trim() || 'No reason given',
      })
      flash(lift ? '✓ Suspension lifted' : '✓ Member suspended'); onSaved()
    } catch (e) { fail(e) } finally { setBusy('') }
  }

  const isSuspended = !!member.suspendedUntil && new Date(member.suspendedUntil) > new Date()

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99996 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, width: 420, maxWidth: '95vw', height: '100vh', background: '#fff', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>
        <div style={{ background: '#E8DDD5', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{member.displayName}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{member.email}</div>
          </div>
          <button onClick={onClose} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {msg && <Banner color="#16a34a" bg="#f0fdf4" border="#bbf7d0">{msg}</Banner>}
          {err && <Banner color="#b91c1c" bg="#fef2f2" border="#fecaca">{err}</Banner>}

          <Card title="Profile details">
            <L>Full name</L><input value={f.displayName} onChange={e => set('displayName', e.target.value)} style={inp} />
            <L>Phone</L><input value={f.phone} onChange={e => set('phone', e.target.value)} style={inp} />
            <L>Address</L><textarea value={f.collectionAddress} onChange={e => set('collectionAddress', e.target.value)} style={{ ...inp, minHeight: 60, resize: 'vertical' }} />
            <L>Business name</L><input value={f.businessName} onChange={e => set('businessName', e.target.value)} style={inp} />
          </Card>

          <Card title="Account level">
            <L>Grade</L>
            <select value={f.grade} onChange={e => set('grade', e.target.value)} style={inp}>
              {GRADES.map(g => <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>)}
            </select>
            <L>Credits</L><input value={f.credits} onChange={e => set('credits', e.target.value)} inputMode="numeric" style={inp} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <Check label="Business account" checked={f.isBusiness} onChange={v => set('isBusiness', v)} />
              <Check label="Business verified (shield)" checked={f.businessVerified} onChange={v => set('businessVerified', v)} />
            </div>
          </Card>

          <Card title="Verification">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Check label="Verified member" checked={f.isVerified} onChange={v => set('isVerified', v)} />
              <Check label="Email verified" checked={f.emailVerified} onChange={v => set('emailVerified', v)} />
              <Check label="Phone verified" checked={f.phoneVerified} onChange={v => set('phoneVerified', v)} />
              <Check label="ID verified" checked={f.idVerified} onChange={v => set('idVerified', v)} />
              <Check label="Address verified" checked={f.addressVerified} onChange={v => set('addressVerified', v)} />
            </div>
          </Card>

          <button onClick={saveDetails} disabled={!!busy} style={primary}>{busy === 'details' ? 'Saving…' : 'Save changes'}</button>

          <Card title="Email & password">
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'Nunito, sans-serif', marginBottom: 8 }}>
              Changing the email updates their sign-in identity immediately. Password resets are sent to the member — you never see or set it.
            </div>
            <L>New email</L>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder={member.email} style={{ ...inp, flex: 1 }} />
              <button onClick={changeEmail} disabled={!!busy || !newEmail.trim()} style={{ ...secondary, whiteSpace: 'nowrap' }}>{busy === 'email' ? '…' : 'Change'}</button>
            </div>
            <button onClick={resetPassword} disabled={!!busy} style={{ ...secondary, width: '100%', marginTop: 10 }}>
              {busy === 'password' ? 'Sending…' : '🔑 Send password reset email'}
            </button>
          </Card>

          <Card title="Suspension">
            {isSuspended ? (
              <>
                <div style={{ fontSize: 12, color: '#b91c1c', fontFamily: 'Nunito, sans-serif', marginBottom: 8 }}>
                  Suspended until {new Date(member.suspendedUntil!).toLocaleDateString('en-GB')}
                  {member.suspendedReason ? ` — ${member.suspendedReason}` : ''}
                </div>
                <button onClick={() => applySuspension(true)} disabled={!!busy} style={{ ...secondary, width: '100%' }}>{busy === 'suspend' ? '…' : 'Lift suspension'}</button>
              </>
            ) : (
              <>
                <L>Suspend until</L><input type="date" value={suspendUntil} onChange={e => setSuspendUntil(e.target.value)} style={inp} />
                <L>Reason</L><input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Why are they being suspended?" style={inp} />
                <button onClick={() => applySuspension(false)} disabled={!!busy || !suspendUntil} style={{ ...danger, width: '100%', marginTop: 8 }}>{busy === 'suspend' ? '…' : 'Suspend member'}</button>
              </>
            )}
            <div style={{ fontSize: 11, color: '#999', fontFamily: 'Nunito, sans-serif', marginTop: 8 }}>Strikes: {member.strikeCount}</div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#faf8f5', border: '1px solid #ece3d7', borderRadius: 12, padding: 12 }}>
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 900, color: '#FF4500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}
function Banner({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return <div style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: 10, padding: '9px 11px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700 }}>{children}</div>
}
function L({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 0.4, margin: '8px 0 3px' }}>{children}</label>
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, color: '#555', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#FF4500' }} />
      {label}
    </label>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 14px', fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#555' }
const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, boxSizing: 'border-box', background: '#fff', outline: 'none' }
const primary: React.CSSProperties = { background: '#FF4500', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
const secondary: React.CSSProperties = { background: '#fff', color: '#1a1a1a', border: '1.5px solid #1a1a1a', borderRadius: 8, padding: '9px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const danger: React.CSSProperties = { background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, padding: '9px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const chip = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
  background: active ? '#FF4500' : '#fff', color: active ? '#fff' : '#666', boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
})
const pill = (color: string): React.CSSProperties => ({
  background: `${color}18`, color, borderRadius: 50, padding: '3px 10px',
  fontSize: 10, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap',
})
