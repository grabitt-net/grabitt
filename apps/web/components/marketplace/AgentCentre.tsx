'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpcAuthed } from '@/lib/authToken'
import { t } from '@/lib/i18n'
import Icon from './Icon'
import AgentProfileCard from './AgentProfileCard'

// The back-office hub for a property-agent account — a dedicated profile that
// lists property only. Shows the property allowance, a shortcut to list a
// property, and the agent's public contact details. Only rendered for agents.
type Allowance = { allowance: number; inUse: number; remaining: number; isBusiness?: boolean }
type MyListing = { id: string; title: string; price: number; location?: string | null; status: string; images?: string[]; department: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #ece3d7', borderRadius: 16, padding: 16, marginBottom: 14 }

export default function AgentCentre() {
  const router = useRouter()
  const [allow, setAllow] = useState<Allowance | null>(null)
  const [props, setProps] = useState<MyListing[] | null>(null)

  useEffect(() => {
    (trpcAuthed() as any).property.myAllowance.query().then((a: Allowance) => setAllow(a)).catch(() => {});
    // The agent only sees the properties they have listed.
    (trpcAuthed() as any).listings.mine.query()
      .then((rows: MyListing[]) => setProps((rows ?? []).filter(r => r.department === 'property')))
      .catch(() => setProps([]))
  }, [])

  return (
    <div>
      {/* Header */}
      <div style={{ ...card, background: 'linear-gradient(135deg,#eef4ff,#e3edff)', border: '1px solid #cdddf7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#dbe8ff', color: '#2557b5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🏠</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 800, color: '#1e3a72' }}>{t('Agent Hub')}</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#3a63a8' }}>{t('Property agent account · you list property only')}</div>
          </div>
        </div>
      </div>

      {/* Allowance + list CTA */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('Property listings')}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>
            {allow ? `${allow.remaining} of ${allow.allowance} left` : '—'}
          </span>
        </div>
        {allow && allow.allowance > 0 && (
          <div style={{ height: 8, borderRadius: 4, background: '#eef0f4', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${Math.min(100, (allow.inUse / allow.allowance) * 100)}%`, background: '#2557b5', borderRadius: 4 }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/property/new')} style={{ background: 'linear-gradient(135deg,#2557b5,#3f7ae0)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="home" size={15} /> {t('List a property')}</button>
        </div>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#999', marginTop: 8 }}>{t('Fees and plan limits are being finalised — your allowance is set by our team for now.')}</div>
      </div>

      {/* The agent's own property listings — the only ones they can see here. */}
      <div style={card}>
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 900, color: '#1e3a72', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{t('My property listings')}{props ? ` · ${props.length}` : ''}</div>
        {props === null ? (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#999' }}>{t('Loading…')}</div>
        ) : props.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#999' }}>{t('No properties yet — tap “List a property” to add your first.')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {props.map(p => (
              <div key={p.id} onClick={() => router.push(`/listings/${p.id}`)} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #eef0f4', borderRadius: 12, padding: 10, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f5f0e8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.images?.[0] ? <img src={p.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏠'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888' }}>📍 {p.location ?? 'Canary Islands'} · €{Number(p.price).toLocaleString()}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 50, background: p.status === 'active' ? '#dcfce7' : '#f0f0f0', color: p.status === 'active' ? '#16a34a' : '#888' }}>{p.status === 'active' ? t('Live') : p.status === 'draft' ? t('Pending') : p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Public agent contact details */}
      <AgentProfileCard />
    </div>
  )
}
