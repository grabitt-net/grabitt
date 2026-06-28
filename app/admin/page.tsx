import AdminSidebar from '@/components/admin/Sidebar'
import FunnelView from '@/components/admin/FunnelView'

export default function AdminPage() {
  return (
    <div style={{ background: '#f0f2f5', fontFamily: 'var(--font-comfortaa)', minHeight: '100vh' }}>
      {/* Topbar */}
      <header style={{
        background: '#E8DDD5', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 22, fontWeight: 700 }}>
          <span style={{ color: '#FF4500' }}>Grab</span>
          <span style={{ color: '#2a2a2a' }}>itt</span>
          <span style={{ color: '#999', fontSize: 13, marginLeft: 6, fontWeight: 400 }}>/ Exec</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <StatChip label="Members" value="0" />
            <StatChip label="Prospects" value="0" />
          </div>
          <button style={{
            background: '#FF4500', color: '#fff', border: 'none',
            borderRadius: 50, padding: '8px 16px',
            fontFamily: 'var(--font-nunito)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
          }}>
            + New Contact
          </button>
        </div>
      </header>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', minHeight: 'calc(100vh - 48px)' }}>
        <AdminSidebar />
        <main style={{ padding: '24px 20px 20px', overflowY: 'auto' }}>
          <FunnelView />
        </main>
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,69,0,0.12)', borderRadius: 50,
      padding: '5px 12px', textAlign: 'center', cursor: 'pointer',
    }}>
      <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: '#FF4500' }}>{value}</div>
      <div style={{ fontSize: 8, color: '#555', fontFamily: 'var(--font-nunito)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  )
}
