'use client'
import { useRouter } from 'next/navigation'
import Icon from './Icon'

// The Grabitt Now promo banner. The quick-actions pills that used to live here
// are now the persistent <QuickActions/> bar rendered as page chrome.
export default function Hero() {
  const router = useRouter()

  return (
    <section style={{ padding: '8px 14px 4px' }} className="hero">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => router.push('/grabit')}
          style={{
            width: '100%', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
            color: '#fff', border: 'none', borderRadius: 14,
            padding: '13px 18px', fontFamily: 'var(--font-ui)', fontSize: 14,
            fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,69,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          }}
        >
          <Icon name="zap" size={18} strokeWidth={2} />
          <span>Grabitt NOW! Limited Time Offers</span>
          <Icon name="zap" size={18} strokeWidth={2} />
        </button>
      </div>
    </section>
  )
}
