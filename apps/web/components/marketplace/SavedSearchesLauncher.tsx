'use client'
import { PanelProvider, usePanel } from '@/context/PanelContext'
import PanelHost from './PanelHostLazy'
import Icon from './Icon'
import { t } from '@/lib/i18n'

// Saved searches live in the Grabitt Alerts area (they feed match alerts), so we
// surface a launcher here. Self-contained: its own PanelProvider + PanelHost so
// it drops into the server-rendered Alerts page without extra wiring.
function Launcher() {
  const { openPanel } = usePanel()
  return (
    <div style={{ padding: '10px 16px' }}>
      <button
        onClick={() => openPanel('savedSearches')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #ece3d7', borderRadius: 14, padding: '13px 16px', cursor: 'pointer' }}
      >
        <span style={{ width: 42, height: 42, borderRadius: 12, background: '#FFF3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', flexShrink: 0 }}>
          <Icon name="search" size={19} strokeWidth={2} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 13.5, fontWeight: 900, color: 'var(--dark)' }}>{t('Saved searches')}</span>
          <span style={{ display: 'block', fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#777' }}>{t('Manage your saved searches and match alerts.')}</span>
        </span>
        <span style={{ color: 'var(--orange)', fontWeight: 900, fontSize: 18 }}>›</span>
      </button>
    </div>
  )
}

export default function SavedSearchesLauncher() {
  return (
    <PanelProvider>
      <Launcher />
      <PanelHost />
    </PanelProvider>
  )
}
