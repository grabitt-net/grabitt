'use client'
import { useState } from 'react'
import MessageComposer from './MessageComposer'
import { t } from '@/lib/i18n'

interface Props { listingId: string; sellerId: string; label?: string; primary?: boolean; flex?: number }

// Message / Enquire / Message Employer. Opens the compose sheet rather than
// navigating to a thread — see MessageComposer for why.
export default function MessageButton({ listingId, sellerId, label = '💬 Message', primary = false, flex = 1 }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ flex, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: primary ? 'var(--orange)' : '#f0f0f0', color: primary ? '#fff' : 'var(--dark)',
          border: 'none', borderRadius: 14, padding: '14px 20px',
          fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900,
          cursor: 'pointer', boxShadow: primary ? '0 4px 14px rgba(255,69,0,0.35)' : 'none',
        }}
      >
        {t(label)}
      </button>

      {open && (
        <MessageComposer
          listingId={listingId}
          sellerId={sellerId}
          title={t(label)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
