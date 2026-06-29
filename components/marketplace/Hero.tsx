import Link from 'next/link'

const quickActions = [
  { label: 'Sponsors', href: '/listings?category=sponsored' },
  { label: 'Find Work', href: '/listings?category=jobs' },
  { label: 'Find Home', href: '/listings?category=property' },
  { label: 'Employers', href: '/listings/new' },
  { label: 'Business', href: '/listings?category=services' },
]

export default function Hero() {
  return (
    <section style={{ padding: '8px 14px' }}>
      {/* Quick action buttons */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '6px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
          {quickActions.map(a => (
            <Link key={a.label} href={a.href} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
              <button style={{
                width: '100%', background: '#fff', color: 'var(--dark)',
                border: '2px solid var(--orange)', borderRadius: 10,
                padding: '9px 2px', fontFamily: 'var(--font-nunito)', fontSize: 9,
                fontWeight: 900, cursor: 'pointer', lineHeight: 1.15,
              }}>
                {a.label}
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Grabitt Now banner */}
      <Link href="/listings" style={{ textDecoration: 'none' }}>
        <button style={{
          width: '100%', background: 'linear-gradient(135deg, #FF4500, #FF8C00)',
          color: '#fff', border: 'none', borderRadius: 12,
          padding: '9px 13px', fontFamily: 'var(--font-nunito)', fontSize: 14,
          fontWeight: 900, cursor: 'pointer', boxShadow: '0 3px 12px rgba(255,69,0,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span>Grabitt Now! · Limited time offers!</span>
          <span style={{ fontSize: 16 }}>⚡</span>
        </button>
      </Link>
    </section>
  )
}
