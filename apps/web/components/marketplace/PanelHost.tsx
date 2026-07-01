'use client'
import { useState, useEffect, useRef } from 'react'
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
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{title}</span>
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
            <button key={t} onClick={() => setNotifTab(t)} style={{ background: notifTab === t ? '#FF4500' : '#FFF3EE', color: notifTab === t ? '#fff' : '#FF4500', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>
        {shown.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No notifications here yet.</div>}
        {shown.map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, background: '#FFF3EE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{n.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{n.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', marginTop: 2 }}>{n.body}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{n.time}</div>
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
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>No saved listings yet</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Tap the 🤍 on any listing to save it here.</div>
        </div>
      </ActionPanel>
    )
  }

  // ── REWARDS ────────────────────────────────────────────────────────────────
  if (panel.id === 'rewards') {
    return (
      <ActionPanel title="💶 Rewards & Credits" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,#FF4500,#FF8C00)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 28, fontWeight: 900, color: '#fff' }}>142</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Grabitt Credits</div>
        </div>
        {[['💶','Refer a friend','Earn 50 credits when they list their first item'],['⭐','Leave a review','Earn 10 credits per review'],['🛒','Make a purchase','Earn 5% back as credits'],['📦','List an item','Earn 5 credits per active listing']].map(([icon, title, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
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
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Welcome to Grabitt!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Gran Canaria's local marketplace</div>
        </div>
        <a href="/auth" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginBottom: 10 }}>Log In</button>
        </a>
        <a href="/auth?mode=signup" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: '#fff', color: '#FF4500', border: '2px solid #FF4500', borderRadius: 14, padding: '14px 20px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>Create Account</button>
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
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>No messages yet</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>When you message a seller or buyer, your conversations appear here.</div>
          <a href="/messages" onClick={closePanel} style={{ textDecoration: 'none' }}><button style={{ marginTop: 16, background: '#FF4500', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 24px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Open Messages</button></a>
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
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>List an item in 60 seconds</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Fees from 2.5% · Secure Stripe payments</div>
        </div>
        {[['🏡','Sell an item','List anything from furniture to electronics'],['💼','Post a job','Find staff or freelancers'],['🏠','List a property','Rent or sell a home'],['🔧','Offer a service','Plumbers, cleaners, tutors & more']].map(([icon, title, desc], i) => (
          <div key={i} onClick={closePanel} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#FF4500,#FF8C00)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
            <span style={{ color: '#FF4500', marginLeft: 'auto' }}>›</span>
          </div>
        ))}
        <a href="/listings/new" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>🚀 Start Listing</button>
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
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 900 }}>
                  <span style={{ color: '#FF4500' }}>Grab</span><span style={{ color: '#1a1a1a' }}>itt</span><span style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 14 }}> Safety Shield</span>
                </div>
              </div>
              <button onClick={closePanel} style={{ background: 'rgba(255,69,0,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#FF4500', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['🔒','Stripe Secured'],['👤','Verified Members'],['📍','Local & Trusted']].map(([icon, label]) => (
                <div key={label as string} style={{ flex: 1, background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '7px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15 }}>{icon}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: '#FF4500', marginTop: 1 }}>{label as string}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setShieldTab(t.id)} style={{ background: shieldTab === t.id ? '#FF4500' : 'rgba(255,255,255,0.5)', color: shieldTab === t.id ? '#fff' : '#FF4500', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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

  // ── DEPT PANEL (§4.3) ───────────────────────────────────────────────────────
  if (panel.id === 'dept') {
    const name = (panel.data?.name as string) || 'Listings'
    const icon = (panel.data?.icon as string) || '🛍️'
    const items = DEPT_LISTINGS[name] || []

    const SUBCATS: Record<string, string[]> = {
      'Electronics':    ['All', 'Phones', 'Laptops', 'Audio', 'Cameras', 'Gaming', 'Wearables'],
      'Fashion':        ['All', "Women's", "Men's", "Kids'", 'Shoes', 'Accessories', 'Vintage'],
      'Home & Garden':  ['All', 'Furniture', 'Kitchen', 'Garden', 'Decor', 'DIY', 'Lighting'],
      'Jobs':           ['All', 'Hospitality', 'Construction', 'Cleaning', 'Office', 'IT', 'Driving'],
      'Sport':          ['All', 'Water Sports', 'Cycling', 'Football', 'Tennis', 'Gym', 'Golf'],
      'Gaming':         ['All', 'Consoles', 'Games', 'Accessories', 'PC Gaming', 'Retro'],
      'Property':       ['All', 'Rent', 'For Sale', 'Rooms', 'Commercial', 'Holiday'],
      'Health & Fitness':['All', 'Gym', 'Supplements', 'Running', 'Yoga', 'Medical'],
      'Kids & Baby':    ['All', 'Toys', 'Clothing', 'Prams', 'Books', 'Nursery'],
      'Pet Shop':       ['All', 'Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles', 'Services'],
      'Handy Help':     ['All', 'Plumbing', 'Electric', 'Cleaning', 'Building', 'Gardening'],
      'Food Store':     ['All', 'Bakery', 'Dairy', 'Wine', 'Oils', 'Coffee', 'Organic'],
      'Retro & Vintage':['All', 'Vinyl', 'Clothing', 'Electronics', 'Instruments', 'Collectables'],
      'Gift Ideas':     ['All', 'Experiences', 'Hampers', 'Beauty', 'Books', 'Jewellery'],
      'Grab It Now':    ['All', 'Electronics', 'Furniture', 'Fashion', 'Sport', 'Other'],
    }
    const subcats = SUBCATS[name] || ['All']

    const [activeSub, setActiveSub] = useState('All')
    const [sort, setSort] = useState('newest')

    return (
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 10px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>{icon} {name}</span>
            <button onClick={closePanel} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Subcategory chips */}
          <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: 6, padding: '10px 14px 8px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
            {subcats.map(sub => (
              <button key={sub} onClick={() => setActiveSub(sub)} style={{ flex: '0 0 auto', background: activeSub === sub ? 'var(--orange)' : '#FFF3EE', color: activeSub === sub ? '#fff' : 'var(--orange)', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {sub}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>Sort:</span>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ border: '1px solid #e0d8d0', borderRadius: 8, padding: '4px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--dark)', background: '#fff' }}>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="nearest">Nearest first</option>
            </select>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginLeft: 'auto' }}>{items.length} listings</span>
          </div>

          {/* Grid */}
          <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
            {items.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No listings in {name} right now.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {items.map(([emoji, title, price, location], i) => (
                <div key={i} onClick={() => openPanel('listing', { emoji, title, price, location, category: name, ref: `D${i}` })} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ width: '100%', paddingTop: '72%', background: CARD_GRADS[i % CARD_GRADS.length], position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{emoji}</div>
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{price}</div>
                      <div style={{ fontSize: 9, color: '#888', fontFamily: 'var(--font-ui)' }}>📍 {location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── GRAB IT NOW ─────────────────────────────────────────────────────────────
  if (panel.id === 'grabit') {
    const items = DEPT_LISTINGS['Grab It Now'] || []
    return (
      <ActionPanel title="⚡ Grabitt Now! — Flash Deals" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,#FF4500,#FF8C00)', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: '#fff' }}>⚡ Limited time offers — grab them before they're gone!</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {items.map(([emoji, title, price, location], i) => (
            <div key={i} style={{ background: '#fff', border: '2px solid #FF4500', borderRadius: 12, padding: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,69,0,0.12)' }}>
              <div style={{ width: '100%', height: 64, background: CARD_GRADS[i % CARD_GRADS.length], borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 8 }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
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
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>{s.name}</div>
                <span style={{ background: s.color, color: '#fff', fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '2px 8px', borderRadius: 50 }}>{s.badge}</span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', textAlign: 'center', marginTop: 8 }}>Want to advertise on Grabitt? Email ads@grabitt.net</div>
      </ActionPanel>
    )
  }

  // ── EMPLOYERS ───────────────────────────────────────────────────────────────
  if (panel.id === 'employers') {
    return (
      <ActionPanel title="🏢 Employer Dashboard" onClose={closePanel}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏢</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>Post a Job on Grabitt</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Reach thousands of workers across Gran Canaria</div>
        </div>
        {[['✅','Free to post','Your first 3 job listings are completely free'],['👤','Verified candidates','Browse profiles with skills and ratings'],['💬','Direct messaging','Chat with applicants instantly'],['📊','Application tracking','See who applied and manage offers']].map(([icon, title, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
          </div>
        ))}
        <a href="/listings/new" onClick={closePanel} style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: 'linear-gradient(135deg,#2193b0,#6dd5ed)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>Post a Job Now</button>
        </a>
      </ActionPanel>
    )
  }

  // ── BUSINESS ────────────────────────────────────────────────────────────────
  if (panel.id === 'business') {
    return (
      <ActionPanel title="🏢 Business Account" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,#1a1a1a,#3a2a1a)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 900, color: '#FF8C00', marginBottom: 4 }}>🏢 Business</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 28, fontWeight: 900, color: '#fff' }}>€29<span style={{ fontSize: 14 }}>/mo</span></div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>21-day free trial · Cancel anytime</div>
        </div>
        {[['📦','Up to 100 listings','vs 10 for standard members'],['🏢','Business badge','Stand out from individual sellers'],['📊','Analytics dashboard','See views, offers, and sales data'],['💬','Priority support','Dedicated business helpline'],['🌍','Multi-language listings','Reach German, Danish & Swedish buyers'],['⭐','Featured placement','Appear higher in search results']].map(([icon, title, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>{title as string}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>{desc as string}</div></div>
          </div>
        ))}
        <button style={{ width: '100%', background: 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>Start Free Trial</button>
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
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700 }}>
            <span style={{ color: '#FF4500' }}>Grab</span><span style={{ color: '#1a1a1a' }}>itt</span><span style={{ color: '#FF4500' }}>!</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#7a6a55', fontWeight: 700 }}>Your local everything</div>
        </div>
        {[['🏪','Browse all listings','/listings'],['📦','Sell something','/listings/new'],['💬','My messages','/messages'],['👤','My profile','/profile'],['🛡️','Safety Shield','#shield'],['ℹ️','About Grabitt','#about']].map(([icon, label, href], i) => (
          <a key={i} href={href as string} onClick={closePanel} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', gap: 14, padding: '13px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: '#1a1a1a', flex: 1 }}>{label as string}</div>
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
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#FF4500' }}>{price}</div>
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-ui)' }}>{location}</div>
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
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#FF4500' }}>📍 Showing items near {town}</div>
          <div style={{ fontSize: 10, color: '#a8460f', fontFamily: 'var(--font-ui)', marginTop: 3 }}>{nearItems.length} nearby · 🔒 your location isn't stored</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ordered.slice(0, 30).map(([emoji, title, price, location], i) => {
            const isNear = nearItems.some(([, t]) => t === title)
            return (
              <div key={i} style={{ background: '#fff', border: `1px solid ${isNear ? '#FF4500' : '#1a1a1a'}`, borderRadius: 12, padding: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative' }}>
                {isNear && <div style={{ position: 'absolute', top: 6, right: 6, background: '#FF4500', color: '#fff', fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '1px 6px', borderRadius: 50 }}>NEAR</div>}
                <div style={{ width: '100%', height: 64, background: CARD_GRADS[i % CARD_GRADS.length], borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 8 }}>{emoji}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#FF4500' }}>{price}</div>
                  <div style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-ui)' }}>{location}</div>
                </div>
              </div>
            )
          })}
        </div>
      </ActionPanel>
    )
  }

  // ── LISTING DETAIL (§4.4) ──────────────────────────────────────────────────
  if (panel.id === 'listing') {
    const item = panel.data as Record<string, unknown>
    const emoji    = (item.emoji    as string) || '🛍️'
    const title    = (item.title    as string) || 'Item'
    const price    = (item.price    as string) || '€0'
    const location = (item.location as string) || 'Gran Canaria'
    const category = (item.category as string) || ''
    const condition= (item.condition as string) || ''
    const isFeatured = !!item.isFeatured

    const SIMILAR = [
      { emoji: '📱', title: 'Samsung S24', price: '€580', location: 'Las Palmas' },
      { emoji: '💻', title: 'iPad Pro 12.9"', price: '€720', location: 'Telde' },
      { emoji: '🎧', title: 'Sony WH-1000XM5', price: '€220', location: 'Maspalomas' },
      { emoji: '🖥️', title: 'Dell Monitor 27"', price: '€190', location: 'Las Palmas' },
    ]

    return (
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          {/* Hero */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '100%', paddingTop: '52%', background: '#f5f0e8', borderRadius: '24px 24px 0 0', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 88 }}>{emoji}</div>
              {isFeatured && <div style={{ position: 'absolute', top: 12, left: 14, background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>👀 FEATURED</div>}
            </div>
            <button onClick={closePanel} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <button style={{ position: 'absolute', top: 12, right: 56, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤍</button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px 24px' }}>
            {/* Demand signals */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ background: '#FFF3EE', color: 'var(--orange)', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>👁 42 views today</span>
              <span style={{ background: '#FFF3EE', color: 'var(--orange)', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>⚡ 7 watching</span>
            </div>

            {/* Title + price */}
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2, marginBottom: 6 }}>{title}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 700, color: 'var(--orange)', marginBottom: 14 }}>{price}</div>

            {/* Seller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f9f6f2', borderRadius: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>@seller_GC</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '1px 6px', borderRadius: 50 }}>🟠 Grabber</span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>⭐ 4.8 · 34 sales</span>
                </div>
              </div>
              <button style={{ background: 'var(--ocean)', color: '#fff', border: 'none', borderRadius: 50, padding: '7px 13px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>Message</button>
            </div>

            {/* Tag pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {condition && <span style={{ background: '#edf7ed', color: 'var(--sage)', border: '1px solid var(--sage)', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>{condition}</span>}
              {category  && <span style={{ background: '#f5f0e8', color: '#555', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>{category}</span>}
              <span style={{ background: '#f5f0e8', color: '#555', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>📍 {location}</span>
              <span style={{ background: '#f5f0e8', color: '#555', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-ui)', padding: '3px 9px', borderRadius: 50 }}>🤝 Collection</span>
            </div>

            {/* Description */}
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.65, marginBottom: 14 }}>
              Great condition — selling due to upgrade. Happy to answer any questions via Grabitt chat. Pickup preferred; local delivery available for a small fee. Cash or Grabitt Pay accepted.
            </div>

            {/* Map placeholder */}
            <div style={{ background: '#eee', borderRadius: 12, padding: 18, textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 30, marginBottom: 4 }}>📍</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>{location}, Gran Canaria</div>
            </div>

            {/* Similar listings */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>Similar listings</div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {SIMILAR.map((sim, i) => (
                  <div key={i} onClick={() => openPanel('listing', { ...sim, ref: `SIM${i}`, category })} style={{ flex: '0 0 120px', background: '#fff', border: '1px solid #e8e0d5', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ width: '100%', paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{sim.emoji}</div>
                    </div>
                    <div style={{ padding: '6px 8px 8px' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sim.title}</div>
                      <div style={{ fontFamily: 'Georgia,serif', fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>{sim.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '15px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                Buy Now
              </button>
              <button style={{ flex: 1, background: '#fff', color: 'var(--orange)', border: '2px solid var(--orange)', borderRadius: 14, padding: '15px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                Make Offer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SEARCH RESULTS ──────────────────────────────────────────────────────────
  if (panel.id === 'search') {
    const q         = (panel.data?.q as string) || ''
    const featured  = !!panel.data?.featured
    const [sort, setSort] = useState('newest')
    const FILTERS   = ['All', 'Electronics', 'Fashion', 'Sport', 'Home', 'Jobs', 'Property']
    const [filterIdx, setFilterIdx] = useState(0)

    const ALL_RESULTS = Object.entries(DEPT_LISTINGS).flatMap(([dept, items]) =>
      items.map(([e, t, p, l]) => ({ emoji: e, title: t, price: p, location: l, category: dept }))
    ).filter(item =>
      !q || item.title.toLowerCase().includes(q.toLowerCase()) ||
            item.category.toLowerCase().includes(q.toLowerCase())
    )

    const sorted = [...ALL_RESULTS].sort(() => Math.random() - 0.5)

    return (
      <ActionPanel title={featured ? '👀 Featured Listings' : `🔍 "${q}" — ${ALL_RESULTS.length} results`} onClose={closePanel}>
        {/* Sort + filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map((f, i) => (
            <button key={f} onClick={() => setFilterIdx(i)} style={{ flex: '0 0 auto', background: filterIdx === i ? 'var(--orange)' : '#FFF3EE', color: filterIdx === i ? '#fff' : 'var(--orange)', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', flexShrink: 0 }}>Sort:</span>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ flex: 1, border: '1px solid #e0d8d0', borderRadius: 8, padding: '5px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--dark)' }}>
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="nearest">Nearest first</option>
          </select>
          <button
            onClick={() => openPanel('savesearch', { q, category: FILTERS[filterIdx] })}
            style={{ flexShrink: 0, background: '#FFF3EE', color: 'var(--orange)', border: '1px solid var(--orange)', borderRadius: 50, padding: '5px 10px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}
          >
            🔖 Save
          </button>
        </div>
        {sorted.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No results for "{q}".</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {sorted.slice(0, 30).map((item, i) => (
                <div key={i} onClick={() => openPanel('listing', { ...item, ref: `SR${i}` })} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ width: '100%', paddingTop: '72%', background: '#f5f0e8', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{item.emoji}</div>
                  </div>
                  <div style={{ padding: '8px 8px 10px' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{item.price}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#888', marginTop: 2 }}>📍 {item.location}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </ActionPanel>
    )
  }

  // ── SAVE SEARCH PANEL ────────────────────────────────────────────────────────
  if (panel.id === 'savesearch') {
    const q        = (panel.data?.q as string) || ''
    const category = (panel.data?.category as string) || 'All'
    const [name, setName] = useState(q || category)
    const [channel, setChannel] = useState<'email' | 'push' | 'both'>('push')

    return (
      <ActionPanel title="🔖 Save this Search" onClose={closePanel}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Search name</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder='e.g. "iPhone Las Palmas"'
            style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 8 }}>Alert channel</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['push', 'email', 'both'] as const).map(ch => (
              <button key={ch} onClick={() => setChannel(ch)} style={{ flex: 1, background: channel === ch ? 'var(--orange)' : '#fff', color: channel === ch ? '#fff' : '#555', border: `1.5px solid ${channel === ch ? 'var(--orange)' : '#e0d8d0'}`, borderRadius: 10, padding: '10px 4px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                {ch === 'push' ? '📲 Push' : ch === 'email' ? '📧 Email' : '🔔 Both'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { alert(`Saved "${name}" via ${channel}`); closePanel() }}
          style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}
        >
          🔖 Save Search
        </button>
      </ActionPanel>
    )
  }

  // ── SAVED SEARCHES LIST ──────────────────────────────────────────────────────
  if (panel.id === 'savedSearches') {
    const MOCK_SAVED = [
      { name: 'iPhone Las Palmas', query: 'iPhone', channel: '📲 Push', count: 3, time: '2h ago' },
      { name: 'Studio flat to rent', query: 'studio flat', channel: '📧 Email', count: 7, time: '1d ago' },
      { name: 'Mountain bike', query: 'mountain bike', channel: '🔔 Both', count: 1, time: '3d ago' },
    ]
    return (
      <ActionPanel title="🔖 Saved Searches" onClose={closePanel}>
        {MOCK_SAVED.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No saved searches yet. Use the 🔖 Save button in search results.</div>
          : MOCK_SAVED.map((s, i) => (
            <div key={i} onClick={() => openPanel('search', { q: s.query })} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, background: '#FFF3EE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 2 }}>{s.channel} · {s.count} new · {s.time}</div>
              </div>
              <span style={{ color: 'var(--orange)', fontSize: 16 }}>›</span>
            </div>
          ))
        }
        <button
          onClick={() => openPanel('savesearch', {})}
          style={{ width: '100%', background: '#FFF3EE', color: 'var(--orange)', border: '1.5px solid var(--orange)', borderRadius: 14, padding: '12px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginTop: 14 }}
        >
          + Save a new search
        </button>
      </ActionPanel>
    )
  }

  // ── OFFERS ──────────────────────────────────────────────────────────────────
  if (panel.id === 'offers') {
    return (
      <ActionPanel title="💰 Offers" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>No offers yet</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Offers you make or receive on listings appear here.</div>
        </div>
      </ActionPanel>
    )
  }

  // ── PURCHASES ───────────────────────────────────────────────────────────────
  if (panel.id === 'purchases') {
    return (
      <ActionPanel title="🛒 Purchases" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>No purchases yet</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Items you buy via Grabitt Pay appear here.</div>
          <a href="/auth" onClick={closePanel} style={{ textDecoration: 'none' }}>
            <button style={{ marginTop: 16, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 24px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Log in to view</button>
          </a>
        </div>
      </ActionPanel>
    )
  }

  // ── MY LISTINGS ─────────────────────────────────────────────────────────────
  if (panel.id === 'mylistings') {
    return (
      <ActionPanel title="📋 My Listings" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>No active listings</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666', marginBottom: 16 }}>Items you list for sale appear here.</div>
          <button onClick={() => openPanel('sell')} style={{ background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 24px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>+ New Listing</button>
        </div>
      </ActionPanel>
    )
  }

  // ── WISHLIST ─────────────────────────────────────────────────────────────────
  if (panel.id === 'wishlist') {
    return (
      <ActionPanel title="🤞 Wishlist" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤞</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Wishlist is empty</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Add items you're looking for — we'll alert you when they're listed.</div>
        </div>
      </ActionPanel>
    )
  }

  // ── FAVOURITES ──────────────────────────────────────────────────────────────
  if (panel.id === 'favourites') {
    return (
      <ActionPanel title="❤️ Favourites" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>No favourites yet</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Tap 🤍 on any listing to add it here.</div>
        </div>
      </ActionPanel>
    )
  }

  // ── INVITE FRIENDS ───────────────────────────────────────────────────────────
  if (panel.id === 'invite') {
    return (
      <ActionPanel title="➕ Invite Friends" onClose={closePanel}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎁</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>Earn 50 credits per referral!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666', lineHeight: 1.5 }}>Invite friends to Grabitt. When they list their first item, you both earn 50 credits.</div>
        </div>
        <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 4 }}>Your referral link</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>grabitt.net/join?ref=USER123</div>
        </div>
        {[['WhatsApp', '💚'], ['Copy link', '🔗'], ['Share on Facebook', '📘'], ['Share via Email', '📧']].map(([label, icon]) => (
          <button key={label as string} style={{ width: '100%', background: '#fff', color: 'var(--dark)', border: '1.5px solid #e0d8d0', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 8, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon as string}</span>{label as string}
          </button>
        ))}
      </ActionPanel>
    )
  }

  // ── RECENTLY VIEWED ──────────────────────────────────────────────────────────
  if (panel.id === 'recentviewed') {
    return (
      <ActionPanel title="👁 Recently Viewed" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👁</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Nothing yet</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Listings you view appear here for easy access.</div>
        </div>
      </ActionPanel>
    )
  }

  // ── SOLD PRICES ──────────────────────────────────────────────────────────────
  if (panel.id === 'soldprices') {
    const SOLD = [
      { emoji: '📱', title: 'iPhone 13 — 128GB', price: '€480', date: '28 Jun', location: 'Las Palmas' },
      { emoji: '🚴', title: 'Road Bike — Carbon', price: '€640', date: '26 Jun', location: 'Maspalomas' },
      { emoji: '💻', title: 'Dell XPS 15', price: '€720', date: '25 Jun', location: 'Telde' },
      { emoji: '🛋️', title: 'L-Shape Sofa', price: '€220', date: '24 Jun', location: 'Las Palmas' },
      { emoji: '🎮', title: 'PS5 Digital Edition', price: '€350', date: '22 Jun', location: 'Playa del Inglés' },
    ]
    return (
      <ActionPanel title="📊 Sold Prices" onClose={closePanel}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 14 }}>Recent completed sales across Gran Canaria</div>
        {SOLD.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, background: '#f5f0e8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{s.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 2 }}>📍 {s.location} · {s.date}</div>
            </div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 15, fontWeight: 700, color: 'var(--sage)', flexShrink: 0 }}>SOLD {s.price}</div>
          </div>
        ))}
      </ActionPanel>
    )
  }

  // ── ADVERTISE ────────────────────────────────────────────────────────────────
  if (panel.id === 'advertise') {
    return (
      <ActionPanel title="📣 Advertise on Grabitt" onClose={closePanel}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>📣</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>Reach Gran Canaria buyers</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Thousands of daily active users across the island</div>
        </div>
        {[
          { name: '⭐ Featured Listing', price: '€1.99/week', desc: 'Boost visibility in search & category pages' },
          { name: '🏷️ Banner Ad (300×600)', price: '€49/month', desc: 'Sidebar slot on dept and search panels' },
          { name: '📧 Eshot Campaign', price: '€99/blast', desc: 'Direct email to opted-in members in your area' },
        ].map((p, i) => (
          <div key={i} style={{ background: '#fff', border: '1.5px solid #e8e0d5', borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{p.name}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--orange)' }}>{p.price}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>{p.desc}</div>
          </div>
        ))}
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', textAlign: 'center', marginTop: 6 }}>
          Enquire: ads@grabitt.net
        </div>
      </ActionPanel>
    )
  }

  return null
}
