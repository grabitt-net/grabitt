'use client'
import { useEffect, useState } from 'react'
import { confirmDialog } from '@/lib/ui'
import { useCrmApi } from './AdminApp'

// Rewards admin: manage the ways to earn credits, the redemption catalogue
// (listing upgrades / fee reductions), and hand out a grant to a member/listing.
interface Rule { id: string; code: string; icon: string; title: string; subtitle: string; amount: number; actionLabel: string | null; actionKey: string | null; active: boolean; sortOrder: number }
interface Option { id: string; kind: string; title: string; description: string; costCredits: number; config: any; active: boolean; sortOrder: number }
interface Member { id: string; displayName?: string; email?: string }

const EMPTY_RULE = { code: '', icon: '🎁', title: '', subtitle: '', amount: 10, actionLabel: '', actionKey: '', active: true, sortOrder: 0 }
const EMPTY_OPT = { kind: 'listing_upgrade', title: '', description: '', costCredits: 100, active: true, sortOrder: 0, upgrade: 'featured', weeks: 1, hours: 24, pct: 2, days: 30 }

export default function RewardsView() {
  const api = useCrmApi()
  const [tab, setTab] = useState<'earn' | 'redeem' | 'grant'>('earn')
  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>Rewards</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 14 }}>Ways to earn credits, what they can be redeemed for, and manual grants.</div>
      <div style={{ display: 'flex', gap: 6, background: '#f0ece5', borderRadius: 50, padding: 4, marginBottom: 16, maxWidth: 420 }}>
        {([['earn', 'Ways to earn'], ['redeem', 'Redemption options'], ['grant', 'Manual grant']] as [typeof tab, string][]).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: 'none', background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#1a1a1a' : '#888', borderRadius: 50, padding: '8px 0', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>
      {tab === 'earn' && <EarnRules api={api} />}
      {tab === 'redeem' && <RedeemOptions api={api} />}
      {tab === 'grant' && <ManualGrant api={api} />}
    </div>
  )
}

function EarnRules({ api }: { api: ReturnType<typeof useCrmApi> }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_RULE })
  const load = () => api.rewardRules().then(r => setRules((r ?? []) as Rule[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!form.code.trim() || !form.title.trim()) return
    await api.upsertRewardRule({ ...(editing !== 'new' ? { id: editing } : {}), code: form.code.trim(), icon: form.icon, title: form.title.trim(), subtitle: form.subtitle.trim(), amount: Number(form.amount) || 0, actionLabel: form.actionLabel || null, actionKey: form.actionKey || null, active: form.active, sortOrder: Number(form.sortOrder) || 0 })
    setEditing(null); load()
  }
  return (
    <div>
      <button onClick={() => { setForm({ ...EMPTY_RULE, sortOrder: rules.length }); setEditing('new') }} style={btnPrimary}>+ New way to earn</button>
      {editing && (
        <div style={editBox}>
          <Row><Field label="Code (unique)"><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={inp} /></Field><Field label="Icon"><input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} style={{ ...inp, width: 60 }} /></Field><Field label="Credits"><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ ...inp, width: 90 }} /></Field></Row>
          <Field label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} /></Field>
          <Field label="Subtitle"><input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} style={inp} /></Field>
          <Row><Field label="Action label"><input value={form.actionLabel} onChange={e => setForm({ ...form, actionLabel: e.target.value })} placeholder="e.g. Invite" style={inp} /></Field><Field label="Action key"><input value={form.actionKey} onChange={e => setForm({ ...form, actionKey: e.target.value })} placeholder="invite / share / sell / browse / chat" style={inp} /></Field><Field label="Order"><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} style={{ ...inp, width: 70 }} /></Field></Row>
          <label style={chk}><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button onClick={save} style={btnPrimary}>Save</button><button onClick={() => setEditing(null)} style={btnGhost}>Cancel</button></div>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        {rules.map(r => (
          <div key={r.id} style={rowCard(r.active)}>
            <span style={{ fontSize: 20 }}>{r.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{r.title} <span style={{ color: '#22c55e' }}>+{r.amount}</span></div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{r.subtitle}</div>
            </div>
            <button onClick={() => { setForm({ ...r, actionLabel: r.actionLabel ?? '', actionKey: r.actionKey ?? '' }); setEditing(r.id) }} style={iconBtn}>✏️</button>
            <button onClick={async () => { if (await confirmDialog({ message: 'Delete this reward rule?', confirmLabel: 'Delete', danger: true })) { await api.removeRewardRule(r.id); load() } }} style={{ ...iconBtn, color: '#ef4444' }}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function RedeemOptions({ api }: { api: ReturnType<typeof useCrmApi> }) {
  const [opts, setOpts] = useState<Option[]>([])
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_OPT })
  const load = () => api.rewardOptions().then(o => setOpts((o ?? []) as Option[])).catch(() => {})
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!form.title.trim()) return
    const config = form.kind === 'fee_reduction' ? { pct: Number(form.pct), days: Number(form.days) } : { upgrade: form.upgrade, ...(form.upgrade === 'featured' ? { weeks: Number(form.weeks) } : {}), ...(form.upgrade === 'grab_it_now' ? { hours: Number(form.hours) } : {}) }
    await api.upsertRewardOption({ ...(editing !== 'new' ? { id: editing } : {}), kind: form.kind, title: form.title.trim(), description: form.description.trim(), costCredits: Number(form.costCredits) || 1, config, active: form.active, sortOrder: Number(form.sortOrder) || 0 })
    setEditing(null); load()
  }
  return (
    <div>
      <button onClick={() => { setForm({ ...EMPTY_OPT, sortOrder: opts.length }); setEditing('new') }} style={btnPrimary}>+ New redemption</button>
      {editing && (
        <div style={editBox}>
          <Row>
            <Field label="Type"><select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} style={inp}><option value="listing_upgrade">Listing upgrade</option><option value="fee_reduction">Fee reduction</option></select></Field>
            <Field label="Cost (credits)"><input type="number" value={form.costCredits} onChange={e => setForm({ ...form, costCredits: e.target.value })} style={{ ...inp, width: 110 }} /></Field>
          </Row>
          <Field label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} /></Field>
          <Field label="Description"><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inp} /></Field>
          {form.kind === 'fee_reduction' ? (
            <Row><Field label="Fee cut (percentage points)"><input type="number" value={form.pct} onChange={e => setForm({ ...form, pct: e.target.value })} style={{ ...inp, width: 90 }} /></Field><Field label="Days"><input type="number" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} style={{ ...inp, width: 90 }} /></Field></Row>
          ) : (
            <Row>
              <Field label="Upgrade"><select value={form.upgrade} onChange={e => setForm({ ...form, upgrade: e.target.value })} style={inp}><option value="featured">Featured</option><option value="grab_it_now">Grab It Now</option><option value="bump">Bump</option></select></Field>
              {form.upgrade === 'featured' && <Field label="Weeks"><input type="number" value={form.weeks} onChange={e => setForm({ ...form, weeks: e.target.value })} style={{ ...inp, width: 80 }} /></Field>}
              {form.upgrade === 'grab_it_now' && <Field label="Hours"><input type="number" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} style={{ ...inp, width: 80 }} /></Field>}
            </Row>
          )}
          <label style={chk}><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button onClick={save} style={btnPrimary}>Save</button><button onClick={() => setEditing(null)} style={btnGhost}>Cancel</button></div>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        {opts.map(o => (
          <div key={o.id} style={rowCard(o.active)}>
            <span style={{ fontSize: 18 }}>{o.kind === 'fee_reduction' ? '📉' : '🚀'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{o.title} <span style={{ color: 'var(--orange)' }}>· {o.costCredits} cr</span></div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{o.description}</div>
            </div>
            <button onClick={() => { const c = o.config ?? {}; setForm({ kind: o.kind, title: o.title, description: o.description, costCredits: o.costCredits, active: o.active, sortOrder: o.sortOrder, upgrade: c.upgrade ?? 'featured', weeks: c.weeks ?? 1, hours: c.hours ?? 24, pct: c.pct ?? 2, days: c.days ?? 30 }); setEditing(o.id) }} style={iconBtn}>✏️</button>
            <button onClick={async () => { if (await confirmDialog({ message: 'Delete this redemption option?', confirmLabel: 'Delete', danger: true })) { await api.removeRewardOption(o.id); load() } }} style={{ ...iconBtn, color: '#ef4444' }}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ManualGrant({ api }: { api: ReturnType<typeof useCrmApi> }) {
  const [members, setMembers] = useState<Member[]>([])
  const [userId, setUserId] = useState('')
  const [type, setType] = useState<'credits' | 'fee_reduction' | 'listing_upgrade'>('credits')
  const [credits, setCredits] = useState(50)
  const [pct, setPct] = useState(2); const [days, setDays] = useState(30)
  const [listingId, setListingId] = useState(''); const [upgrade, setUpgrade] = useState('featured'); const [weeks, setWeeks] = useState(1); const [hours, setHours] = useState(24)
  const [note, setNote] = useState(''); const [msg, setMsg] = useState('')
  const [absolute, setAbsolute] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  useEffect(() => { api.members().then(m => setMembers((m ?? []) as Member[])).catch(() => {}) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const loadSummary = (id: string) => { setSummary(null); if (id) api.memberRewardSummary(id).then(setSummary).catch(() => {}) }
  const grant = async () => {
    if (!userId) { setMsg('Choose a member'); return }
    setMsg('')
    try {
      await api.grantReward({ userId, type, note: note || undefined, ...(type === 'credits' ? { credits: Number(credits), absolute } : {}), ...(type === 'fee_reduction' ? { pct: Number(pct), days: Number(days) } : {}), ...(type === 'listing_upgrade' ? { listingId, upgrade, weeks: Number(weeks), hours: Number(hours) } : {}) })
      setMsg('✓ Granted'); loadSummary(userId)
    } catch (e: any) { setMsg(e?.message ? String(e.message) : 'Failed') }
  }
  return (
    <div style={{ maxWidth: 480 }}>
      <Field label="Member"><select value={userId} onChange={e => { setUserId(e.target.value); loadSummary(e.target.value) }} style={inp}><option value="">Select a member…</option>{members.map(m => <option key={m.id} value={m.id}>{m.displayName ?? m.email ?? m.id}</option>)}</select></Field>
      {summary && (
        <div style={{ background: '#f7f4ee', border: '1px solid #eee', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontFamily: 'var(--font-ui)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>Balance: <span style={{ color: 'var(--orange)' }}>{summary.credits} credits</span>{summary.feeReduction ? <span style={{ marginLeft: 10, color: '#16a34a', fontSize: 11 }}>−{summary.feeReduction.pct}% fee until {new Date(summary.feeReduction.until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span> : null}</div>
          {summary.events?.length > 0 && <div style={{ fontSize: 10.5, color: '#999', marginTop: 5, lineHeight: 1.5 }}>{summary.events.slice(0, 4).map((e: any, i: number) => <div key={i}>{e.delta > 0 ? '+' : ''}{e.delta} · {e.note ?? e.kind}</div>)}</div>}
        </div>
      )}
      <Field label="Grant type"><select value={type} onChange={e => setType(e.target.value as any)} style={inp}><option value="credits">Credits</option><option value="fee_reduction">Fee reduction</option><option value="listing_upgrade">Listing upgrade</option></select></Field>
      {type === 'credits' && (<>
        <Field label={absolute ? 'Set balance to' : 'Add credits (negative to deduct)'}><input type="number" value={credits} onChange={e => setCredits(Number(e.target.value))} style={inp} /></Field>
        <label style={chk}><input type="checkbox" checked={absolute} onChange={e => setAbsolute(e.target.checked)} /> Set exact balance (instead of adding)</label>
      </>)}
      {type === 'fee_reduction' && <Row><Field label="Fee cut (points)"><input type="number" value={pct} onChange={e => setPct(Number(e.target.value))} style={{ ...inp, width: 100 }} /></Field><Field label="Days"><input type="number" value={days} onChange={e => setDays(Number(e.target.value))} style={{ ...inp, width: 100 }} /></Field></Row>}
      {type === 'listing_upgrade' && (<>
        <Field label="Listing ID"><input value={listingId} onChange={e => setListingId(e.target.value)} placeholder="listing uuid" style={inp} /></Field>
        <Row><Field label="Upgrade"><select value={upgrade} onChange={e => setUpgrade(e.target.value)} style={inp}><option value="featured">Featured</option><option value="grab_it_now">Grab It Now</option><option value="bump">Bump</option></select></Field>{upgrade === 'featured' && <Field label="Weeks"><input type="number" value={weeks} onChange={e => setWeeks(Number(e.target.value))} style={{ ...inp, width: 80 }} /></Field>}{upgrade === 'grab_it_now' && <Field label="Hours"><input type="number" value={hours} onChange={e => setHours(Number(e.target.value))} style={{ ...inp, width: 80 }} /></Field>}</Row>
      </>)}
      <Field label="Note (optional)"><input value={note} onChange={e => setNote(e.target.value)} style={inp} /></Field>
      <button onClick={grant} style={{ ...btnPrimary, marginTop: 6 }}>Grant</button>
      {msg && <span style={{ marginLeft: 10, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: msg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{msg}</span>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><label style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 4 }}>{label}</label>{children}</div>
}
function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>{children}</div> }

const editBox: React.CSSProperties = { background: '#FFF9F5', border: '1.5px solid #FFD9C2', borderRadius: 12, padding: 16, margin: '14px 0' }
const inp: React.CSSProperties = { boxSizing: 'border-box', border: '1.5px solid #e0d8d0', borderRadius: 8, padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', background: '#fff', width: '100%' }
const chk: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: '#555', marginTop: 8 }
const btnPrimary: React.CSSProperties = { background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }
const iconBtn: React.CSSProperties = { background: '#f7f4ee', border: '1px solid #eee', borderRadius: 8, padding: '5px 8px', fontSize: 13, cursor: 'pointer' }
const rowCard = (active: boolean): React.CSSProperties => ({ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '10px 12px', marginBottom: 6, opacity: active ? 1 : 0.5 })
