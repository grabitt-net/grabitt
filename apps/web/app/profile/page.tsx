import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const gradeColors: Record<string, string> = {
    grabber: '#FF4500',
    dealer: '#eab308',
    trader: '#3b82f6',
    pro: '#22c55e',
  }

  const grade = profile?.grade ?? 'grabber'

  return (
    <main className="app-shell" style={{ background: 'var(--sand)', minHeight: '100vh', paddingBottom: 40, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--sand)', padding: '14px 16px',
        borderBottom: '1.5px solid var(--sand2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 24, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>G</span>
          <span style={{ color: 'var(--dark)' }}>rabitt</span>
        </span>
        <LogoutButton />
      </header>

      <div style={{ padding: 16 }}>
        {/* Avatar + name */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '24px 20px',
          boxShadow: 'var(--shadow)', marginBottom: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--orange)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 32, color: '#fff', fontWeight: 900,
            fontFamily: 'var(--font-nunito)',
          }}>
            {profile?.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 18, fontWeight: 900, color: 'var(--dark)' }}>
              {profile?.full_name ?? 'Grabitt User'}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{user.email}</div>
          </div>
          <div style={{
            background: gradeColors[grade] + '20',
            color: gradeColors[grade],
            borderRadius: 50, padding: '4px 14px',
            fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800,
            textTransform: 'capitalize',
          }}>
            {grade === 'grabber' ? '🟠' : grade === 'dealer' ? '🟡' : grade === 'trader' ? '🔵' : '⭐'} {grade}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8, marginBottom: 12,
        }}>
          {[
            { label: 'Listings', value: '0' },
            { label: 'Sales', value: '0' },
            { label: 'Rating', value: '—' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, padding: '14px 10px',
              textAlign: 'center', boxShadow: 'var(--shadow)',
            }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: 'var(--orange)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Menu items */}
        {[
          { icon: '📦', label: 'My Listings', href: '/listings?mine=true' },
          { icon: '🛒', label: 'My Orders', href: '/orders' },
          { icon: '❤️', label: 'Favourites', href: '/favourites' },
          { icon: '💬', label: 'Messages', href: '/messages' },
          { icon: '⚙️', label: 'Settings', href: '/settings' },
        ].map(item => (
          <a key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#fff', borderRadius: 14, padding: '14px 16px',
            marginBottom: 8, textDecoration: 'none',
            boxShadow: 'var(--shadow)',
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>
              {item.label}
            </span>
            <span style={{ marginLeft: 'auto', color: '#ccc', fontSize: 16 }}>›</span>
          </a>
        ))}
      </div>
    </main>
  )
}
