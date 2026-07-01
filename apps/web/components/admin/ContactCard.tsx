'use client'

const stageOrder = ['prospect','free-trial','contacted','interested','negotiating','highly-likely','signed']
const stageColors: Record<string, string> = {
  prospect: '#94a3b8', 'free-trial': '#14b8a6', contacted: '#3b82f6',
  interested: '#eab308', negotiating: '#f97316', 'highly-likely': '#FF4500', signed: '#22c55e',
}

interface Props {
  contact: any
  stageColor: string
  onClick: () => void
  onStageChange: (id: string, stage: string) => void
}

export default function ContactCard({ contact, stageColor, onClick, onStageChange }: Props) {
  const followUp = contact.follow_up_date ? new Date(contact.follow_up_date) : null
  const isOverdue = followUp && followUp < new Date()

  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 12, padding: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
      borderLeft: `4px solid ${stageColor}`,
      transition: 'box-shadow 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13, color: '#1a1a1a' }}>
            {contact.name}
          </div>
          {contact.company && (
            <div style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-ui)' }}>{contact.company}</div>
          )}
        </div>
        {contact.monthly_value > 0 && (
          <div style={{
            background: '#f0faf4', borderRadius: 6, padding: '2px 7px',
            fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 11, color: '#16a34a',
            whiteSpace: 'nowrap',
          }}>
            €{Number(contact.monthly_value).toLocaleString()}/mo
          </div>
        )}
      </div>

      {followUp && (
        <div style={{
          fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 700,
          color: isOverdue ? '#ef4444' : '#888',
          marginBottom: 8,
        }}>
          {isOverdue ? '⚠️ Overdue: ' : '📅 '}
          {followUp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {stageOrder.map((s, i) => {
          const currentIdx = stageOrder.indexOf(contact.stage)
          const isThis = contact.stage === s
          const isPast = i < currentIdx
          return (
            <div
              key={s}
              onClick={e => { e.stopPropagation(); onStageChange(contact.id, s) }}
              title={s}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: isThis ? stageColors[s] : isPast ? `${stageColors[s]}44` : '#eee',
                border: isThis ? `2px solid ${stageColors[s]}` : '2px solid transparent',
                cursor: 'pointer', transition: 'transform 0.1s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
