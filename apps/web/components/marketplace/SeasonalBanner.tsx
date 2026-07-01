'use client'
import { usePanel } from '@/context/PanelContext'

const CAMPAIGNS = [
  { months: [12, 1], emoji: '🎄', title: 'Christmas Gifting', sub: 'Find the perfect present on Gran Canaria', grad: 'linear-gradient(135deg,#c0392b,#27ae60)', dept: 'Gift Ideas', deptGrad: 'linear-gradient(135deg,#f953c6,#b91d73)' },
  { months: [2],     emoji: '🎭', title: 'Carnival Season!',  sub: 'Gran Canaria Carnival deals & costumes',  grad: 'linear-gradient(135deg,#f953c6,#b91d73)', dept: 'Fashion',    deptGrad: 'linear-gradient(135deg,#f7971e,#ffd200)' },
  { months: [3, 4],  emoji: '🌸', title: 'Spring Refresh',    sub: 'New season, new home',                   grad: 'linear-gradient(135deg,#56ab2f,#a8e063)', dept: 'Home & Garden', deptGrad: 'linear-gradient(135deg,#56ab2f,#a8e063)' },
  { months: [5],     emoji: '🌻', title: 'Pre-Summer',        sub: 'Get ready for the season',               grad: 'linear-gradient(135deg,#f9d423,#ff4e50)', dept: 'Sport',     deptGrad: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  { months: [6, 7, 8], emoji: '☀️', title: 'Summer Clearance', sub: 'Sun, sea & savings — shop the island', grad: 'linear-gradient(135deg,#f7971e,#ffd200)', dept: 'Sport',     deptGrad: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  { months: [9, 10], emoji: '🍂', title: 'Autumn Deals',      sub: 'Cosy up for the cooler months',          grad: 'linear-gradient(135deg,#d35400,#e67e22)', dept: 'Home & Garden', deptGrad: 'linear-gradient(135deg,#56ab2f,#a8e063)' },
  { months: [11],    emoji: '🎁', title: 'Pre-Christmas Hunt', sub: 'Get ahead of the Christmas rush',        grad: 'linear-gradient(135deg,#c0392b,#8e44ad)', dept: 'Gift Ideas', deptGrad: 'linear-gradient(135deg,#f953c6,#b91d73)' },
]

export default function SeasonalBanner() {
  const { openPanel } = usePanel()
  const month = new Date().getMonth() + 1
  const campaign = CAMPAIGNS.find(c => c.months.includes(month)) ?? CAMPAIGNS[4]

  return (
    <div
      onClick={() => openPanel('dept', { name: campaign.dept, icon: campaign.emoji, grad: campaign.deptGrad })}
      style={{ margin: '12px 12px 0', borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', background: campaign.grad, padding: '18px 16px', position: 'relative' }}
    >
      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 72, opacity: 0.18, lineHeight: 1 }}>
        {campaign.emoji}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 3, lineHeight: 1.1 }}>
        {campaign.emoji} {campaign.title}
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.9)', marginBottom: 14 }}>
        {campaign.sub}
      </div>
      <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.25)', borderRadius: 50, padding: '6px 16px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: '#fff' }}>
        Shop Now →
      </div>
    </div>
  )
}
