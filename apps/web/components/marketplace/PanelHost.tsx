'use client'
import { useState, useEffect } from 'react'
import { usePanel } from '@/context/PanelContext'

// ── dept listings (stub — real data from Supabase later) ──────────────────────
const DEPT_LISTINGS: Record<string, [string, string, string, string][]> = {
  'Home & Garden': [['🪴','Snake Plant','€12','Las Palmas'],['🛋️','IKEA Sofa','€180','Maspalomas'],['🔨','Dewalt Drill','€85','Telde'],['🌿','Garden Tools Set','€40','Arucas'],['🪟','Venetian Blinds','€55','Las Palmas']],
  'Jobs': [['💼','Bar Staff Needed','€1,200/mo','Las Palmas'],['🍳','Chef — Italian Rest.','€1,600/mo','Playa del Inglés'],['🧹','Housekeeper','€950/mo','Maspalomas'],['🚗','Driver Wanted','€1,100/mo','Vecindario'],['💻','Web Dev — Remote','€2,400/mo','Online']],
  'Fashion': [['👟','Nike Air Max 90','€75','Las Palmas'],['👗','Summer Dress','€22','Maspalomas'],['🧳','Louis Vuitton Bag','€320','Playa del Inglés'],['🧢','Vintage Cap','€15','Telde'],['💍','Silver Ring','€28','Las Palmas']],
  'Sport': [['🏄','Surfboard 6ft','€120','Las Palmas'],['🚴','Mountain Bike','€340','Maspalomas'],['⚽','Football Boots','€45','Arucas'],['🎾','Tennis Racket','€60','Telde'],['🏋️','Dumbbells Set','€95','Vecindario']],
  'Gaming': [['🎮','PS5 Console','€380','Las Palmas'],['🕹️','Nintendo Switch','€220','Maspalomas'],['🎧','Gaming Headset','€55','Telde'],['🖥️','Gaming Chair','€150','Playa del Inglés'],['📀','FIFA 25','€25','Las Palmas']],
  'Electronics': [['📱','iPhone 14','€620','Las Palmas'],['💻','MacBook Air M2','€890','Maspalomas'],['📷','Canon R6 + Lens','€1,800','Telde'],['🎵','Sony WH-1000XM5','€220','Playa del Inglés'],['⌨️','Mechanical Keyboard','€75','Arucas']],
  'Gift Ideas': [['🎁','Spa Gift Voucher','€50','Las Palmas'],['🍷','Wine Hamper','€65','Maspalomas'],['🕯️','Candle Set','€18','Telde'],['📚','Book Collection','€35','Playa del Inglés'],['🧴','Beauty Box','€42','Las Palmas']],
  'Kids & Baby': [['🧸','LEGO City Set','€45','Las Palmas'],['🚲','Kids Bike 16"','€85','Maspalomas'],['👶','Mothercare Pram','€120','Telde'],['🎨','Art Supplies','€22','Playa del Inglés'],['📚','Children\'s Books','€12','Arucas']],
  'Property': [['🏠','Studio Flat','€650/mo','Playa del Inglés'],['🏡','2-Bed Bungalow','€950/mo','Maspalomas'],['🏢','Office Space','€400/mo','Las Palmas'],['🌴','Villa for Sale','€285,000','Puerto Rico'],['🛏️','Room to Rent','€380/mo','Vecindario']],
  'Health & Fitness': [['💊','Vitamin D Pack','€12','Las Palmas'],['🏃','Running Shoes','€65','Maspalomas'],['🧘','Yoga Mat','€18','Telde'],['💪','Protein Powder','€35','Playa del Inglés'],['🩺','Blood Pressure Mon.','€45','Las Palmas']],
  'Food Store': [['🥖','Artisan Bread Box','€12','Las Palmas'],['🧀','Local Cheese Pack','€18','Maspalomas'],['🍷','Gran Canaria Wine','€22','Telde'],['🫒','Olive Oil 5L','€28','Arucas'],['☕','Specialty Coffee','€15','Las Palmas']],
  'Retro & Vintage': [['📻','Vintage Radio','€45','Las Palmas'],['🕹️','Atari Console','€120','Maspalomas'],['👔','70s Leather Jacket','€85','Telde'],['🎸','Fender Stratocaster','€340','Las Palmas'],['📷','Film Camera','€65','Playa del Inglés']],
  'Grab It Now': [['🛍️','Flash Deal Bundle','€29','Las Palmas'],['⚡','Today Only: TV','€199','Maspalomas'],['🔥','Clearance Sofa','€95','Telde'],['💥','iPhone Deal','€299','Las Palmas'],['⏰','Last 2: Laptop','€349','Playa del Inglés']],
  'Handy Help': [['🔧','Plumber — Urgent','€35/hr','Las Palmas'],['⚡','Electrician','€40/hr','Maspalomas'],['🪣','Cleaner Available','€12/hr','Telde'],['🏗️','Builder / Painter','€25/hr','Arucas'],['🌿','Gardener','€15/hr','Las Palmas']],
  'Pet Shop': [['🐾','Golden Retriever Pup','€600','Las Palmas'],['🐱','Bengal Kitten','€450','Maspalomas'],['🦜','African Grey Parrot','€800','Telde'],['🐠','Aquarium Setup','€120','Playa del Inglés'],['🦮','Dog Walker','€10/hr','Las Palmas']],
}

const CARD_GRADS = [
  'linear-gradient(145deg,#FFF3EE,#FFE4D6)',
  'linear-gradient(145deg,#EEF4FF,#D6E8FF)',
  'linear-gradient(145deg,#F0FDF4,#D6F5E3)',
  'linear-gradient(145deg,#FEF9EE,#FFF0CC)',
  'linear-gradient(145deg,#FDF0FF,#F0D6FF)',
]

const NOTIFS = [
  { icon: '💰', title: 'Offer received!', body: 'Dave M. offered €85 on your Surfboard', time: '2m ago', type: 'bid' },
  { icon: '💬', title: 'New message', body: 'Maria: "Is the bike still available?"', time: '8m ago', type: 'messages' },
  { icon: '📉', title: 'Price drop!', body: 'MacBook Air M2 dropped to €890', time: '1h ago', type: 'price' },
  { icon: '✅', title: 'Listing approved', body: 'Your Canon R6 listing is now live', time: '2h ago', type: 'all' },
  { icon: '⭐', title: 'New review', body: 'Emma gave you 5 stars!', time: '3h ago', type: 'all' },
  { icon: '💰', title: 'Counter offer', body: 'Seller countered at €300 on Guitar', time: '5h ago', type: 'bid' },
  { icon: '👀', title: 'Listing viewed', body: 'Your Vespa has 24 new views today', time: '6h ago', type: 'all' },
  { icon: '💬', title: 'Message', body: 'Carlos: "Can you deliver?"', time: '7h ago', type: 'messages' },
]

const SHIELD_CONTENT: Record<string, string> = {
  promise: `<div style="font-family:Nunito,sans-serif;font-size:13px;color:#1a1a1a;line-height:1.6;">
    <p style="margin-bottom:12px;">At <strong>Grabitt</strong> we commit to making every transaction on Gran Canaria safe, fair and local. Our platform is built on three pillars:</p>
    <div style="background:#FFF3EE;border-radius:12px;padding:12px;margin-bottom:10px;"><strong>🔒 Secure payments</strong><br/>All payments go through Stripe escrow — funds are only released once both parties confirm the handover.</div>
    <div style="background:#F0FDF4;border-radius:12px;padding:12px;margin-bottom:10px;"><strong>👤 Verified members</strong><br/>We verify email, mobile, and optional ID to ensure you know who you're dealing with.</div>
    <div style="background:#EEF4FF;border-radius:12px;padding:12px;"><strong>📍 Truly local</strong><br/>Grabitt is built for Gran Canaria — our support team is here, our members are your neighbours.</div>
  </div>`,
  rules: `<div style="font-family:Nunito,sans-serif;font-size:13px;color:#1a1a1a;">
    ${['Never pay outside Grabitt — Stripe keeps your money safe until handover.','Always meet in a public place for in-person exchanges.','Don\'t share your bank details, personal address, or passwords.','Report suspicious behaviour immediately using the 🚨 Report button.','Rate every transaction honestly so the community stays strong.','If a deal feels wrong, it probably is — trust your instincts.'].map((r, i) => `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f0f0f0;"><span style="font-weight:900;color:#FF4500;flex-shrink:0;">${i + 1}.</span><span>${r}</span></div>`).join('')}
  </div>`,
  scams: `<div style="font-family:Nunito,sans-serif;">
    ${[
      { name: 'Advance fee fraud', desc: 'Buyer asks you to pay a "shipping fee" or "insurance" before releasing funds. Never pay to receive money.' },
      { name: 'Fake payment screenshot', desc: 'Scammer sends a fake Stripe receipt. Always verify in your Stripe dashboard or Grabitt account before handing over goods.' },
      { name: 'Overpayment scam', desc: 'Buyer "accidentally" pays too much and asks for a refund before the payment clears. The original payment will bounce.' },
      { name: 'Off-platform deal', desc: 'Buyer asks to move the deal to WhatsApp, PayPal or cash to "save fees". This removes all protection.' },
    ].map(s => `<div style="background:#fff5f5;border-left:4px solid #ef4444;border-radius:0 10px 10px 0;padding:12px;margin-bottom:10px;"><div style="font-weight:900;font-size:12px;color:#1a1a1a;margin-bottom:4px;">⚠️ ${s.name}</div><div style="font-size:12px;color:#555;line-height:1.5;">${s.desc}</div></div>`).join('')}
  </div>`,
  tips: `<div style="font-family:Nunito,sans-serif;">
    ${['Use Grabitt\'s built-in chat — all messages are recorded and can be reviewed in a dispute.','Photograph items before and after handover.','Meet at busy public spots: a supermarket car park, a petrol station, or a town square.','For high-value items, bring a friend and meet during daylight hours.','Read the seller\'s rating and reviews before committing.','Enable 2FA on your Grabitt account for extra security.'].map(t => `<div style="background:#f0f7ff;border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:12px;color:#1a1a1a;line-height:1.5;">💡 ${t}</div>`).join('')}
  </div>`,
  report: `<div style="font-family:Nunito,sans-serif;font-size:13px;color:#1a1a1a;">
    <p style="margin-bottom:14px;line-height:1.6;">See something suspicious? Use the <strong>🚨 Report</strong> button on any listing or member profile. Our team reviews all reports within 24 hours.</p>
    <div style="background:#FFF3EE;border-radius:12px;padding:14px;text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">🚨</div>
      <div style="font-weight:900;font-size:14px;color:#FF4500;margin-bottom:4px;">Emergency Contact</div>
      <div style="font-size:12px;color:#666;">If you are in immediate danger, call <strong>112</strong> (Spanish emergency services).</div>
      <div style="font-size:11px;color:#888;margin-top:8px;">For Grabitt disputes: safety@grabitt.net</div>
    </div>
  </div>`,
}

const FOOTER_CONTENT: Record<string, { title: string; body: string }> = {
  about: { title: 'ℹ️ About Us', body: '<p style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">Grabitt is Gran Canaria\'s own buy-and-sell marketplace, built to keep money in the local community. We launched in 2026 with a simple mission: make it easy for islanders and expats to trade safely, locally, and fairly.</p><p style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;margin-top:10px;">Whether you\'re selling a surfboard, looking for work, or renting a room — Grabitt is your platform.</p>' },
  why: { title: '⭐ Why Us?', body: '<div style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">' + ['🔒 Stripe escrow — your money is safe until handover','📍 100% local — every listing is on Gran Canaria','👤 Verified members — know who you\'re buying from','💶 Fair fees — from 2.5% for Pro members','🆘 Local support team — we pick up the phone','🌍 6 languages — EN, ES, DE, DA, SV & more coming'].map(t => `<div style="padding:8px 0;border-bottom:1px solid #f5f5f5;">${t}</div>`).join('') + '</div>' },
  contact: { title: '✉️ Contact Us', body: '<div style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;"><div style="margin-bottom:12px;">📧 <strong>hello@grabitt.net</strong></div><div style="margin-bottom:12px;">🛡️ Safety issues: <strong>safety@grabitt.net</strong></div><div style="margin-bottom:12px;">📍 Gran Canaria, Canary Islands, Spain</div><div>We aim to respond within 24 hours Mon–Fri.</div></div>' },
  help: { title: '💬 Help Centre', body: '<div style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">' + ['How do I list an item?','How does Stripe payment work?','What are the seller fees?','How do I verify my account?','What if there\'s a dispute?','How do I cancel or refund?'].map((q, i) => `<div style="padding:10px 0;border-bottom:1px solid #f5f5f5;cursor:pointer;"><strong>${q}</strong> <span style="color:#FF4500;float:right;">›</span></div>`).join('') + '</div>' },
  terms: { title: '📄 Terms & Conditions', body: '<p style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">By using Grabitt you agree to our Terms of Service. Key points: all payments via Stripe; no illegal items; no off-platform payments; Grabitt holds 8–2.5% fee depending on member grade. Full terms at grabitt.net/terms.</p>' },
  pricing: { title: '🏷️ Pricing', body: '<div style="font-family:Nunito,sans-serif;font-size:13px;color:#555;">' + [['🟠 Grabber','8%','0–10 sales'],['🟡 Dealer','6%','11–50 sales'],['🔵 Trader','4%','51–200 sales'],['⭐ Pro','2.5%','201+ sales']].map(([g, f, r]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;"><div><strong>${g}</strong><div style="font-size:11px;color:#888;">${r}</div></div><div style="font-weight:900;color:#FF4500;font-size:16px;">${f}</div></div>`).join('') + '</div>' },
  collection: { title: '🚚 Delivery & Collection', body: '<p style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">Most items on Grabitt are collected in person on Gran Canaria. Agree a safe public meeting point with your buyer/seller via Grabitt chat. Some sellers offer local delivery — check the listing details. Grabitt does not currently manage shipping or couriers.</p>' },
  scams: { title: '🛡️ Scam Centre', body: '<p style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">Never pay outside Grabitt. If you receive suspicious messages, report them immediately via the 🚨 Report button. See our Safety Shield (🆘 Help) for detailed scam patterns and how to avoid them.</p>' },
  economic: { title: '🪙 Economic Living', body: '<p style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">Grabitt believes in making island life more affordable. Buy second-hand to save money, sell what you no longer need, and keep goods in circulation. Every purchase local keeps the island economy strong.</p>' },
  policy: { title: "✅ Dos & Don'ts", body: '<div style="font-family:Nunito,sans-serif;font-size:13px;color:#555;">' + [['✅ DO','Use Grabitt chat','Meet in public','Rate every transaction','Report scams immediately'],['❌ DON\'T','Pay outside Grabitt','Share bank details','Meet strangers at home','Ignore a gut feeling']].map(([label, ...items]) => `<div style="margin-bottom:14px;"><strong style="color:${label.startsWith('✅') ? '#16a34a' : '#ef4444'};">${label}</strong>${items.map(i => `<div style="padding:4px 0;">${label.startsWith('✅') ? '• ' : '• '}${i}</div>`).join('')}</div>`).join('') + '</div>' },
  suggest: { title: '💡 Suggest an Idea', body: '<p style="font-family:Nunito,sans-serif;font-size:13px;color:#555;line-height:1.7;">We love feedback! Tell us what features you\'d like to see on Grabitt. Email us at <strong>ideas@grabitt.net</strong> or drop us a message on Instagram @grabittgc.</p>' },
}

interface ActionPanelProps {
  title: string
  children: React.ReactNode
  onClose: () => void
}

function ActionPanel({ title, children, onClose }: ActionPanelProps) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{title}</span>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

export default function PanelHost() {
  const { panel, closePanel, openPanel } = usePanel()
  const [shieldTab, setShieldTab] = useState<string>('promise')
  const [notifTab, setNotifTab] = useState<string>('all')

  if (!panel.id) return null

  // ── ALERTS / NOTIFICATIONS ──────────────────────────────────────────────────
  if (panel.id === 'alerts') {
    const tabs = ['all', 'bid', 'messages', 'price']
    const tabLabels: Record<string, string> = { all: 'All', bid: 'Bids', messages: 'Messages', price: 'Price drops' }
    const shown = notifTab === 'all' ? NOTIFS : NOTIFS.filter(n => n.type === notifTab)
    return (
      <ActionPanel title="🔔 Notifications" onClose={closePanel}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setNotifTab(t)} style={{ background: notifTab === t ? '#FF4500' : '#FFF3EE', color: notifTab === t ? '#fff' : '#FF4500', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>
        {shown.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-nunito)', fontSize: 12 }}>No notifications here yet.</div>}
        {shown.map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, background: '#FFF3EE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{n.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{n.title}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#666', marginTop: 2 }}>{n.body}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{n.time}</div>
          </div>
        ))}
      </ActionPanel>
    )
  }

  // ── SAVED / FAVOURITES ──────────────────────────────────────────────────────
  if (panel.id === 'saved') {
    return (
      <ActionPanel title="❤️ Saved Listings" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>No saved listings yet</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#666' }}>Tap the 🤍 on any listing to save it here.</div>
        </div>
      </ActionPanel>
    )
  }

  // ── REWARDS ────────────────────────────────────────────────────────────────
  if (panel.id === 'rewards') {
    return (
      <ActionPanel title="💶 Rewards & Credits" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,#FF4500,#FF8C00)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 28, fontWeight: 900, color: '#fff' }}>142</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Grabitt Credits</div>
        </div>
        {[['💶','Refer a friend','Earn 50 credits when they list their first item'],['⭐','Leave a review','Earn 10 credits per review'],['🛒','Make a purchase','Earn 5% back as credits'],['📦','List an item','Earn 5 credits per active listing']].map(([icon, title, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
          </div>
        ))}
      </ActionPanel>
    )
  }

  // ── LOGIN / PROFILE ─────────────────────────────────────────────────────────
  if (panel.id === 'login') {
    return (
      <ActionPanel title="👤 Join Grabitt" onClose={closePanel}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌴</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 18, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Welcome to Grabitt!</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#666' }}>Gran Canaria's local marketplace</div>
        </div>
        <a href="/auth" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginBottom: 10 }}>Log In</button>
        </a>
        <a href="/auth?mode=signup" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: '#fff', color: '#FF4500', border: '2px solid #FF4500', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Create Account</button>
        </a>
      </ActionPanel>
    )
  }

  // ── MESSAGES ────────────────────────────────────────────────────────────────
  if (panel.id === 'messages') {
    return (
      <ActionPanel title="💬 Messages" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>No messages yet</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#666' }}>When you message a seller or buyer, your conversations appear here.</div>
          <a href="/messages" onClick={closePanel} style={{ textDecoration: 'none' }}><button style={{ marginTop: 16, background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 24px', fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Open Messages</button></a>
        </div>
      </ActionPanel>
    )
  }

  // ── SELL ────────────────────────────────────────────────────────────────────
  if (panel.id === 'sell') {
    return (
      <ActionPanel title="📦 Sell on Grabitt" onClose={closePanel}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>List an item in 60 seconds</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#666' }}>Fees from 2.5% · Secure Stripe payments</div>
        </div>
        {[['🏡','Sell an item','List anything from furniture to electronics'],['💼','Post a job','Find staff or freelancers'],['🏠','List a property','Rent or sell a home'],['🔧','Offer a service','Plumbers, cleaners, tutors & more']].map(([icon, title, desc], i) => (
          <div key={i} onClick={closePanel} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#FF4500,#FF8C00)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
            <span style={{ color: '#FF4500', marginLeft: 'auto' }}>›</span>
          </div>
        ))}
        <a href="/listings/new" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>🚀 Start Listing</button>
        </a>
      </ActionPanel>
    )
  }

  // ── HELP / SAFETY SHIELD ────────────────────────────────────────────────────
  if (panel.id === 'shield' || panel.id === 'help') {
    const tabs = [{ id: 'promise', label: 'Our Promise' }, { id: 'rules', label: 'Golden Rules' }, { id: 'scams', label: 'Known Scams' }, { id: 'tips', label: 'Safety Tips' }, { id: 'report', label: 'Report' }]
    return (
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'linear-gradient(135deg,#F5E6D3,#E8D4B8 55%,#DFC9A8)', borderRadius: '24px 24px 0 0', padding: '18px 16px 16px', boxShadow: '0 4px 20px rgba(223,201,168,0.4)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" stroke="#dc2626" strokeWidth="2" strokeLinejoin="round"><path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z"/></svg>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 17, fontWeight: 900 }}>
                  <span style={{ color: '#FF4500' }}>Grab</span><span style={{ color: '#1a1a1a' }}>itt</span><span style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 14 }}> Safety Shield</span>
                </div>
              </div>
              <button onClick={closePanel} style={{ background: 'rgba(255,69,0,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#FF4500', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['🔒','Stripe Secured'],['👤','Verified Members'],['📍','Local & Trusted']].map(([icon, label]) => (
                <div key={label as string} style={{ flex: 1, background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '7px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15 }}>{icon}</div>
                  <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 9, fontWeight: 800, color: '#FF4500', marginTop: 1 }}>{label as string}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setShieldTab(t.id)} style={{ background: shieldTab === t.id ? '#FF4500' : 'rgba(255,255,255,0.5)', color: shieldTab === t.id ? '#fff' : '#FF4500', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowY: 'auto', padding: 16, flex: 1 }} dangerouslySetInnerHTML={{ __html: SHIELD_CONTENT[shieldTab] }} />
        </div>
      </div>
    )
  }

  // ── DEPT PANEL ──────────────────────────────────────────────────────────────
  if (panel.id === 'dept') {
    const name = (panel.data?.name as string) || 'Listings'
    const icon = (panel.data?.icon as string) || '🛍️'
    const grad = (panel.data?.grad as string) || 'linear-gradient(135deg,#FF4500,#FF8C00)'
    const items = DEPT_LISTINGS[name] || []
    return (
      <ActionPanel title={`${icon} ${name}`} onClose={closePanel}>
        {items.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-nunito)', fontSize: 12 }}>No listings in {name} right now.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {items.map(([emoji, title, price, location], i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #1a1a1a', borderRadius: 12, padding: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '100%', height: 64, background: CARD_GRADS[i % CARD_GRADS.length], borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 8 }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#FF4500' }}>{price}</div>
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-nunito)' }}>{location}</div>
              </div>
            </div>
          ))}
        </div>
      </ActionPanel>
    )
  }

  // ── GRAB IT NOW ─────────────────────────────────────────────────────────────
  if (panel.id === 'grabit') {
    const items = DEPT_LISTINGS['Grab It Now'] || []
    return (
      <ActionPanel title="⚡ Grabitt Now! — Flash Deals" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,#FF4500,#FF8C00)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 900, color: '#fff' }}>⚡ Limited time offers — grab them before they're gone!</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {items.map(([emoji, title, price, location], i) => (
            <div key={i} style={{ background: '#fff', border: '2px solid #FF4500', borderRadius: 12, padding: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,69,0,0.12)' }}>
              <div style={{ width: '100%', height: 64, background: CARD_GRADS[i % CARD_GRADS.length], borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 8 }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#FF4500', marginTop: 2 }}>{price}</div>
            </div>
          ))}
        </div>
      </ActionPanel>
    )
  }

  // ── SPONSORS ────────────────────────────────────────────────────────────────
  if (panel.id === 'sponsors') {
    return (
      <ActionPanel title="📢 Sponsors & Partners" onClose={closePanel}>
        {[
          { icon: '📦', name: 'Stash & Go', desc: 'Secure storage units across Gran Canaria. Book online, flexible terms.', badge: 'Featured Partner', color: '#1B6CA8' },
          { icon: '🚗', name: 'AutoGC', desc: 'Car hire from €29/day. Airport pickup available.', badge: 'Sponsor', color: '#16a34a' },
          { icon: '🏡', name: 'HomeFinder GC', desc: 'Property rental specialists. Free valuations.', badge: 'Sponsor', color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1.5px solid #f0f0f0', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, background: s.color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>{s.name}</div>
                <span style={{ background: s.color, color: '#fff', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-nunito)', padding: '2px 8px', borderRadius: 50 }}>{s.badge}</span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#555', lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
        <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#888', textAlign: 'center', marginTop: 8 }}>Want to advertise on Grabitt? Email ads@grabitt.net</div>
      </ActionPanel>
    )
  }

  // ── EMPLOYERS ───────────────────────────────────────────────────────────────
  if (panel.id === 'employers') {
    return (
      <ActionPanel title="🏢 Employer Dashboard" onClose={closePanel}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Post a Job on Grabitt</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 12, color: '#666' }}>Reach thousands of workers across Gran Canaria</div>
        </div>
        {[['✅','Free to post','Your first 3 job listings are completely free'],['👤','Verified candidates','Browse profiles with skills and ratings'],['💬','Direct messaging','Chat with applicants instantly'],['📊','Application tracking','See who applied and manage offers']].map(([icon, title, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
          </div>
        ))}
        <a href="/listings/new" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: 'linear-gradient(135deg,#2193b0,#6dd5ed)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>Post a Job Now</button>
        </a>
      </ActionPanel>
    )
  }

  // ── BUSINESS ────────────────────────────────────────────────────────────────
  if (panel.id === 'business') {
    return (
      <ActionPanel title="🏢 Business Account" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,#1a1a1a,#3a2a1a)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 20, fontWeight: 900, color: '#FF8C00', marginBottom: 4 }}>🏢 Business</div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 28, fontWeight: 900, color: '#fff' }}>€29<span style={{ fontSize: 14 }}>/mo</span></div>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>21-day free trial · Cancel anytime</div>
        </div>
        {[['📦','Up to 100 listings','vs 10 for standard members'],['🏢','Business badge','Stand out from individual sellers'],['📊','Analytics dashboard','See views, offers, and sales data'],['💬','Priority support','Dedicated business helpline'],['🌍','Multi-language listings','Reach German, Danish & Swedish buyers'],['⭐','Featured placement','Appear higher in search results']].map(([icon, title, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
          </div>
        ))}
        <button style={{ width: '100%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-nunito)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>Start Free Trial</button>
      </ActionPanel>
    )
  }

  // ── FOOTER PANELS ───────────────────────────────────────────────────────────
  if (panel.id === 'footer') {
    const key = panel.data?.key as string
    const content = FOOTER_CONTENT[key]
    if (!content) return null
    return (
      <ActionPanel title={content.title} onClose={closePanel}>
        <div dangerouslySetInnerHTML={{ __html: content.body }} />
      </ActionPanel>
    )
  }

  // ── GRABITT MENU ────────────────────────────────────────────────────────────
  if (panel.id === 'menu') {
    return (
      <ActionPanel title="Grabitt!" onClose={closePanel}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 28, fontWeight: 700 }}>
            <span style={{ color: '#FF4500' }}>Grab</span><span style={{ color: '#1a1a1a' }}>itt</span><span style={{ color: '#FF4500' }}>!</span>
          </div>
          <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 11, color: '#7a6a55', fontWeight: 700 }}>Your local everything</div>
        </div>
        {[['🏪','Browse all listings','/listings'],['📦','Sell something','/listings/new'],['💬','My messages','/messages'],['👤','My profile','/profile'],['🛡️','Safety Shield','#shield'],['ℹ️','About Grabitt','#about']].map(([icon, label, href], i) => (
          <a key={i} href={href as string} onClick={closePanel} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 14, padding: '13px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 800, color: '#1a1a1a', flex: 1 }}>{label as string}</div>
              <span style={{ color: '#ccc' }}>›</span>
            </div>
          </a>
        ))}
      </ActionPanel>
    )
  }

  // ── JUST LISTED ─────────────────────────────────────────────────────────────
  if (panel.id === 'justlisted') {
    const allItems: [string, string, string, string, string][] = []
    Object.entries(DEPT_LISTINGS).forEach(([dept, items]) => items.forEach(([e, t, p, l]) => allItems.push([e, t, p, l, dept])))
    allItems.sort(() => Math.random() - 0.5)
    return (
      <ActionPanel title={`🆕 Just Listed — ${allItems.length} items`} onClose={closePanel}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {allItems.map(([emoji, title, price, location, dept], i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #1a1a1a', borderRadius: 12, padding: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '100%', height: 64, background: CARD_GRADS[i % CARD_GRADS.length], borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 8 }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#FF4500' }}>{price}</div>
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-nunito)' }}>{location}</div>
              </div>
            </div>
          ))}
        </div>
      </ActionPanel>
    )
  }

  // ── NEAR ME ────────────────────────────────────────────────────────────────
  if (panel.id === 'near') {
    const town = (panel.data?.town as string) || 'Gran Canaria'
    const allItems: [string, string, string, string, string][] = []
    Object.entries(DEPT_LISTINGS).forEach(([dept, items]) => items.forEach(([e, t, p, l]) => allItems.push([e, t, p, l, dept])))
    const nearItems = allItems.filter(([, , , l]) => l.toLowerCase().includes(town.toLowerCase()))
    const restItems = allItems.filter(([, , , l]) => !l.toLowerCase().includes(town.toLowerCase()))
    const ordered = [...nearItems, ...restItems]
    return (
      <ActionPanel title={`📍 Near ${town}`} onClose={closePanel}>
        <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 12, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, color: '#FF4500' }}>📍 Showing items near {town}</div>
          <div style={{ fontSize: 10, color: '#a8460f', fontFamily: 'var(--font-nunito)', marginTop: 3 }}>{nearItems.length} nearby · 🔒 your location isn't stored</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ordered.slice(0, 30).map(([emoji, title, price, location], i) => {
            const isNear = nearItems.some(([, t]) => t === title)
            return (
              <div key={i} style={{ background: '#fff', border: `1px solid ${isNear ? '#FF4500' : '#1a1a1a'}`, borderRadius: 12, padding: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative' }}>
                {isNear && <div style={{ position: 'absolute', top: 6, right: 6, background: '#FF4500', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-nunito)', padding: '1px 6px', borderRadius: 50 }}>NEAR</div>}
                <div style={{ width: '100%', height: 64, background: CARD_GRADS[i % CARD_GRADS.length], borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 8 }}>{emoji}</div>
                <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 11, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#FF4500' }}>{price}</div>
                  <div style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-nunito)' }}>{location}</div>
                </div>
              </div>
            )
          })}
        </div>
      </ActionPanel>
    )
  }

  return null
}
