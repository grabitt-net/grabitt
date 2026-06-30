'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button onClick={handleLogout} style={{
      background: 'rgba(255,69,0,0.1)', color: 'var(--orange)',
      border: 'none', borderRadius: 50, padding: '8px 16px',
      fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800,
      cursor: 'pointer',
    }}>
      Log Out
    </button>
  )
}
