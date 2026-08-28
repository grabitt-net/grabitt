'use client'
import { useCallback, useEffect, useState } from 'react'
import { confirmDialog, toast } from '@/lib/ui'
import { useCrmApi } from './AdminApp'
import MemberActivity from './MemberActivity'
import { BUSINESS_TIERS, businessTierForGrade } from '@grabitt/design-tokens'

// The label to show in the Account level column: business tier for business
// accounts (Business / Business Plus / Business Pro), personal grade otherwise.
const accountLevel = (m: { isBusiness: boolean; businessLight?: boolean; grade: string }) =>
  m.businessLight ? 'Business Light' : m.isBusiness ? businessTierForGrade(m.grade).label : (m.grade[0].toUpperCase() + m.grade.slice(1))

// Business level ↔ grade mapping (Business = Dealer, Plus = Trader, Pro = Pro).
const LEVEL_OPTS: [string, string][] = [
  ['grabber', 'Personal (Grabber)'],
  ['dealer', `${BUSINESS_TIERS.dealer.label} — ${(BUSINESS_TIERS.dealer.feeRate * 100)}%`],
  ['trader', `${BUSINESS_TIERS.trader.label} — ${(BUSINESS_TIERS.trader.feeRate * 100)}%`],
  ['pro', `${BUSINESS_TIERS.pro.label} — ${(BUSINESS_TIERS.pro.feeRate * 100)}%`],
]

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
  businessLight: boolean
  businessVerified: boolean
  businessName: string | null
  isVerified: boolean
  emailVerified: boolean
  phoneVerified: boolean
  idVerified: boolean
  addressVerified: boolean
  idDocStatus?: string
  addressDocStatus?: string
  strikeCount: number
  suspendedUntil: string | null
  suspendedReason: string | null
  deletedAt: string | null
  locale: string
  isAdmin: boolean
}

const GRADES = ['grabber', 'dealer', 'trader', 'pro'] as const
const gradeColors: Record<string, string> = { grabber: 'var(--orange)', dealer: '#f59e0b', trader: '#3b82f6', pro: '#7c3aed' }
const FILTERS = ['All', 'Member', 'Suspended', 'New'] as const

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
  const [creating, setCreating] = useState(false)

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

  // Quick row actions — suspend / reactivate / password reset without opening
  // the full editor.
  const [rowBusy, setRowBusy] = useState('')
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const quickSuspend = async (m: Member, e: React.MouseEvent) => {
    stop(e)
    if (!(await confirmDialog({ message: `Suspend ${m.email}? They won't be able to use their account until reactivated.`, confirmLabel: 'Suspend', danger: true }))) return
    setRowBusy(m.id)
    try { await api.updateMember({ userId: m.id, suspendedUntil: new Date('2099-12-31T00:00:00.000Z').toISOString(), suspendedReason: 'Suspended by admin' }); await refresh() }
    catch { toast('Could not suspend — please try again.') } finally { setRowBusy('') }
  }
  const quickUnsuspend = async (m: Member, e: React.MouseEvent) => {
    stop(e)
    setRowBusy(m.id)
    try { await api.updateMember({ userId: m.id, suspendedUntil: null, suspendedReason: null }); await refresh() }
    catch { toast('Could not reactivate — please try again.') } finally { setRowBusy('') }
  }
  const quickReset = async (m: Member, e: React.MouseEvent) => {
    stop(e)
    if (!(await confirmDialog({ message: `Send a password-reset / account email to ${m.email}?`, confirmLabel: 'Send' }))) return
    setRowBusy(m.id)
    try { await api.memberAuthAction({ action: 'reset_password', userId: m.id }); toast(`✓ Sent to ${m.email}`) }
    catch { toast('Could not send — please try again.') } finally { setRowBusy('') }
  }

  const thirtyDaysAgo = Date.now() - 30 * 86400000
  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    if (q && ![m.displayName, m.email, m.businessName].some(v => v?.toLowerCase().includes(q))) return false
    if (filter === 'Member') return !m.isBusiness && statusOf(m).label !== 'suspended'
    if (filter === 'Suspended') return statusOf(m).label === 'suspended'
    if (filter === 'New') return new Date(m.createdAt).getTime() > thirtyDaysAgo
    return true
  })

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>Members</span>
          <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginLeft: 8 }}>{members.length} total</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, business…"
            style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 50, fontFamily: 'Nunito, sans-serif', fontSize: 12, width: 240, outline: 'none' }} />
          <button onClick={() => setCreating(true)} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '9px 16px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ New member</button>
        </div>
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
              {['Member', 'Email', 'Account level', 'Type', 'Sales', 'Joined', 'Status', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}
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
                  <td style={td}><span style={{ color: gradeColors[m.grade] ?? '#aaa', fontWeight: 900, fontSize: 11 }}>{accountLevel(m)}</span></td>
                  <td style={td}>
                    {m.isAdmin && <span style={{ ...pill('#111'), marginRight: 4 }}>ADMIN</span>}
                    {m.isBusiness ? <span style={pill('#7c3aed')}>Business{m.businessVerified ? ' ✓' : ''}</span> : m.businessLight ? <span style={pill('#0ea5e9')}>Business Light</span> : <span style={{ color: '#bbb', fontSize: 11 }}>Personal</span>}
                  </td>
                  <td style={td}>{m.salesCount}</td>
                  <td style={{ ...td, fontSize: 11, color: '#999' }}>{new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={td}><span style={pill(st.color)}>{st.label}</span></td>
                  <td style={td} onClick={stop}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setSelected(m)} style={rowBtn('#eef4ff', '#2563eb')}>Edit</button>
                      {st.label === 'suspended'
                        ? <button onClick={e => quickUnsuspend(m, e)} disabled={rowBusy === m.id} style={rowBtn('#f0faf4', '#16a34a')}>{rowBusy === m.id ? '…' : 'Reactivate'}</button>
                        : <button onClick={e => quickSuspend(m, e)} disabled={rowBusy === m.id} style={rowBtn('#fef2f2', '#ef4444')}>{rowBusy === m.id ? '…' : 'Suspend'}</button>}
                      <button onClick={e => quickReset(m, e)} disabled={rowBusy === m.id} style={rowBtn('#fff7ed', '#b45309')} title="Send a password-reset / account email">Reset</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#ccc', fontFamily: 'Nunito, sans-serif', fontSize: 13 }}>No members found</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <MemberDrawer member={selected} onClose={() => setSelected(null)} onSaved={refresh} />}
      {creating && <CreateMemberModal onClose={() => setCreating(false)} onCreated={refresh} />}
    </div>
  )
}

// Invite a new member: creates their Supabase Auth identity + our User row and
// emails them a link to set their own password (we never set one for them).
function CreateMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const api = useCrmApi()
  const [f, setF] = useState({ email: '', displayName: '', grade: 'grabber', isBusiness: false, phone: '', businessName: '', feeOverride: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))

  const create = async () => {
    setBusy(true); setErr('')
    try {
      const r = await api.memberAuthAction({
        action: 'create_member',
        email: f.email.trim(),
        displayName: f.displayName.trim(),
        grade: f.grade,
        isBusiness: f.isBusiness,
        ...(f.phone.trim() && { phone: f.phone.trim() }),
        ...(f.businessName.trim() && { businessName: f.businessName.trim() }),
        ...(f.isBusiness && f.feeOverride.trim() !== '' && { feeOverridePct: Number(f.feeOverride) }),
      })
      setDone(r.email ?? f.email.trim())
      onCreated()
    } catch (e: any) { setErr(e?.message ?? 'Could not create the member') }
    finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99997, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 420, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: '#E8DDD5', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>New member</div>
          <button onClick={onClose} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        <div style={{ padding: 16 }}>
          {done ? (
            <>
              <Banner color="#16a34a" bg="#f0fdf4" border="#bbf7d0">✓ Invited <strong>{done}</strong> — they&apos;ve been emailed a link to set their password.</Banner>
              <button onClick={onClose} style={{ ...primary, width: '100%', marginTop: 14 }}>Done</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: '#888', fontFamily: 'Nunito, sans-serif', lineHeight: 1.5, marginBottom: 10 }}>
                We&apos;ll email an invite so they set their own password — no password is created here.
              </div>
              {err && <Banner color="#b91c1c" bg="#fef2f2" border="#fecaca">{err}</Banner>}

              <L>Email *</L><input value={f.email} onChange={e => set('email', e.target.value)} type="email" placeholder="member@example.com" style={inp} />
              <L>Full name *</L><input value={f.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Jane Doe" style={inp} />
              <L>Phone</L><input value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+34 600 000 000" style={inp} />
              {!f.isBusiness && (<>
                <L>Grade</L>
                <select value={f.grade} onChange={e => set('grade', e.target.value)} style={inp}>
                  {GRADES.map(g => <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>)}
                </select>
              </>)}
              <div style={{ marginTop: 10 }}>
                <Check label="Business account" checked={f.isBusiness} onChange={v => setF(p => ({ ...p, isBusiness: v, grade: v ? (p.grade === 'grabber' ? 'dealer' : p.grade) : p.grade }))} />
              </div>
              {f.isBusiness && (<>
                <L>Business name</L><input value={f.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Acme Estates" style={inp} />
                <L>Business level</L>
                <select value={f.grade === 'grabber' ? 'dealer' : f.grade} onChange={e => set('grade', e.target.value)} style={inp}>
                  <option value="dealer">Business (Dealer)</option>
                  <option value="trader">Business Plus (Trader)</option>
                  <option value="pro">Business Pro (Pro)</option>
                </select>
                <L>Fee override % <span style={{ color: '#bbb', fontWeight: 600 }}>— optional, blank = the level’s standard fee</span></L>
                <input value={f.feeOverride} onChange={e => set('feeOverride', e.target.value)} inputMode="decimal" placeholder="e.g. 5" style={inp} />
              </>)}

              <button onClick={create} disabled={busy || !f.email.trim() || !f.displayName.trim()} style={{ ...primary, width: '100%', marginTop: 16, opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Inviting…' : 'Create & send invite'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MemberDrawer({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const api = useCrmApi()
  const [view, setView] = useState<'activity' | 'manage'>('activity')
  const [f, setF] = useState({
    displayName: member.displayName ?? '',
    phone: member.phone ?? '',
    collectionAddress: member.collectionAddress ?? '',
    businessName: member.businessName ?? '',
    grade: member.grade,
    isBusiness: member.isBusiness,
    businessLight: member.businessLight,
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
  const [level, setLevel] = useState(member.grade)
  const [feeOverride, setFeeOverride] = useState((member as any).feeOverridePct != null ? String((member as any).feeOverridePct) : '')

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
        businessLight: f.businessLight,
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
    if (!(await confirmDialog({ message: `Send a password-reset email to ${member.email}?`, confirmLabel: 'Send' }))) return
    setBusy('password'); setErr('')
    try {
      await api.memberAuthAction({ action: 'reset_password', userId: member.id })
      flash(`✓ Reset email sent to ${member.email}`)
    } catch (e) { fail(e) } finally { setBusy('') }
  }

  const setAdmin = async (grant: boolean) => {
    const warn = grant
      ? `Grant ADMIN access to ${member.email}?\n\nThey will get the full executive suite: every member's details, listings, financials, and the ability to change accounts.`
      : `Revoke admin access from ${member.email}?`
    if (!(await confirmDialog({ message: warn, danger: true }))) return
    setBusy('admin'); setErr('')
    try {
      await api.memberAuthAction({ action: 'set_admin', userId: member.id, isAdmin: grant })
      flash(grant ? '✓ Admin access granted' : '✓ Admin access revoked'); onSaved()
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
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, width: 880, maxWidth: '96vw', height: '100vh', background: '#fff', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>
        <div style={{ background: '#E8DDD5', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
              {member.displayName}
              {member.isAdmin && <span style={{ ...pill('#111'), marginLeft: 8 }}>ADMIN</span>}
              {member.isBusiness && <span style={{ ...pill('#7c3aed'), marginLeft: 4 }}>BUSINESS</span>}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{member.email} · {member.grade} · joined {new Date(member.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setView('activity')} style={topTab(view === 'activity')}>Activity</button>
            <button onClick={() => setView('manage')} style={topTab(view === 'manage')}>Manage</button>
            <button onClick={onClose} style={{ background: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 15, marginLeft: 4 }}>✕</button>
          </div>
        </div>

        {view === 'activity' && <div style={{ padding: 16 }}><MemberActivity userId={member.id} /></div>}

        <div style={{ padding: 16, display: view === 'manage' ? 'flex' : 'none', flexDirection: 'column', gap: 16, maxWidth: 460 }}>
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
              <Check label="Business account (full)" checked={f.isBusiness} onChange={v => set('isBusiness', v ? true : false)} />
              <Check label="Business Light (starter plan)" checked={f.businessLight} onChange={v => set('businessLight', v)} />
              <Check label="Business verified (shield)" checked={f.businessVerified} onChange={v => set('businessVerified', v)} />
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, color: '#888', marginTop: 6, lineHeight: 1.5 }}>
              Personal = neither ticked. <strong>Business Light</strong> is the starter plan (limited allowance). <strong>Business account</strong> is the full plan; its tier &amp; caps come from the Grade / Business level (Dealer = Business, Trader = Plus, Pro = Pro).
            </div>
          </Card>

          <Card title="Business level & fees">
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 8 }}>Set the account's business level, and optionally override the item-sale fee for this account only.</div>
            <L>Business level</L>
            <select value={level} onChange={e => setLevel(e.target.value)} style={inp}>
              {LEVEL_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <L>Fee override (%) — leave blank to use the level's standard fee</L>
            <input value={feeOverride} onChange={e => setFeeOverride(e.target.value)} inputMode="decimal" placeholder="e.g. 3" style={inp} />
            <button
              onClick={async () => {
                setBusy('level')
                try {
                  await api.setAccountLevel({ userId: member.id, grade: level, isBusiness: level !== 'grabber', feeOverridePct: feeOverride.trim() === '' ? null : Number(feeOverride) })
                  flash('✓ Level & fee saved'); onSaved()
                } catch (e) { fail(e) } finally { setBusy('') }
              }}
              disabled={!!busy} style={{ ...secondary, width: '100%', marginTop: 6 }}>{busy === 'level' ? '…' : 'Save level & fee'}</button>
          </Card>

          <Card title="Founding & affiliate">
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 8 }}>Founding Member is granted automatically to the first web signups. Assign it manually here for admin-created members.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={async () => { setBusy('found'); try { await api.grantFounding(member.id); flash('✓ Founding Member granted'); onSaved() } catch (e) { fail(e) } finally { setBusy('') } }} disabled={!!busy} style={secondary}>⭐ Grant Founding</button>
              <button onClick={async () => { setBusy('unfound'); try { await api.revokeFounding(member.id); flash('✓ Founding removed'); onSaved() } catch (e) { fail(e) } finally { setBusy('') } }} disabled={!!busy} style={secondary}>Remove Founding</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button onClick={async () => { setBusy('affF'); try { await api.setAffiliate(member.id, true, 'founding'); flash('✓ Founding affiliate'); onSaved() } catch (e) { fail(e) } finally { setBusy('') } }} disabled={!!busy} style={secondary}>Affiliate: Founding</button>
              <button onClick={async () => { setBusy('affS'); try { await api.setAffiliate(member.id, true, 'standard'); flash('✓ Standard affiliate'); onSaved() } catch (e) { fail(e) } finally { setBusy('') } }} disabled={!!busy} style={secondary}>Affiliate: Standard</button>
              <button onClick={async () => { setBusy('affN'); try { await api.setAffiliate(member.id, false); flash('✓ Affiliate removed'); onSaved() } catch (e) { fail(e) } finally { setBusy('') } }} disabled={!!busy} style={secondary}>Remove affiliate</button>
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
            {/* Review submitted documents (private — signed URL, admin only). */}
            {((member.idDocStatus === 'pending' && !member.idVerified) || (member.addressDocStatus === 'pending' && !member.addressVerified)) && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {member.idDocStatus === 'pending' && !member.idVerified && (
                  <a href={`/api/verification-doc?userId=${member.id}&kind=id`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: 'var(--orange)', background: '#FFF3EE', borderRadius: 8, padding: '6px 10px', textDecoration: 'none' }}>⏳ Review ID document ↗</a>
                )}
                {member.addressDocStatus === 'pending' && !member.addressVerified && (
                  <a href={`/api/verification-doc?userId=${member.id}&kind=address`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: 'var(--orange)', background: '#FFF3EE', borderRadius: 8, padding: '6px 10px', textDecoration: 'none' }}>⏳ Review address document ↗</a>
                )}
              </div>
            )}
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

          <Card title="Admin access">
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'Nunito, sans-serif', lineHeight: 1.5, marginBottom: 8 }}>
              Admins get the full executive suite — every member, listing and financial, and the ability to edit accounts. Grant sparingly.
            </div>
            {member.isAdmin ? (
              <>
                <div style={{ ...pill('#111'), display: 'inline-block', marginBottom: 8 }}>ADMIN</div>
                <button onClick={() => setAdmin(false)} disabled={!!busy} style={{ ...danger, width: '100%' }}>{busy === 'admin' ? '…' : 'Revoke admin access'}</button>
              </>
            ) : (
              <button onClick={() => setAdmin(true)} disabled={!!busy} style={{ ...secondary, width: '100%' }}>{busy === 'admin' ? '…' : '🔐 Grant admin access'}</button>
            )}
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
      <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, fontWeight: 900, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
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
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--orange)' }} />
      {label}
    </label>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#aaa', fontFamily: 'Nunito, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 14px', fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#555' }
const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, boxSizing: 'border-box', background: '#fff', outline: 'none' }
const primary: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
const secondary: React.CSSProperties = { background: '#fff', color: '#1a1a1a', border: '1.5px solid #1a1a1a', borderRadius: 8, padding: '9px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const danger: React.CSSProperties = { background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, padding: '9px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
const chip = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 50, border: 'none', cursor: 'pointer',
  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
  background: active ? 'var(--orange)' : '#fff', color: active ? '#fff' : '#666', boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
})
const pill = (color: string): React.CSSProperties => ({
  background: `${color}18`, color, borderRadius: 50, padding: '3px 10px',
  fontSize: 10, fontWeight: 800, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap',
})
const rowBtn = (bg: string, fg: string): React.CSSProperties => ({
  background: bg, color: fg, border: 'none', borderRadius: 7, padding: '5px 10px',
  fontSize: 11, fontWeight: 800, fontFamily: 'Nunito, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
})
const topTab = (active: boolean): React.CSSProperties => ({
  background: active ? '#1a1a1a' : '#fff', color: active ? '#fff' : '#666',
  border: 'none', borderRadius: 50, padding: '7px 16px',
  fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer',
})
