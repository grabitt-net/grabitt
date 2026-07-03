'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePanel } from '@/context/PanelContext'
import { useChat } from '@/hooks/useChat'
import { useNotifications, kindIcon, kindTab, relativeTime } from '@/hooks/useNotifications'
import { createTrpcClient } from '@/lib/trpc'
import { createClient } from '@/lib/supabase'
import { compressAndUpload, listingPhotoPath } from '@/lib/storage'

async function getTrpcClient() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return createTrpcClient(session?.access_token ?? undefined)
}

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

// PanelHost only decides *whether* a panel is open. The body is rendered as a
// separate component keyed by panel.id so that switching between panels
// remounts a fresh instance. Individual panel branches below declare their own
// hooks; keying on panel.id guarantees each mounted instance always runs the
// same hook sequence for its lifetime, which is what React requires (prevents
// error #310 when moving between panels with different hook counts).
export default function PanelHost() {
  const { panel } = usePanel()
  if (!panel.id) return null
  return <PanelBody key={panel.id} />
}

// Seller records the courier tracking number for a delivery order. Funds are
// released automatically when the tracking webhook reports the first scan —
// the seller does not release funds here.
function CourierTrackingForm({ transactionId, title, onClose }: { transactionId: string; title: string; onClose: () => void }) {
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      const client = await getTrpcClient()
      await client.transactions.submitTracking.mutate({ transactionId, carrier: carrier.trim(), trackingNumber: trackingNumber.trim() })
      setDone(true)
    } catch (err) {
      setError((err as Error).message || 'Failed to submit tracking')
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <ActionPanel title="📦 Tracking added" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>📦</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Tracking submitted</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 20 }}>
          Your payment for "{title}" will be released automatically once the courier's first scan shows the parcel in transit.
        </div>
        <button onClick={onClose} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 28px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Done</button>
      </div>
    </ActionPanel>
  )

  return (
    <ActionPanel title="📦 Add courier tracking" onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
        Post <strong>{title}</strong> by a tracked courier and enter the details below. You'll be paid automatically once tracking shows the parcel in transit — no QR needed.
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Courier</div>
        <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Correos, SEUR, DHL, GLS"
          style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Tracking number</div>
        <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="e.g. PK123456789ES"
          style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px', fontFamily: 'monospace', fontSize: 14, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {error && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'red', marginBottom: 10 }}>{error}</div>}
      <button onClick={submit} disabled={saving || !carrier.trim() || trackingNumber.trim().length < 3}
        style={{ width: '100%', background: (saving || !carrier.trim() || trackingNumber.trim().length < 3) ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
        {saving ? '⏳ Submitting…' : 'Submit tracking →'}
      </button>
    </ActionPanel>
  )
}

function PanelBody() {
  const { panel, closePanel, openPanel } = usePanel()
  const [shieldTab, setShieldTab] = useState<string>('promise')
  const [notifTab, setNotifTab] = useState<string>('all')

  // Auth state — in production this comes from Supabase auth session
  // For now we read from localStorage so auth panel can set it
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUserId(localStorage.getItem('grabitt_uid'))
    }
  }, [])

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(currentUserId)

  if (!panel.id) return null

  // ── ALERTS / NOTIFICATIONS ──────────────────────────────────────────────────
  if (panel.id === 'alerts') {
    const TABS = ['all', 'bid', 'messages', 'price'] as const
    const TAB_LABELS: Record<string, string> = { all: 'All', bid: 'Offers & Tx', messages: 'Messages', price: 'Price drops' }

    // Fall back to stub data when no user is logged in
    const STUB_NOTIFS = [
      { id: 's1', kind: 'offer_received',   title: 'Offer received!',   body: 'Dave M. offered €85 on your Surfboard', readAt: null,  createdAt: new Date(Date.now()-120000).toISOString() },
      { id: 's2', kind: 'new_message',      title: 'New message',       body: 'Maria: "Is the bike still available?"',  readAt: null,  createdAt: new Date(Date.now()-480000).toISOString() },
      { id: 's3', kind: 'price_drop',       title: 'Price drop!',       body: 'MacBook Air M2 dropped to €890',         readAt: '.',   createdAt: new Date(Date.now()-3600000).toISOString() },
      { id: 's4', kind: 'review_received',  title: 'New review',        body: 'Emma gave you 5 stars! ⭐⭐⭐⭐⭐',      readAt: '.',   createdAt: new Date(Date.now()-7200000).toISOString() },
      { id: 's5', kind: 'offer_accepted',   title: 'Counter offer',     body: 'Seller countered at €300 on Guitar',     readAt: '.',   createdAt: new Date(Date.now()-18000000).toISOString() },
    ]
    const displayNotifs = currentUserId ? notifications : STUB_NOTIFS

    const shown = notifTab === 'all'
      ? displayNotifs
      : displayNotifs.filter(n => kindTab(n.kind) === notifTab)

    // Mark unread as read when panel opens
    useEffect(() => {
      if (!currentUserId) return
      const unreadIds = notifications.filter(n => !n.readAt).map(n => n.id)
      if (unreadIds.length) markRead(unreadIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <ActionPanel title="🔔 Notifications" onClose={closePanel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setNotifTab(t)} style={{ background: notifTab === t ? 'var(--orange)' : '#FFF3EE', color: notifTab === t ? '#fff' : 'var(--orange)', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          {currentUserId && unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--orange)', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 0 0 8px' }}>Mark all read</button>
          )}
        </div>
        {shown.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No notifications here yet.</div>}
        {shown.map((n) => (
          <div key={n.id} onClick={() => currentUserId && markRead([n.id])}
            style={{ display: 'flex', gap: 12, borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start', cursor: 'pointer', background: !n.readAt ? '#fffaf8' : 'transparent', margin: '0 -16px', padding: '12px 16px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, background: '#FFF3EE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{kindIcon(n.kind)}</div>
              {!n.readAt && <div style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, background: 'var(--orange)', borderRadius: '50%', border: '2px solid #fff' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: !n.readAt ? 900 : 700, color: 'var(--dark)' }}>{n.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', marginTop: 2 }}>{n.body}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{relativeTime(n.createdAt)}</div>
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
    const [authStep, setAuthStep] = useState<'choose'|'login'|'register'|'forgot'|'verify'|'done'>('choose')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const fakeSubmit = async () => {
      setError('')
      setLoading(true)
      await new Promise(r => setTimeout(r, 1100))
      setLoading(false)
      if (authStep === 'forgot') { setAuthStep('verify'); return }
      if (authStep === 'register') { setAuthStep('verify'); return }
      setAuthStep('done')
    }

    const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '12px 12px', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }
    const btnPrimary: React.CSSProperties = { width: '100%', background: loading ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 10 }
    const btnGhost: React.CSSProperties = { width: '100%', background: '#fff', color: 'var(--orange)', border: '2px solid var(--orange)', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginBottom: 10 }
    const link: React.CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--orange)', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', padding: 0 }

    if (authStep === 'done') return (
      <ActionPanel title="✅ Welcome!" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>🌴</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>You're in!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 20 }}>Welcome back to Gran Canaria's marketplace.</div>
          <button onClick={closePanel} style={btnPrimary}>Start browsing →</button>
        </div>
      </ActionPanel>
    )

    if (authStep === 'verify') return (
      <ActionPanel title="📧 Check your email" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>📧</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>
            {authStep === 'verify' && password === '' ? 'Reset link sent!' : 'Confirm your email'}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 20 }}>
            We sent a link to <strong>{email}</strong>. Click it to {password === '' ? 'reset your password' : 'activate your account'}.
          </div>
          <div style={{ background: '#f9f6f2', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            {['Check your spam / junk folder','The link expires in 24 hours','You can resend from the login screen'].map((tip, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', padding: '3px 0' }}>· {tip}</div>
            ))}
          </div>
          <button onClick={() => setAuthStep('login')} style={btnPrimary}>Back to login</button>
        </div>
      </ActionPanel>
    )

    return (
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {authStep !== 'choose' && (
                <button onClick={() => { setAuthStep('choose'); setError('') }} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--orange)', cursor: 'pointer', padding: 0 }}>‹</button>
              )}
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 900, color: 'var(--dark)' }}>
                  {authStep === 'choose' ? '🌴 Grabitt' : authStep === 'login' ? 'Log in' : authStep === 'register' ? 'Create account' : 'Forgot password'}
                </div>
                {authStep === 'choose' && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>Gran Canaria's local marketplace</div>}
              </div>
            </div>
            <button onClick={closePanel} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>

            {authStep === 'choose' && (
              <>
                <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                  <div style={{ fontSize: 52, marginBottom: 10 }}>🌴</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>Buy, sell & connect on the island</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>50 free credits when you join · Secure Stripe payments</div>
                </div>

                {/* Social buttons */}
                {[['🇬 Continue with Google', '#4285F4'],['🍎 Continue with Apple', '#000']].map(([label, bg], i) => (
                  <button key={i} onClick={() => setAuthStep('done')} style={{ width: '100%', background: bg as string, color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>{label as string}</button>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}>
                  <div style={{ flex: 1, height: 1, background: '#e0d8d0' }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#aaa' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: '#e0d8d0' }} />
                </div>

                <button onClick={() => setAuthStep('login')} style={btnPrimary}>Log in with email</button>
                <button onClick={() => setAuthStep('register')} style={btnGhost}>Create account</button>

                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#aaa', textAlign: 'center', lineHeight: 1.5, marginTop: 8 }}>
                  By continuing you agree to our <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Terms</span> and <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>
                </div>
              </>
            )}

            {authStep === 'login' && (
              <>
                {error && <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>}
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={inputStyle} />
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type={showPass ? 'text' : 'password'} style={{ ...inputStyle, marginBottom: 0, paddingRight: 44 }} />
                  <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}>{showPass ? '🙈' : '👁'}</button>
                </div>
                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                  <button onClick={() => setAuthStep('forgot')} style={link}>Forgot password?</button>
                </div>
                <button onClick={fakeSubmit} disabled={loading || !email || !password} style={btnPrimary}>{loading ? '⏳ Logging in…' : 'Log In'}</button>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>No account? </span>
                  <button onClick={() => setAuthStep('register')} style={link}>Create one</button>
                </div>
              </>
            )}

            {authStep === 'register' && (
              <>
                {error && <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>}
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={inputStyle} />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)" type="tel" style={inputStyle} />
                <div style={{ position: 'relative' }}>
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Create password (min 8 chars)" type={showPass ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 44 }} />
                  <button onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}>{showPass ? '🙈' : '👁'}</button>
                </div>

                {/* Password strength */}
                {password && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                      {[...Array(4)].map((_, i) => {
                        const strength = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
                        return <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < strength ? (strength < 2 ? '#ef4444' : strength < 4 ? '#f59e0b' : 'var(--sage)') : '#e0d8d0' }} />
                      })}
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>
                      {[password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length < 2 ? 'Weak' : [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length < 4 ? 'Good' : 'Strong'}
                    </div>
                  </div>
                )}

                {/* Referral bonus */}
                <div style={{ background: '#f0fdf4', border: '1px solid var(--sage)', borderRadius: 12, padding: 12, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 22 }}>🎁</span>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--sage)', fontWeight: 800 }}>You'll get 50 free credits on sign-up!</div>
                </div>

                <button onClick={fakeSubmit} disabled={loading || !name || !email || password.length < 8} style={{ ...btnPrimary, background: loading || !name || !email || password.length < 8 ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))' }}>
                  {loading ? '⏳ Creating account…' : '🚀 Create Account'}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888' }}>Already have one? </span>
                  <button onClick={() => setAuthStep('login')} style={link}>Log in</button>
                </div>
              </>
            )}

            {authStep === 'forgot' && (
              <>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
                  Enter your email and we'll send a reset link.
                </div>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={inputStyle} />
                <button onClick={fakeSubmit} disabled={loading || !email} style={{ ...btnPrimary, background: loading || !email ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))' }}>
                  {loading ? '⏳ Sending…' : 'Send Reset Link'}
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ── MESSAGES ────────────────────────────────────────────────────────────────
  if (panel.id === 'messages') {
    const THREADS = [
      { id: 'T1', avatar: '👩', handle: '@buyer_maria',  listing: 'iPhone 14 Pro', last: 'Is it still available?',     time: '2m',  unread: 2 },
      { id: 'T2', avatar: '👨', handle: '@seller_pete',  listing: 'Road Bike',     last: 'Yes, collection tomorrow?', time: '1h',  unread: 0 },
      { id: 'T3', avatar: '🧑', handle: '@buyer_anna',   listing: 'MacBook Air M2',last: 'OK sounds good 👍',          time: '3h',  unread: 0 },
    ]
    return (
      <ActionPanel title="💬 Messages" onClose={closePanel}>
        {THREADS.map(t => (
          <div key={t.id} onClick={() => openPanel('chatThread', { threadId: t.id, handle: t.handle, listing: t.listing, avatar: t.avatar })}
            style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, background: '#FFF3EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{t.avatar}</div>
              {t.unread > 0 && <div style={{ position: 'absolute', top: -2, right: -2, background: 'var(--orange)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.unread}</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>{t.handle}</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#aaa' }}>{t.time}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginBottom: 1 }}>{t.listing}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: t.unread > 0 ? 'var(--dark)' : '#aaa', fontWeight: t.unread > 0 ? 800 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.last}</div>
            </div>
          </div>
        ))}
      </ActionPanel>
    )
  }

  if (panel.id === 'chatThread') {
    const { threadId, handle, listing, avatar, currentUserId } = (panel.data || {}) as {
      threadId: string; handle: string; listing: string; avatar: string; currentUserId: string
    }
    const { messages: realtimeMsgs, loading: chatLoading, sendMessage } = useChat(threadId || null, currentUserId || null)
    const [draft, setDraft] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    // Stub messages shown when no real threadId (demo mode)
    const STUB = [
      { id: 's1', sender_id: 'them', body: 'Hi! Is this still available?', created_at: new Date(Date.now() - 600000).toISOString() },
      { id: 's2', sender_id: currentUserId || 'me', body: 'Yes, still available 👍', created_at: new Date(Date.now() - 300000).toISOString() },
      { id: 's3', sender_id: 'them', body: 'Great — can I collect today?', created_at: new Date(Date.now() - 60000).toISOString() },
    ]
    const displayMsgs = threadId ? realtimeMsgs : STUB

    // Scroll to bottom on new messages
    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [displayMsgs.length])

    const send = useCallback(async () => {
      if (!draft.trim()) return
      const text = draft.trim()
      setDraft('')
      if (threadId) {
        await sendMessage(text)
      }
      // In stub/demo mode the input just clears — no optimistic update needed
    }, [draft, threadId, sendMessage])

    const fmtTime = (iso: string) => {
      const d = new Date(iso)
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
    }

    return (
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', height: '88vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <button onClick={() => openPanel('messages')} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--orange)', cursor: 'pointer', padding: 0 }}>‹</button>
            <div style={{ width: 38, height: 38, background: '#FFF3EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{avatar || '👤'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>{handle || 'Unknown'}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>re: {listing || 'Item'}</div>
            </div>
            <button onClick={closePanel} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 14, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Contact-info warning */}
          <div style={{ background: '#FFF3EE', padding: '6px 14px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#a8460f' }}>🔒 Keep conversations on Grabitt — sharing phone/email violates our terms.</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatLoading && (
              <div style={{ textAlign: 'center', padding: 20, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#aaa' }}>Loading messages…</div>
            )}
            {displayMsgs.map((m) => {
              const isMe = m.sender_id === (currentUserId || 'me')
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '72%',
                    background: isMe ? 'linear-gradient(135deg,var(--orange),var(--orange2))' : '#f5f0e8',
                    color: isMe ? '#fff' : 'var(--dark)',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 13px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: 1.45 }}>{m.body}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>{fmtTime(m.created_at)}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Compose bar */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px 24px', borderTop: '1px solid #f0f0f0', flexShrink: 0, alignItems: 'flex-end' }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Message..."
              style={{ flex: 1, border: '1.5px solid #e0d8d0', borderRadius: 22, padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
            />
            <button onClick={send} disabled={!draft.trim()} style={{ background: draft.trim() ? 'var(--orange)' : '#e0d8d0', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: 16, cursor: draft.trim() ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ↑
            </button>
          </div>
        </div>
      </div>
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
        {([['🏡','Sell an item','List anything from furniture to electronics', () => openPanel('createListing')],['💼','Post a job','Find staff or freelancers', () => openPanel('createListing', { category: 'Jobs' })],['🏠','List a property','Rent or sell a home', () => openPanel('createListing', { category: 'Property' })],['🔧','Offer a service','Plumbers, cleaners, tutors & more', () => openPanel('createListing', { category: 'Services' })]] as [string,string,string,()=>void][]).map(([icon, title, desc, action], i) => (
          <div key={i} onClick={action} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
            <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{title}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>{desc}</div></div>
            <span style={{ color: 'var(--orange)', marginLeft: 'auto' }}>›</span>
          </div>
        ))}
        <button onClick={() => openPanel('createListing')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>🚀 Start Listing</button>
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
              <button onClick={() => openPanel('checkout', { ...item })} style={{ flex: 1, background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: '15px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                Buy Now
              </button>
              <button onClick={() => openPanel('makeOffer', { ...item })} style={{ flex: 1, background: '#fff', color: 'var(--orange)', border: '2px solid var(--orange)', borderRadius: 14, padding: '15px', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                Make Offer
              </button>
            </div>

            {/* Grabitt Guarantee — trust notice (HTML: openGrabittGuarantee) */}
            <div onClick={() => openPanel('shield')} style={{ textAlign: 'center', fontSize: 11, color: '#16a34a', fontFamily: 'var(--font-ui)', fontWeight: 800, marginTop: 10, cursor: 'pointer' }}>
              🛡️ Protected by the Grabitt Guarantee · Funds held until you confirm ›
            </div>

            {/* Report / Share (HTML: report this listing / share this listing) */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              <button onClick={() => openPanel('report', { ...item })} style={{ background: 'none', border: 'none', color: '#999', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>🚨 Report this Listing</button>
              <button onClick={() => { if (typeof navigator !== 'undefined' && navigator.share) navigator.share({ title, text: `${title} — ${price}` }).catch(() => {}) }} style={{ background: 'none', border: 'none', color: '#999', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>📤 Share this Listing</button>
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

  // ── CHECKOUT / BUY NOW (§5.1) ───────────────────────────────────────────────
  if (panel.id === 'checkout') {
    const item = panel.data as Record<string, unknown>
    const title    = (item.title    as string) || 'Item'
    const price    = (item.price    as string) || '€0'
    const emoji    = (item.emoji    as string) || '🛍️'
    const location = (item.location as string) || 'Gran Canaria'
    const priceNum = parseFloat(price.replace(/[^0-9.]/g, '')) || 0

    const deliveryFee = Number(item.deliveryFee) || 0
    const deliveryMethod = (item.deliveryMethod as string) || 'courier'

    const [step, setStep] = useState<'summary' | 'card' | 'processing' | 'success'>('summary')
    const [qty, setQty] = useState(1)
    const [fulfil, setFulfil] = useState<'collection' | 'delivery'>('collection')
    const [cardNum, setCardNum] = useState('')
    const [expiry, setExpiry] = useState('')
    const [cvc, setCvc] = useState('')
    const [transactionId, setTransactionId] = useState<string | null>(null)
    const [payError, setPayError] = useState<string | null>(null)

    const delFee = fulfil === 'delivery' ? deliveryFee : 0
    const total = priceNum * qty + delFee
    const fmt = (n: number) => `€${n % 1 === 0 ? n : n.toFixed(2)}`

    const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    const formatExpiry = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d }

    const handlePay = async () => {
      setStep('processing')
      setPayError(null)
      try {
        const listingId = (item.id as string) || (item.listingId as string) || ''
        if (listingId) {
          const client = await getTrpcClient()
          const result = await client.transactions.initiate.mutate({ listingId, quantity: qty, fulfilment: fulfil })
          setTransactionId(result.transaction.id)
        }
        setStep('success')
      } catch (err) {
        setPayError((err as Error).message || 'Payment failed')
        setStep('card')
      }
    }

    return (
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>
              {step === 'success' ? '✅ Payment confirmed' : '🔒 Secure Checkout'}
            </span>
            {step !== 'processing' && <button onClick={closePanel} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
            {step === 'success' ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Payment held in escrow!</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 20 }}>
                  Your {price} is safely held by Grabitt. Arrange collection with the seller, then confirm handover to release payment.
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid var(--sage)', borderRadius: 12, padding: 14, marginBottom: 20, textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: 'var(--sage)', marginBottom: 6 }}>Next steps</div>
                  {['Message the seller to arrange pickup','Meet in a safe public place','Inspect the item carefully','Confirm handover in the app to release payment'].map((s, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', padding: '4px 0' }}>✅ {s}</div>
                  ))}
                </div>
                <button onClick={() => openPanel('handover', { ...item, transactionId, role: 'buyer' })} style={{ width: '100%', background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginBottom: 10 }}>
                  Confirm Handover
                </button>
                <button onClick={closePanel} style={{ width: '100%', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                  Back to browsing
                </button>
              </div>
            ) : step === 'processing' ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>Processing payment…</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginTop: 8 }}>Please don't close this window</div>
              </div>
            ) : step === 'card' ? (
              <>
                {/* Item recap */}
                <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 16, alignItems: 'center' }}>
                  <div style={{ width: 52, height: 52, background: '#f5f0e8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{emoji}</div>
                  <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{title}</div><div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: 'var(--orange)' }}>{price}</div></div>
                </div>

                {/* Card form */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 6 }}>Card number</div>
                  <input value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))} placeholder="1234 5678 9012 3456" style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px', fontFamily: 'monospace', fontSize: 15, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 6 }}>Expiry</div>
                    <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px', fontFamily: 'monospace', fontSize: 15, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 6 }}>CVC</div>
                    <input value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="123" style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px', fontFamily: 'monospace', fontSize: 15, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Security badges */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                  {['🔒 256-bit SSL', '🏦 Stripe Secured', '🛡️ Escrow Protected'].map(b => (
                    <span key={b} style={{ background: '#f0fdf4', color: '#555', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 50 }}>{b}</span>
                  ))}
                </div>

                {payError && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'red', marginBottom: 10 }}>{payError}</div>}
                <button
                  onClick={handlePay}
                  disabled={cardNum.length < 19 || expiry.length < 5 || cvc.length < 3}
                  style={{ width: '100%', background: cardNum.length >= 19 && expiry.length >= 5 && cvc.length >= 3 ? 'linear-gradient(135deg,var(--orange),var(--orange2))' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}
                >
                  Pay {fmt(total)} Securely
                </button>
              </>
            ) : (
              /* Step: summary */
              <>
                <div style={{ display: 'flex', gap: 12, padding: '0 0 16px', borderBottom: '1px solid #f0f0f0', marginBottom: 16, alignItems: 'center' }}>
                  <div style={{ width: 64, height: 64, background: '#f5f0e8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>{emoji}</div>
                  <div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{title}</div><div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>📍 {location}</div></div>
                </div>

                {/* Quantity */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: '#555' }}>Quantity</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>−</button>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)', minWidth: 20, textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => setQty(q => Math.min(99, q + 1))} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>+</button>
                  </div>
                </div>

                {/* Fulfilment choice */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button onClick={() => setFulfil('collection')} style={{ flex: 1, background: fulfil === 'collection' ? 'var(--orange)' : '#f0f0f0', color: fulfil === 'collection' ? '#fff' : '#666', border: 'none', borderRadius: 50, padding: '10px 4px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>🤝 Collection</button>
                  <button onClick={() => setFulfil('delivery')} style={{ flex: 1, background: fulfil === 'delivery' ? 'var(--orange)' : '#f0f0f0', color: fulfil === 'delivery' ? '#fff' : '#666', border: 'none', borderRadius: 50, padding: '10px 4px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>🚚 Delivery{deliveryFee > 0 ? ` +${fmt(deliveryFee)}` : ' free'}</button>
                </div>
                <div style={{ background: fulfil === 'delivery' ? '#eef6ff' : '#FFF3EE', borderRadius: 10, padding: '9px 12px', marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 11, color: fulfil === 'delivery' ? '#2563eb' : 'var(--orange)' }}>
                  {fulfil === 'delivery'
                    ? (deliveryMethod === 'in_person'
                        ? `🚚 Delivery${delFee > 0 ? ` (+${fmt(delFee)})` : ' (free)'} — the seller delivers in person; scan the QR code on arrival to release funds.`
                        : `🚚 Delivery${delFee > 0 ? ` (+${fmt(delFee)})` : ' (free)'} — sent by tracked courier; funds release once tracking shows the item in transit.`)
                    : '🤝 Collection — scan the QR code at handover to release funds.'}
                </div>

                {/* Price breakdown */}
                <div style={{ background: '#f9f6f2', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 10 }}>Order summary</div>
                  {[
                    [`Item price${qty > 1 ? ` × ${qty}` : ''}`, fmt(priceNum * qty)],
                    ['Delivery', fulfil === 'delivery' ? (delFee > 0 ? fmt(delFee) : 'Free') : '—'],
                    ['Platform fee', 'Paid by seller'],
                    ['You pay', fmt(total)],
                  ].map(([label, val], i, arr) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid #ede0c4' : 'none' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: i === arr.length - 1 ? 'var(--orange)' : '#555' }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Escrow explainer */}
                <div style={{ display: 'flex', gap: 10, background: '#FFF3EE', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>🔒</span>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                    Your payment is held in <strong>Stripe escrow</strong> and only released to the seller after you confirm receipt.
                  </div>
                </div>

                <button onClick={() => setStep('card')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                  Continue to Payment →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── MAKE OFFER ──────────────────────────────────────────────────────────────
  if (panel.id === 'makeOffer') {
    const item = panel.data as Record<string, unknown>
    const title = (item.title as string) || 'Item'
    const price = (item.price as string) || '€0'
    const emoji = (item.emoji as string) || '🛍️'
    const priceNum = parseFloat(price.replace(/[^0-9.]/g, '')) || 0

    const [amount, setAmount] = useState(String(Math.round(priceNum * 0.9) || ''))
    const [message, setMessage] = useState('')
    const [sent, setSent] = useState(false)

    if (sent) return (
      <ActionPanel title="💰 Offer sent!" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>💰</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Offer sent to seller</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 20 }}>You offered <strong>€{amount}</strong> for "{title}". The seller has 48 hours to respond.</div>
          <button onClick={closePanel} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 28px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Done</button>
        </div>
      </ActionPanel>
    )

    return (
      <ActionPanel title={`💰 Make Offer — ${title}`} onClose={closePanel}>
        <div style={{ display: 'flex', gap: 12, padding: '0 0 16px', borderBottom: '1px solid #f0f0f0', marginBottom: 16, alignItems: 'center' }}>
          <div style={{ width: 52, height: 52, background: '#f5f0e8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{emoji}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{title}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, color: '#888' }}>Listed at {price}</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Your offer amount (€)</div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Georgia,serif', fontSize: 18, color: '#888' }}>€</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px 11px 28px', fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: 'var(--orange)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {priceNum > 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginTop: 4 }}>
            {Math.round((1 - parseFloat(amount || '0') / priceNum) * 100)}% below asking price
          </div>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Message to seller (optional)</div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder='e.g. "Happy to collect today if you accept"'
            rows={3}
            style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--dark)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 12, marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#a8460f' }}>
          🔒 Offers are binding if accepted. Payment is processed via Stripe escrow.
        </div>

        <button
          onClick={() => setSent(true)}
          disabled={!amount || parseFloat(amount) <= 0}
          style={{ width: '100%', background: amount && parseFloat(amount) > 0 ? 'linear-gradient(135deg,var(--orange),var(--orange2))' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}
        >
          Send Offer — €{amount || '0'}
        </button>
      </ActionPanel>
    )
  }

  // ── OFFER RECEIVED (seller view) ────────────────────────────────────────────
  if (panel.id === 'offerReceived') {
    const MOCK_OFFERS = [
      { id: 'O1', buyer: '@buyer_maria', avatar: '👩', listing: 'MacBook Air M2', amount: '€820', original: '€890', msg: 'Can collect today', time: '5m ago' },
      { id: 'O2', buyer: '@buyer_carlos', avatar: '👨', listing: 'Surfboard 6ft', amount: '€95', original: '€120', msg: '', time: '2h ago' },
    ]
    const [responded, setResponded] = useState<Record<string, string>>({})

    return (
      <ActionPanel title="💰 Offers Received" onClose={closePanel}>
        {MOCK_OFFERS.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No pending offers right now.</div>
          : MOCK_OFFERS.map(offer => (
            <div key={offer.id} style={{ background: '#f9f6f2', borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, background: '#FFF3EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{offer.avatar}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{offer.buyer}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>on {offer.listing} · {offer.time}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>{offer.amount}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', textDecoration: 'line-through' }}>{offer.original}</div>
                </div>
              </div>
              {offer.msg && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 10 }}>"{offer.msg}"</div>}
              {responded[offer.id] ? (
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: responded[offer.id] === 'accepted' ? 'var(--sage)' : '#ef4444' }}>
                  {responded[offer.id] === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setResponded(r => ({ ...r, [offer.id]: 'accepted' }))} style={{ flex: 1, background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>✅ Accept</button>
                  <button onClick={() => setResponded(r => ({ ...r, [offer.id]: 'declined' }))} style={{ flex: 1, background: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 10, padding: '10px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>❌ Decline</button>
                  <button style={{ flex: 1, background: '#fff', color: 'var(--ocean)', border: '1.5px solid var(--ocean)', borderRadius: 10, padding: '10px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>↔ Counter</button>
                </div>
              )}
            </div>
          ))
        }
      </ActionPanel>
    )
  }

  // ── CONFIRM HANDOVER (QR-gated) ──────────────────────────────────────────────
  if (panel.id === 'handover') {
    const item = panel.data as Record<string, unknown>
    const transactionId = (item.transactionId as string) || ''
    const role = (item.role as 'seller' | 'buyer') || 'buyer'
    const title = (item.title as string) || 'Item'
    const fulfilmentType = (item.fulfilmentType as string) || ''

    // ── Courier order: seller submits tracking (no QR) ────────────────────────
    if (role === 'seller' && fulfilmentType === 'courier') {
      return <CourierTrackingForm transactionId={transactionId} title={title} onClose={closePanel} />
    }

    // ── Seller view: generate QR ──────────────────────────────────────────────
    if (role === 'seller') {
      const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
      const [shortCode, setShortCode] = useState<string | null>(null)
      const [expiresIn, setExpiresIn] = useState(0)
      const [generating, setGenerating] = useState(false)
      const [genError, setGenError] = useState('')

      // Countdown timer
      useEffect(() => {
        if (expiresIn <= 0) return
        const id = setInterval(() => setExpiresIn(s => s > 0 ? s - 1 : 0), 1000)
        return () => clearInterval(id)
      }, [expiresIn > 0])

      const generate = async () => {
        setGenerating(true)
        setGenError('')
        try {
          const client = await getTrpcClient()
          const res = await client.transactions.generateHandoverQr.mutate({ transactionId })
          setQrDataUrl(res.qrDataUrl)
          setShortCode(res.shortCode)
          setExpiresIn(res.expiresInSecs)
        } catch (err) {
          setGenError((err as Error).message || 'Failed to generate QR')
        } finally {
          setGenerating(false)
        }
      }

      const mins = Math.floor(expiresIn / 60)
      const secs = (expiresIn % 60).toString().padStart(2, '0')
      const isExpired = shortCode && expiresIn === 0

      return (
        <ActionPanel title="🤝 Handover QR" onClose={closePanel}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
            Show this QR code to the buyer when handing over <strong>{title}</strong>. The buyer scans it to confirm receipt and release your payment.
          </div>

          {!qrDataUrl ? (
            <>
              <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 14, marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#a8460f' }}>
                ⚠️ Payment will only be released after the buyer scans this QR code in person. Do not hand over the item without it.
              </div>
              {genError && <div style={{ color: '#ef4444', fontFamily: 'var(--font-ui)', fontSize: 12, marginBottom: 12 }}>{genError}</div>}
              <button onClick={generate} disabled={generating} style={{ width: '100%', background: generating ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: generating ? 'not-allowed' : 'pointer' }}>
                {generating ? '⏳ Generating…' : '📲 Generate Handover QR'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              {isExpired ? (
                <div style={{ padding: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>QR Code Expired</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', marginBottom: 16 }}>Generate a new one to continue.</div>
                  <button onClick={generate} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>🔄 Regenerate QR</button>
                </div>
              ) : (
                <>
                  <img src={qrDataUrl} alt="Handover QR code" style={{ width: 220, height: 220, borderRadius: 12, marginBottom: 12 }} />
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 6 }}>Manual entry code</div>
                  <div style={{ fontFamily: 'Courier, monospace', fontSize: 32, fontWeight: 900, letterSpacing: 8, color: 'var(--dark)', marginBottom: 8 }}>{shortCode}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: expiresIn < 300 ? '#ef4444' : '#888' }}>
                    Expires in {mins}:{secs}
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid var(--sage)', borderRadius: 12, padding: 12, marginTop: 16, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--sage)', textAlign: 'left' }}>
                    ✅ Show this screen to the buyer — they scan the QR or type the code above to release your payment.
                  </div>
                </>
              )}
            </div>
          )}
        </ActionPanel>
      )
    }

    // ── Buyer view: enter code ────────────────────────────────────────────────
    const [code, setCode] = useState('')
    const [checklist, setChecklist] = useState([false, false, false])
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [done, setDone] = useState(false)

    const CHECKS = [
      'I have received the item in person from the seller',
      'The item matches the listing description',
      'I am satisfied and happy to release payment',
    ]
    const allChecked = checklist.every(Boolean)
    const codeClean = code.trim().toUpperCase()

    if (done) return (
      <ActionPanel title="✅ Handover confirmed" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Payment released!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 20 }}>Funds have been released to the seller. Why not leave them a review?</div>
          <button onClick={() => openPanel('reviewTx', item)} style={{ width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginBottom: 10 }}>⭐ Leave a Review</button>
          <button onClick={closePanel} style={{ width: '100%', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, cursor: 'pointer' }}>Done</button>
        </div>
      </ActionPanel>
    )

    const handleConfirm = async () => {
      setSubmitting(true)
      setSubmitError('')
      try {
        const client = await getTrpcClient()
        await client.transactions.confirmHandoverByCode.mutate({ transactionId, code: codeClean })
        setDone(true)
      } catch (err) {
        setSubmitError((err as Error).message || 'Failed to confirm handover')
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <ActionPanel title="🤝 Confirm Handover" onClose={closePanel}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
          Ask the seller to show their QR code. Enter the 6-character code below it to confirm receipt of <strong>{title}</strong> and release their payment.
        </div>

        {/* Code input */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 6 }}>Seller's 6-character code</div>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="A1B2C3"
            maxLength={6}
            style={{ width: '100%', border: `2px solid ${codeClean.length === 6 ? 'var(--sage)' : '#e0d8d0'}`, borderRadius: 12, padding: '14px 16px', fontFamily: 'Courier, monospace', fontSize: 28, fontWeight: 900, letterSpacing: 8, color: 'var(--dark)', textAlign: 'center', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }}
          />
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: 16 }}>
          {CHECKS.map((check, i) => (
            <div
              key={i}
              onClick={() => setChecklist(prev => prev.map((v, j) => j === i ? !v : v))}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checklist[i] ? 'var(--sage)' : '#ccc'}`, background: checklist[i] ? 'var(--sage)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {checklist[i] && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: checklist[i] ? 'var(--dark)' : '#888', lineHeight: 1.4 }}>{check}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff8f0', border: '1px solid #ffe0cc', borderRadius: 12, padding: 12, marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#a8460f' }}>
          ⚠️ If there is an issue with the item, <strong style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => openPanel('dispute', item)}>raise a dispute</strong> instead. Once confirmed this cannot be undone.
        </div>

        {submitError && <div style={{ color: '#ef4444', fontFamily: 'var(--font-ui)', fontSize: 12, marginBottom: 12 }}>{submitError}</div>}

        <button
          onClick={handleConfirm}
          disabled={codeClean.length !== 6 || !allChecked || submitting}
          style={{ width: '100%', background: codeClean.length === 6 && allChecked && !submitting ? 'var(--sage)' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: codeClean.length === 6 && allChecked && !submitting ? 'pointer' : 'not-allowed' }}
        >
          {submitting ? '⏳ Confirming…' : '✅ Confirm & Release Payment'}
        </button>
      </ActionPanel>
    )
  }

  // ── REVIEW TRANSACTION ───────────────────────────────────────────────────────
  if (panel.id === 'reviewTx') {
    const item = panel.data as Record<string, unknown>
    const title = (item.title as string) || 'Item'
    const transactionId = (item.transactionId as string) || ''

    const [overall, setOverall] = useState(0)
    const [accuracy, setAccuracy] = useState(0)
    const [comms, setComms] = useState(0)
    const [speed, setSpeed] = useState(0)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [submitError, setSubmitError] = useState('')

    const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

    function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', width: 120 }}>{label}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} onClick={() => onChange(s)} style={{ fontSize: 22, cursor: 'pointer', opacity: s <= value ? 1 : 0.2 }}>⭐</span>
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--orange)', width: 56, textAlign: 'right', fontWeight: 800 }}>{value > 0 ? LABELS[value] : ''}</span>
        </div>
      )
    }

    if (submitted) return (
      <ActionPanel title="⭐ Review submitted" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>⭐</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Thanks for your review!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 20 }}>Your feedback helps keep the Grabitt community great.</div>
          <button onClick={closePanel} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 28px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Done</button>
        </div>
      </ActionPanel>
    )

    const handleSubmit = async () => {
      setSubmitting(true)
      setSubmitError('')
      try {
        const client = await getTrpcClient()
        await client.transactions.rate.mutate({
          transactionId,
          rating: overall,
          accuracyRating: accuracy || undefined,
          communicationRating: comms || undefined,
          speedRating: speed || undefined,
          comment: comment.trim() || undefined,
        })
        setSubmitted(true)
      } catch (err) {
        setSubmitError((err as Error).message || 'Failed to submit review')
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <ActionPanel title={`⭐ Review — ${title}`} onClose={closePanel}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 16 }}>Rate your experience across all aspects. Your overall score is the one that counts toward the seller's grade.</div>

        <StarRow label="Overall ★" value={overall} onChange={setOverall} />
        <StarRow label="As described" value={accuracy} onChange={setAccuracy} />
        <StarRow label="Communication" value={comms} onChange={setComms} />
        <StarRow label="Speed" value={speed} onChange={setSpeed} />

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tell others about your experience (optional)…"
          rows={4}
          style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--dark)', outline: 'none', resize: 'none', boxSizing: 'border-box', marginTop: 16, marginBottom: 16 }}
        />

        {submitError && <div style={{ color: '#ef4444', fontFamily: 'var(--font-ui)', fontSize: 12, marginBottom: 12 }}>{submitError}</div>}

        <button
          onClick={handleSubmit}
          disabled={overall === 0 || submitting}
          style={{ width: '100%', background: overall > 0 && !submitting ? 'linear-gradient(135deg,var(--orange),var(--orange2))' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: overall > 0 && !submitting ? 'pointer' : 'not-allowed' }}
        >
          {submitting ? '⏳ Submitting…' : 'Submit Review'}
        </button>
      </ActionPanel>
    )
  }

  // ── RAISE DISPUTE ────────────────────────────────────────────────────────────
  if (panel.id === 'dispute') {
    const item = panel.data as Record<string, unknown>
    const title = (item.title as string) || 'Item'
    const REASONS = ['Item not as described', 'Item not received', 'Wrong item sent', 'Item damaged', 'Seller unresponsive', 'Other']
    const [reason, setReason] = useState('')
    const [evidence, setEvidence] = useState('')
    const [submitted, setSubmitted] = useState(false)

    if (submitted) return (
      <ActionPanel title="🚨 Dispute opened" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🚨</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Dispute raised — funds frozen</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 8 }}>Your payment is frozen until the dispute is resolved. Our team will review within 24 hours.</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 20 }}>Questions? Email safety@grabitt.net</div>
          <button onClick={closePanel} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 28px', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>Done</button>
        </div>
      </ActionPanel>
    )

    return (
      <ActionPanel title={`🚨 Raise Dispute — ${title}`} onClose={closePanel}>
        <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#ef4444', fontWeight: 800 }}>⚠️ Raising a dispute freezes funds immediately.</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginTop: 4 }}>Only do this if you have a genuine problem. False disputes may result in account suspension.</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 8 }}>Reason</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{ background: reason === r ? '#ef4444' : '#fff', color: reason === r ? '#fff' : '#555', border: `1.5px solid ${reason === r ? '#ef4444' : '#e0d8d0'}`, borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{r}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Evidence / description</div>
          <textarea
            value={evidence}
            onChange={e => setEvidence(e.target.value)}
            placeholder='Describe what happened in detail...'
            rows={4}
            style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--dark)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={() => setSubmitted(true)}
          disabled={!reason || !evidence}
          style={{ width: '100%', background: reason && evidence ? '#ef4444' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: reason && evidence ? 'pointer' : 'not-allowed' }}
        >
          🚨 Open Dispute
        </button>
      </ActionPanel>
    )
  }

  // ── MY SALES ─────────────────────────────────────────────────────────────────
  if (panel.id === 'mySales') {
    const MOCK_SALES = [
      { emoji: '📱', title: 'iPhone 13', buyer: '@buyer_anna', amount: '€440', net: '€405', status: 'released', date: '28 Jun' },
      { emoji: '🚴', title: 'Road Bike', buyer: '@buyer_pete', amount: '€280', net: '€258', status: 'held', date: '30 Jun' },
    ]
    const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
      released: { bg: '#d1fae5', color: '#065f46', label: '✅ Paid out' },
      held: { bg: '#FFF3EE', color: 'var(--orange)', label: '🔒 In escrow' },
      pending_payment: { bg: '#f0f0f0', color: '#888', label: '⏳ Awaiting payment' },
      disputed: { bg: '#fff5f5', color: '#ef4444', label: '🚨 Disputed' },
    }
    return (
      <ActionPanel title="📊 My Sales" onClose={closePanel}>
        {MOCK_SALES.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>No sales yet.</div>
          : MOCK_SALES.map((sale, i) => {
            const ss = STATUS_STYLES[sale.status] || STATUS_STYLES.held
            return (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, background: '#f5f0e8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{sale.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{sale.title}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>to {sale.buyer} · {sale.date}</div>
                  <span style={{ background: ss.bg, color: ss.color, fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-ui)', padding: '2px 7px', borderRadius: 50, display: 'inline-block', marginTop: 3 }}>{ss.label}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{sale.amount}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--sage)', fontWeight: 800 }}>Net {sale.net}</div>
                </div>
              </div>
            )
          })
        }
      </ActionPanel>
    )
  }

  // ── PURCHASES (enhanced) ─────────────────────────────────────────────────────
  if (panel.id === 'purchases') {
    type Purchase = { id: string; listing: { title: string; images: string[] }; amount: number; status: string; createdAt: Date; sellerId: string }
    const [purchases, setPurchases] = useState<Purchase[]>([])
    const [purchasesLoaded, setPurchasesLoaded] = useState(false)
    useEffect(() => {
      getTrpcClient().then(c => c.transactions.myPurchases.query()).then(data => {
        setPurchases(data as unknown as Purchase[])
        setPurchasesLoaded(true)
      }).catch(() => setPurchasesLoaded(true))
    }, [])

    const STATUS_LABEL: Record<string, string> = { held: '🔒 Awaiting handover', released: '✅ Complete', pending_payment: '⏳ Payment pending', disputed: '🚨 Disputed', confirmed_handover: '🤝 Handover confirmed' }
    return (
      <ActionPanel title="🛒 My Purchases" onClose={closePanel}>
        {!purchasesLoaded && <div style={{ textAlign: 'center', padding: 32, color: '#aaa', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading…</div>}
        {purchasesLoaded && purchases.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#aaa', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No purchases yet</div>}
        {purchases.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#f5f0e8', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              {p.listing.images?.[0] ? <img src={p.listing.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛍️</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 1 }}>{p.listing.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>{new Date(p.createdAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: p.status === 'held' ? 'var(--orange)' : p.status === 'released' ? 'var(--sage)' : '#888', fontWeight: 800, marginTop: 2 }}>{STATUS_LABEL[p.status] ?? p.status}</div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 700, color: 'var(--dark)', textAlign: 'right' }}>€{Number(p.amount).toFixed(2)}</div>
              {p.status === 'held' && (
                <button onClick={() => openPanel('handover', { title: p.listing.title, transactionId: p.id, role: 'buyer' })} style={{ marginTop: 4, background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: 50, padding: '4px 10px', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>Confirm ✅</button>
              )}
            </div>
          </div>
        ))}
      </ActionPanel>
    )
  }

  // ── CREATE LISTING ───────────────────────────────────────────────────────────
  if (panel.id === 'createListing') {
    const prefillCat = (panel.data?.category as string) || ''

    const DEPTS = ['Electronics','Fashion','Home & Garden','Sport & Leisure','Retro & Vintage','Gaming','Pet Shop','Motors','Kids & Baby','Handy Help','Jobs','Property','Services','Collectables','Other']
    const CONDITIONS = ['New','Like New','Very Good','Good','Fair','For Parts']
    const TOWNS = ['Las Palmas','Maspalomas','Playa del Inglés','Puerto Rico','Arucas','Telde','Santa Lucía','Ingenio','Agüimes','Gáldar','Mogán','San Bartolomé de Tirajana','Vecindario','Tejeda','Other']

    const [step, setStep] = useState<'photos'|'details'|'price'|'preview'|'done'>(prefillCat ? 'details' : 'photos')
    const [photos, setPhotos] = useState<string[]>([])   // data URLs for preview
    const [photoFiles, setPhotoFiles] = useState<File[]>([])
    const [title, setTitle] = useState('')
    const [dept, setDept] = useState(prefillCat)
    const [condition, setCondition] = useState('')
    const [desc, setDesc] = useState('')
    const [price, setPrice] = useState('')
    const [freeItem, setFreeItem] = useState(false)
    const [offersDelivery, setOffersDelivery] = useState(false)
    const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'in_person'>('courier')
    const [deliveryFee, setDeliveryFee] = useState('')
    const [town, setTown] = useState('Las Palmas')
    const [grabItNow, setGrabItNow] = useState(false)
    const [featured, setFeatured] = useState(false)
    const [uploading, setUploading] = useState(false)

    const STEPS = ['photos','details','price','preview'] as const
    const stepIdx = STEPS.indexOf(step as typeof STEPS[number])
    const progress = stepIdx >= 0 ? ((stepIdx + 1) / STEPS.length) * 100 : 100

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).slice(0, 8 - photos.length)
      setPhotoFiles(prev => [...prev, ...files])
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = ev => setPhotos(prev => [...prev, ev.target!.result as string])
        reader.readAsDataURL(file)
      })
    }

    if (step === 'done') return (
      <ActionPanel title="🎉 Listing live!" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Your listing is live!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 20 }}>"{title}" is now visible to thousands of buyers on Gran Canaria.</div>
          {grabItNow && <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 12, marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--orange)', fontWeight: 800 }}>⚡ Grab It Now active — expires tonight at midnight!</div>}
          {featured && <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--sage)', fontWeight: 800 }}>👀 Featured for 7 days — appearing at the top of search!</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => openPanel('mylistings')} style={{ background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>📋 View My Listings</button>
            <button onClick={() => openPanel('createListing')} style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, cursor: 'pointer' }}>+ List another item</button>
            <button onClick={closePanel} style={{ background: 'transparent', color: '#888', border: 'none', padding: 8, fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>Back to browsing</button>
          </div>
        </div>
      </ActionPanel>
    )

    return (
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 0', flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, color: 'var(--dark)' }}>
                {step === 'photos' ? '📷 Add photos' : step === 'details' ? '📝 Item details' : step === 'price' ? '💰 Price & options' : '👁 Preview'}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 1 }}>
                Step {Math.max(stepIdx + 1, 1)} of {STEPS.length}
              </div>
            </div>
            <button onClick={closePanel} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: '#f0f0f0', margin: '10px 16px 0', borderRadius: 2, flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,var(--orange),var(--orange2))', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '16px 16px 0' }}>

            {/* ── Step 1: Photos ── */}
            {step === 'photos' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e0d8d0', borderRadius: 16, padding: 24, cursor: 'pointer', background: '#faf7f4' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>Add up to 8 photos</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>Tap to choose from your device</div>
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                </div>

                {photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                    {photos.map((src, i) => (
                      <div key={i} style={{ position: 'relative', paddingTop: '100%', borderRadius: 10, overflow: 'hidden', background: '#f5f0e8' }}>
                        <img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        {i === 0 && <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 8, fontFamily: 'var(--font-ui)', fontWeight: 900, padding: '2px 5px', borderRadius: 4 }}>MAIN</div>}
                        <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 12, marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 11, color: '#a8460f' }}>
                  💡 Good photos = 3× more offers. Shoot in natural light against a plain background.
                </div>
              </>
            )}

            {/* ── Step 2: Details ── */}
            {step === 'details' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Title *</div>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder='e.g. "iPhone 14 Pro — Unlocked, 256GB"' style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#aaa', marginTop: 3 }}>{title.length}/80</div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Category *</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {DEPTS.map(d => (
                      <button key={d} onClick={() => setDept(d)} style={{ background: dept === d ? 'var(--orange)' : '#f5f0e8', color: dept === d ? '#fff' : '#555', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{d}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Condition *</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CONDITIONS.map(c => (
                      <button key={c} onClick={() => setCondition(c)} style={{ background: condition === c ? 'var(--sage)' : '#f5f0e8', color: condition === c ? '#fff' : '#555', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{c}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Description</div>
                  <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder='Describe the item — include any defects, accessories included, reason for selling...' rows={4} style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--dark)', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Location</div>
                  <select value={town} onChange={e => setTown(e.target.value)} style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '11px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--dark)', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    {TOWNS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* ── Step 3: Price & Options ── */}
            {step === 'price' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 6 }}>Price (€) *</div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Georgia,serif', fontSize: 20, color: freeItem ? '#ccc' : '#888' }}>€</span>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} disabled={freeItem} placeholder="0.00" min="0" step="0.01"
                      style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '13px 12px 13px 30px', fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 700, color: 'var(--orange)', outline: 'none', boxSizing: 'border-box', opacity: freeItem ? 0.4 : 1 }} />
                  </div>
                  <div onClick={() => { setFreeItem(v => !v); if (!freeItem) setPrice('0') }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${freeItem ? 'var(--sage)' : '#ccc'}`, background: freeItem ? 'var(--sage)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {freeItem && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555' }}>This item is free / give-away</span>
                  </div>
                </div>

                {/* Delivery option */}
                <div style={{ background: '#faf7f4', border: `1.5px solid ${offersDelivery ? 'var(--ocean)' : '#e0d8d0'}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <div onClick={() => setOffersDelivery(v => !v)} style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'center' }}>
                    <div style={{ fontSize: 26, flexShrink: 0 }}>🚚</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>Offer delivery</div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', marginTop: 3 }}>Let buyers choose delivery at checkout. Leave the fee at €0 for free delivery.</div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${offersDelivery ? 'var(--ocean)' : '#ccc'}`, background: offersDelivery ? 'var(--ocean)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {offersDelivery && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
                    </div>
                  </div>
                  {offersDelivery && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 6 }}>Delivery method</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <button onClick={() => setDeliveryMethod('courier')} style={{ flex: 1, background: deliveryMethod === 'courier' ? 'var(--ocean)' : '#f0f0f0', color: deliveryMethod === 'courier' ? '#fff' : '#666', border: 'none', borderRadius: 10, padding: '8px 4px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>📦 Courier (tracked)</button>
                        <button onClick={() => setDeliveryMethod('in_person')} style={{ flex: 1, background: deliveryMethod === 'in_person' ? 'var(--ocean)' : '#f0f0f0', color: deliveryMethod === 'in_person' ? '#fff' : '#666', border: 'none', borderRadius: 10, padding: '8px 4px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>🤝 In person (QR)</button>
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginBottom: 10 }}>
                        {deliveryMethod === 'courier'
                          ? 'Send by tracked courier — you get paid once tracking shows the parcel in transit.'
                          : 'You deliver in person — the buyer scans your QR code on arrival to release funds.'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 6 }}>Delivery fee (€)</div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Georgia,serif', fontSize: 16, color: '#888' }}>€</span>
                        <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="0.00" min="0" step="0.01"
                          style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '10px 12px 10px 28px', fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Grab It Now */}
                <div onClick={() => setGrabItNow(v => !v)} style={{ display: 'flex', gap: 12, background: grabItNow ? '#FFF3EE' : '#faf7f4', border: `1.5px solid ${grabItNow ? 'var(--orange)' : '#e0d8d0'}`, borderRadius: 14, padding: 14, marginBottom: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 26, flexShrink: 0 }}>⚡</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>Grab It Now</div>
                      <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>€4.99</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', marginTop: 3 }}>Appears in the Grab It Now strip on the homepage. Expires at midnight — creates buying urgency.</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${grabItNow ? 'var(--orange)' : '#ccc'}`, background: grabItNow ? 'var(--orange)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {grabItNow && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
                  </div>
                </div>

                {/* Featured */}
                <div onClick={() => setFeatured(v => !v)} style={{ display: 'flex', gap: 12, background: featured ? '#f0fdf4' : '#faf7f4', border: `1.5px solid ${featured ? 'var(--sage)' : '#e0d8d0'}`, borderRadius: 14, padding: 14, marginBottom: 16, cursor: 'pointer', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 26, flexShrink: 0 }}>👀</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)' }}>Featured listing</div>
                      <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: 'var(--sage)' }}>€1.99/wk</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', marginTop: 3 }}>Shown in the Featured strip on the homepage and at the top of department search results.</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${featured ? 'var(--sage)' : '#ccc'}`, background: featured ? 'var(--sage)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {featured && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
                  </div>
                </div>

                {/* Fee explainer */}
                {price && parseFloat(price) > 0 && (
                  <div style={{ background: '#f9f6f2', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#888', marginBottom: 6 }}>Your estimated payout (Grabber grade)</div>
                    {[['Listing price', `€${parseFloat(price).toFixed(2)}`],['Platform fee (8%)', `-€${(parseFloat(price) * 0.08).toFixed(2)}`],['You receive', `€${(parseFloat(price) * 0.92).toFixed(2)}`]].map(([l, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#555' }}>{l}</span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: i === 2 ? 'var(--sage)' : '#555' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Step 4: Preview ── */}
            {step === 'preview' && (
              <>
                {/* Thumbnail */}
                <div style={{ background: '#f5f0e8', borderRadius: 16, paddingTop: '52%', position: 'relative', marginBottom: 14, overflow: 'hidden' }}>
                  {photos[0]
                    ? <img src={photos[0]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>🛍️</div>
                  }
                  {featured && <div style={{ position: 'absolute', top: 10, left: 12, background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50 }}>👀 FEATURED</div>}
                </div>

                <div style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>{title || 'Untitled listing'}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: 'var(--orange)', marginBottom: 10 }}>{freeItem ? 'FREE' : price ? `€${parseFloat(price).toFixed(2)}` : 'POA'}</div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[dept, condition, `📍 ${town}`, '🤝 Collection', ...(offersDelivery ? [`🚚 Delivery${parseFloat(deliveryFee) > 0 ? ` +€${parseFloat(deliveryFee).toFixed(2)}` : ' free'}`] : [])].filter(Boolean).map((tag, i) => (
                    <span key={i} style={{ background: '#f5f0e8', color: '#555', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 50 }}>{tag}</span>
                  ))}
                </div>

                {desc && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 14 }}>{desc}</div>}

                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 16, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--sage)' }}>
                  ✅ Listing looks good! Hit publish to go live.
                </div>
              </>
            )}
          </div>

          {/* Footer nav */}
          <div style={{ padding: '12px 16px 24px', borderTop: '1px solid #f0f0f0', flexShrink: 0, display: 'flex', gap: 10 }}>
            {step !== 'photos' && (
              <button onClick={() => setStep(STEPS[Math.max(stepIdx - 1, 0)])} style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, cursor: 'pointer' }}>← Back</button>
            )}
            {step === 'preview' ? (
              <button
                onClick={async () => {
                  setUploading(true)
                  try {
                    const listingId = crypto.randomUUID()
                    const imageUrls = photoFiles.length > 0
                      ? await Promise.all(photoFiles.map(f => compressAndUpload(f, listingPhotoPath(listingId))))
                      : ['https://placehold.co/800x600/f5f0e8/9E8F7A?text=No+photo']
                    const DEPT_ENUM: Record<string, string> = {
                      'Electronics': 'electronics', 'Fashion': 'fashion', 'Home & Garden': 'home_garden',
                      'Sport & Leisure': 'sport_leisure', 'Retro & Vintage': 'retro_vintage', 'Gaming': 'gaming',
                      'Pet Shop': 'pet_shop', 'Motors': 'motors', 'Kids & Baby': 'kids_baby',
                      'Handy Help': 'handy_help', 'Jobs': 'jobs', 'Property': 'property',
                      'Services': 'services', 'Collectables': 'collectables', 'Other': 'other',
                    }
                    const COND_ENUM: Record<string, string> = {
                      'New': 'new', 'Like New': 'like_new', 'Very Good': 'very_good',
                      'Good': 'good', 'Fair': 'fair', 'For Parts': 'for_parts',
                    }
                    const client = await getTrpcClient()
                    await client.listings.create.mutate({
                      title: title.trim(),
                      description: desc.trim(),
                      price: freeItem ? 0 : parseFloat(price) || 0,
                      department: (DEPT_ENUM[dept] ?? dept) as Parameters<typeof client.listings.create.mutate>[0]['department'],
                      condition: (COND_ENUM[condition] ?? condition) as Parameters<typeof client.listings.create.mutate>[0]['condition'],
                      images: imageUrls,
                      location: town,
                      deliveryFee: offersDelivery ? (parseFloat(deliveryFee) || 0) : 0,
                      deliveryMethod: offersDelivery ? deliveryMethod : undefined,
                    })
                    setStep('done')
                  } catch (err) {
                    alert((err as Error).message || 'Failed to publish listing')
                  } finally {
                    setUploading(false)
                  }
                }}
                disabled={uploading}
                style={{ flex: 2, background: uploading ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: uploading ? 'not-allowed' : 'pointer' }}
              >
                {uploading ? '⏳ Publishing…' : '🚀 Publish Listing'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const next = STEPS[stepIdx + 1]
                  if (next) setStep(next)
                }}
                disabled={
                  (step === 'photos' && false) ||
                  (step === 'details' && (!title.trim() || !dept || !condition)) ||
                  (step === 'price' && !freeItem && !price)
                }
                style={{ flex: 2, background: (step === 'details' && (!title.trim() || !dept || !condition)) || (step === 'price' && !freeItem && !price) ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}
              >
                {step === 'photos' ? (photos.length > 0 ? `Continue with ${photos.length} photo${photos.length > 1 ? 's' : ''} →` : 'Skip photos →') : 'Continue →'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── JOBS ────────────────────────────────────────────────────────────────────
  if (panel.id === 'jobs') {
    const JOB_TYPES = [
      { id: 'all', label: 'All Jobs' },
      { id: 'full_time', label: '⏰ Full Time' },
      { id: 'part_time', label: '🕐 Part Time' },
      { id: 'contract', label: '📝 Contract' },
      { id: 'temporary', label: '⚡ Temp' },
      { id: 'volunteer', label: '❤️ Volunteer' },
    ]
    const MOCK_JOBS = [
      { id: '1', title: 'Bar Staff Needed', company: 'The Irish Rover', location: 'Playa del Inglés', salary: '€1,200/mo', type: 'full_time', emoji: '🍺', posted: '2h ago' },
      { id: '2', title: 'Chef — Italian Restaurant', company: 'La Trattoria', location: 'Maspalomas', salary: '€1,600/mo', type: 'full_time', emoji: '🍳', posted: '4h ago' },
      { id: '3', title: 'Housekeeper (Part Time)', company: 'Hotel Gran Canaria', location: 'Las Palmas', salary: '€800/mo', type: 'part_time', emoji: '🧹', posted: '1d ago' },
      { id: '4', title: 'Driver Wanted', company: 'FastDeliver GC', location: 'Vecindario', salary: '€1,100/mo', type: 'contract', emoji: '🚗', posted: '2d ago' },
      { id: '5', title: 'Web Developer — Remote', company: 'TechGC', location: 'Remote', salary: '€2,400/mo', type: 'contract', emoji: '💻', posted: '3d ago' },
      { id: '6', title: 'Beach Cleaner Volunteer', company: 'GC Eco Foundation', location: 'Various', salary: 'Voluntary', type: 'volunteer', emoji: '🌊', posted: '1d ago' },
    ]
    const [jobType, setJobType] = useState('all')
    const filteredJobs = jobType === 'all' ? MOCK_JOBS : MOCK_JOBS.filter(j => j.type === jobType)
    return (
      <ActionPanel title="💼 Jobs" onClose={closePanel}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16, paddingBottom: 4 }}>
          {JOB_TYPES.map(jt => (
            <button key={jt.id} onClick={() => setJobType(jt.id)} style={{ background: jobType === jt.id ? 'var(--orange)' : '#f5f0e8', color: jobType === jt.id ? '#fff' : '#555', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{jt.label}</button>
          ))}
        </div>
        {filteredJobs.map(job => (
          <div key={job.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ebe4', padding: '14px 12px', marginBottom: 10, cursor: 'pointer' }} onClick={() => openPanel('listing', { id: job.id })}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, background: '#f5f0e8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{job.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 2 }}>{job.title}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666', marginBottom: 4 }}>{job.company} · 📍 {job.location}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>{job.salary}</span>
                  <span style={{ background: '#f5f0e8', color: '#888', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50 }}>{job.type.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{job.posted}</div>
            </div>
          </div>
        ))}
        <button onClick={() => openPanel('createListing', { category: 'Jobs' })} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginTop: 8 }}>+ Post a Job</button>
      </ActionPanel>
    )
  }

  // ── PROPERTY ──────────────────────────────────────────────────────────────────
  if (panel.id === 'property') {
    const PROP_TABS = ['For Sale', 'To Let', 'Commercial', 'Land', 'New Builds', 'Wanted']
    const MOCK_PROPS = [
      { id: 'p1', title: 'Luxury 2-Bed Apartment', location: 'Playa del Inglés', price: '€185,000', beds: 2, baths: 1, m2: 85, tab: 'For Sale', emoji: '🏢', tag: 'Pool' },
      { id: 'p2', title: 'Villa with Sea View', location: 'Mogán', price: '€380,000', beds: 4, baths: 3, m2: 220, tab: 'For Sale', emoji: '🏡', tag: 'Sea view' },
      { id: 'p3', title: 'Studio to Rent', location: 'Las Palmas', price: '€550/mo', beds: 0, baths: 1, m2: 38, tab: 'To Let', emoji: '🏠', tag: 'Furnished' },
      { id: 'p4', title: '2-Bed Bungalow', location: 'Maspalomas', price: '€950/mo', beds: 2, baths: 1, m2: 90, tab: 'To Let', emoji: '🏘️', tag: 'Garden' },
      { id: 'p5', title: 'Office Space 120m²', location: 'Las Palmas', price: '€1,200/mo', beds: 0, baths: 1, m2: 120, tab: 'Commercial', emoji: '🏢', tag: 'A/C' },
      { id: 'p6', title: 'Building Plot 800m²', location: 'Tejeda', price: '€45,000', beds: 0, baths: 0, m2: 800, tab: 'Land', emoji: '🌍', tag: 'Rural' },
      { id: 'p7', title: 'New Build 3-Bed', location: 'Arguineguín', price: '€295,000', beds: 3, baths: 2, m2: 140, tab: 'New Builds', emoji: '🏗️', tag: 'Off-plan' },
      { id: 'p8', title: 'Wanted: 2-Bed near Airport', location: 'Las Palmas', price: 'Budget: €800/mo', beds: 2, baths: 0, m2: 0, tab: 'Wanted', emoji: '🔍', tag: 'Urgent' },
    ]
    const [propTab, setPropTab] = useState('For Sale')
    const shownProps = MOCK_PROPS.filter(p => p.tab === propTab)
    return (
      <ActionPanel title="🏠 Property" onClose={closePanel}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14, paddingBottom: 4 }}>
          {PROP_TABS.map(t => (
            <button key={t} onClick={() => setPropTab(t)} style={{ background: propTab === t ? 'var(--orange)' : '#f5f0e8', color: propTab === t ? '#fff' : '#555', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</button>
          ))}
        </div>
        {shownProps.map(p => (
          <div key={p.id} onClick={() => openPanel('listing', { id: p.id })} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ebe4', marginBottom: 10, overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ background: '#f5f0e8', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, position: 'relative' }}>
              {p.emoji}
              <span style={{ position: 'absolute', top: 10, right: 10, background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50 }}>{p.tag}</span>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 6 }}>📍 {p.location}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>{p.price}</span>
                <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>
                  {p.beds > 0 && <span>🛏 {p.beds}</span>}
                  {p.baths > 0 && <span>🚿 {p.baths}</span>}
                  {p.m2 > 0 && <span>📐 {p.m2}m²</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => openPanel('createListing', { category: 'Property' })} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginTop: 4 }}>+ List Property</button>
      </ActionPanel>
    )
  }

  // ── HANDY HELP ────────────────────────────────────────────────────────────────
  if (panel.id === 'handy') {
    const TRADES = [
      { id: 'plumbing', label: 'Plumbing', emoji: '🔧' }, { id: 'electrical', label: 'Electrical', emoji: '⚡' },
      { id: 'cleaning', label: 'Cleaning', emoji: '🧹' }, { id: 'painting', label: 'Painting', emoji: '🎨' },
      { id: 'gardening', label: 'Gardening', emoji: '🌿' }, { id: 'moving', label: 'Moving', emoji: '📦' },
      { id: 'assembly', label: 'Assembly', emoji: '🔩' }, { id: 'it_support', label: 'IT Support', emoji: '💻' },
      { id: 'tutoring', label: 'Tutoring', emoji: '📚' }, { id: 'beauty', label: 'Beauty', emoji: '💅' },
      { id: 'building', label: 'Building', emoji: '🏗️' }, { id: 'pool', label: 'Pool Care', emoji: '🏊' },
      { id: 'security', label: 'Security', emoji: '🛡️' }, { id: 'other', label: 'Other', emoji: '🤝' },
    ]
    const MOCK_HANDY = [
      { id: 'h1', name: 'Carlos M.', trade: 'plumbing', rate: '€35/hr', location: 'Las Palmas', rating: 4.9, jobs: 47, available: true },
      { id: 'h2', name: 'Ana L.', trade: 'cleaning', rate: '€12/hr', location: 'Maspalomas', rating: 4.8, jobs: 123, available: true },
      { id: 'h3', name: 'Juan P.', trade: 'electrical', rate: '€40/hr', location: 'Telde', rating: 4.7, jobs: 62, available: false },
      { id: 'h4', name: 'María R.', trade: 'painting', rate: '€25/hr', location: 'Vecindario', rating: 5.0, jobs: 28, available: true },
      { id: 'h5', name: 'Ahmed K.', trade: 'gardening', rate: '€15/hr', location: 'Arucas', rating: 4.6, jobs: 89, available: true },
    ]
    const [selectedTrade, setSelectedTrade] = useState<string | null>(null)
    const shownHandy = selectedTrade ? MOCK_HANDY.filter(h => h.trade === selectedTrade) : MOCK_HANDY
    return (
      <ActionPanel title="🔧 Handy Help" onClose={closePanel}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {TRADES.map(tr => (
            <button key={tr.id} onClick={() => setSelectedTrade(selectedTrade === tr.id ? null : tr.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, border: `2px solid ${selectedTrade === tr.id ? 'var(--orange)' : '#f0ebe4'}`, background: selectedTrade === tr.id ? '#FFF3EE' : '#fff', cursor: 'pointer' }}>
              <span style={{ fontSize: 22 }}>{tr.emoji}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: selectedTrade === tr.id ? 'var(--orange)' : '#555', textAlign: 'center' }}>{tr.label}</span>
            </button>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555', marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
          {selectedTrade ? TRADES.find(t => t.id === selectedTrade)?.label : 'All'} · {shownHandy.length} available
        </div>
        {shownHandy.map(h => (
          <div key={h.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, background: h.available ? '#f0fdf4' : '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
              {TRADES.find(t => t.id === h.trade)?.emoji ?? '🤝'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{h.name}</span>
                {h.available && <span style={{ background: '#d1fae5', color: '#065f46', fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 900, padding: '1px 6px', borderRadius: 50 }}>AVAILABLE</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>⭐ {h.rating} · {h.jobs} jobs · 📍 {h.location}</div>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, fontWeight: 700, color: 'var(--orange)' }}>{h.rate}</div>
              <button onClick={() => openPanel('chatThread', { name: h.name })} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, cursor: 'pointer', marginTop: 4 }}>Contact</button>
            </div>
          </div>
        ))}
        <button onClick={() => openPanel('createListing', { category: 'Handy Help' })} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>+ Offer Your Services</button>
      </ActionPanel>
    )
  }

  // ── GRAB IT NOW (live deals) ─────────────────────────────────────────────────
  if (panel.id === 'grabItNow') {
    const DEALS = [
      { id: 'g1', title: 'PS5 + 2 Controllers', price: 299, original: 380, emoji: '🎮', location: 'Las Palmas', expiresIn: 7200 },
      { id: 'g2', title: 'iPhone 13 — Unlocked', price: 399, original: 550, emoji: '📱', location: 'Maspalomas', expiresIn: 16200 },
      { id: 'g3', title: 'Clearance Sofa', price: 95, original: 320, emoji: '🛋️', location: 'Telde', expiresIn: 4200 },
      { id: 'g4', title: 'MacBook Air M1', price: 599, original: 899, emoji: '💻', location: 'Las Palmas', expiresIn: 21600 },
      { id: 'g5', title: 'Mountain Bike', price: 180, original: 340, emoji: '🚴', location: 'Arucas', expiresIn: 1800 },
    ]
    function DealCard({ deal }: { deal: typeof DEALS[0] }) {
      const [secs, setSecs] = useState(deal.expiresIn)
      useEffect(() => { const id = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000); return () => clearInterval(id) }, [])
      const h = Math.floor(secs / 3600).toString().padStart(2, '0')
      const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
      const s = (secs % 60).toString().padStart(2, '0')
      const saving = deal.original - deal.price
      const pct = Math.round((saving / deal.original) * 100)
      return (
        <div onClick={() => openPanel('checkout', { title: deal.title, price: deal.price })} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0ebe4', marginBottom: 10, overflow: 'hidden', cursor: 'pointer' }}>
          <div style={{ background: 'linear-gradient(145deg,#FFF3EE,#FFE4D6)', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, position: 'relative' }}>
            {deal.emoji}
            <span style={{ position: 'absolute', top: 8, left: 10, background: '#ef4444', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 50 }}>-{pct}% OFF</span>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{deal.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: 'var(--orange)' }}>€{deal.price}</span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#bbb', textDecoration: 'line-through', marginLeft: 6 }}>€{deal.original}</span>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#888', marginBottom: 2 }}>Expires in</div>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13, color: secs < 1800 ? '#ef4444' : 'var(--orange)' }}>{h}:{m}:{s}</span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 4 }}>📍 {deal.location}</div>
          </div>
        </div>
      )
    }
    return (
      <ActionPanel title="⚡ Grab It Now" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,var(--orange),#FF8C00)', borderRadius: 14, padding: 14, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 800, marginBottom: 4 }}>⚡ FLASH DEALS — TODAY ONLY</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#fff', fontWeight: 700 }}>Grab before they're gone!</div>
        </div>
        {DEALS.map(deal => <DealCard key={deal.id} deal={deal} />)}
      </ActionPanel>
    )
  }

  // ── PROFILE ───────────────────────────────────────────────────────────────────
  if (panel.id === 'profile') {
    const GRADE_COLORS: Record<string, string> = { grabber: 'var(--orange)', dealer: '#eab308', trader: '#3b82f6', pro: '#8b5cf6' }
    const GRADE_ICONS: Record<string, string> = { grabber: '🟠', dealer: '🟡', trader: '🔵', pro: '⭐' }
    const MOCK_PROFILE = {
      grade: 'dealer', salesCount: 23, avgRating: 4.8, reviewCount: 19,
      memberSince: 'March 2026', verified: true, completionPct: 75,
      nextGrade: 'trader', nextGradeNeed: '28 more sales & 4.5★ avg',
      bio: 'Gran Canaria local. Selling quality electronics, furniture and sport gear. Fast responses, fair prices! 🌴',
    }
    const isOwnProfile = !panel.data?.userId || panel.data.userId === currentUserId
    const displayName = (panel.data?.name as string) ?? (isOwnProfile ? 'Your Profile' : 'Seller Profile')
    const gradeColor = GRADE_COLORS[MOCK_PROFILE.grade] ?? 'var(--orange)'
    return (
      <ActionPanel title="👤 Profile" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
          <div style={{ width: 80, height: 80, background: `linear-gradient(135deg,${gradeColor},#FF8C00)`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 12px' }}>👤</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 700, color: 'var(--dark)', marginBottom: 2 }}>{displayName}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 8 }}>Member since {MOCK_PROFILE.memberSince}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ background: `${gradeColor}22`, color: gradeColor, fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, padding: '4px 12px', borderRadius: 50 }}>{GRADE_ICONS[MOCK_PROFILE.grade]} {MOCK_PROFILE.grade.charAt(0).toUpperCase() + MOCK_PROFILE.grade.slice(1)}</span>
            {MOCK_PROFILE.verified && <span style={{ background: '#d1fae5', color: '#065f46', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 50 }}>✅ Verified</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[{ label: 'Sales', value: MOCK_PROFILE.salesCount }, { label: 'Rating', value: `${MOCK_PROFILE.avgRating}★` }, { label: 'Reviews', value: MOCK_PROFILE.reviewCount }].map(stat => (
            <div key={stat.label} style={{ background: '#f9f6f2', borderRadius: 12, padding: '12px 8px', textAlign: 'center' as const }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: gradeColor }}>{stat.value}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', fontWeight: 800 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        {MOCK_PROFILE.bio && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 14, padding: 12, background: '#f9f6f2', borderRadius: 12 }}>{MOCK_PROFILE.bio}</div>}
        {isOwnProfile && (
          <div style={{ background: '#fff', border: '1px solid #f0ebe4', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: '#555' }}>Profile completion</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: gradeColor }}>{MOCK_PROFILE.completionPct}%</span>
            </div>
            <div style={{ height: 6, background: '#f0ebe4', borderRadius: 3, marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${MOCK_PROFILE.completionPct}%`, background: gradeColor, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>Add a photo and verify your phone to reach 100%</div>
          </div>
        )}
        <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, color: 'var(--orange)', marginBottom: 4 }}>🏆 Next grade: {MOCK_PROFILE.nextGrade.charAt(0).toUpperCase() + MOCK_PROFILE.nextGrade.slice(1)}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>{MOCK_PROFILE.nextGradeNeed}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => openPanel('mySales')} style={{ flex: 1, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>My Sales</button>
          <button onClick={() => openPanel('mylistings')} style={{ flex: 1, background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 14, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>My Listings</button>
        </div>
        {!isOwnProfile && (
          <button onClick={() => openPanel('report', { title: displayName })} style={{ width: '100%', background: 'none', color: '#ef4444', border: '1px solid #f0ebe4', borderRadius: 14, padding: 10, fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', marginTop: 10 }}>🚨 Report this seller</button>
        )}
      </ActionPanel>
    )
  }

  // ── FEATURE LISTING ───────────────────────────────────────────────────────────
  if (panel.id === 'featureListing') {
    const listingTitle = (panel.data?.title as string) || 'Your listing'
    const [featWeeks, setFeatWeeks] = useState(1)
    const [featSubmitting, setFeatSubmitting] = useState(false)
    const [featDone, setFeatDone] = useState(false)
    const totalCost = (1.99 * featWeeks).toFixed(2)
    if (featDone) return (
      <ActionPanel title="👀 Featured!" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>🚀</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Listing is now featured!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', marginBottom: 20 }}>"{listingTitle}" appears at the top of search for {featWeeks} week{featWeeks > 1 ? 's' : ''}.</div>
          <button onClick={closePanel} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 32px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>Done</button>
        </div>
      </ActionPanel>
    )
    return (
      <ActionPanel title="👀 Feature Listing" onClose={closePanel}>
        <div style={{ background: '#FFF3EE', borderRadius: 14, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👀</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>"{listingTitle}"</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Featured listings appear at the top of search and get 3× more views</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 10 }}>Choose duration</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setFeatWeeks(w)} style={{ padding: '12px 4px', borderRadius: 12, border: `2px solid ${featWeeks === w ? 'var(--orange)' : '#e0d8d0'}`, background: featWeeks === w ? '#FFF3EE' : '#fff', cursor: 'pointer', textAlign: 'center' as const }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 700, color: featWeeks === w ? 'var(--orange)' : 'var(--dark)' }}>{w}wk</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888', marginTop: 2 }}>€{(1.99 * w).toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ background: '#f9f6f2', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          {[['Duration', `${featWeeks} week${featWeeks > 1 ? 's' : ''}`], ['Rate', '€1.99 / week'], ['Total', `€${totalCost}`]].map(([label, value], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: i === 2 ? 'var(--dark)' : '#666', fontWeight: i === 2 ? 900 : 400, borderTop: i === 2 ? '1px solid #e0d8d0' : 'none', marginTop: i === 2 ? 6 : 0, paddingTop: i === 2 ? 10 : 4 }}>
              <span>{label}</span><span style={{ color: i === 2 ? 'var(--orange)' : undefined }}>{value}</span>
            </div>
          ))}
        </div>
        <button onClick={async () => { setFeatSubmitting(true); await new Promise(r => setTimeout(r, 1200)); setFeatSubmitting(false); setFeatDone(true) }} disabled={featSubmitting} style={{ width: '100%', background: featSubmitting ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: featSubmitting ? 'not-allowed' : 'pointer' }}>
          {featSubmitting ? '⏳ Processing…' : `Pay €${totalCost} → Feature now`}
        </button>
      </ActionPanel>
    )
  }

  // ── WISHLIST ──────────────────────────────────────────────────────────────────
  if (panel.id === 'wishlist') {
    const MOCK_WISHES = [
      { id: 'w1', emoji: '📱', title: 'iPhone 14 Pro', price: '≤€600', dept: 'Electronics', matched: true },
      { id: 'w2', emoji: '🚴', title: 'Mountain Bike', price: '≤€300', dept: 'Sport', matched: false },
      { id: 'w3', emoji: '🎮', title: 'Nintendo Switch', price: '≤€200', dept: 'Gaming', matched: true },
    ]
    return (
      <ActionPanel title="🎯 My Wishlist" onClose={closePanel}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginBottom: 14 }}>We'll notify you when a matching listing appears.</div>
        {MOCK_WISHES.map(w => (
          <div key={w.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, background: w.matched ? '#FFF3EE' : '#f5f0e8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, position: 'relative' }}>
              {w.emoji}
              {w.matched && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--orange)', color: '#fff', fontSize: 9, fontWeight: 900, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{w.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{w.dept} · {w.price}</div>
              {w.matched && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--orange)', fontWeight: 900, marginTop: 2 }}>⚡ Match found — tap to view</div>}
            </div>
            <button onClick={() => openPanel('search', { query: w.title })} style={{ background: w.matched ? 'var(--orange)' : '#f5f0e8', color: w.matched ? '#fff' : '#555', border: 'none', borderRadius: 50, padding: '6px 12px', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>{w.matched ? 'View' : 'Search'}</button>
          </div>
        ))}
        <button onClick={() => openPanel('search')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer', marginTop: 16 }}>+ Add wish</button>
      </ActionPanel>
    )
  }

  // ── FAVOURITES ────────────────────────────────────────────────────────────────
  if (panel.id === 'favourites') {
    const [favItems, setFavItems] = useState<{ listingId: string; listing: { id: string; title: string; price: number; location: string; status: string; images: string[] } }[] | null>(null)
    const [favLoading, setFavLoading] = useState(true)
    useEffect(() => {
      getTrpcClient().then(client => client.wishlist.list.query()).then(data => {
        setFavItems(data as unknown as typeof favItems)
        setFavLoading(false)
      }).catch(() => setFavLoading(false))
    }, [])

    const handleUnfavourite = async (listingId: string) => {
      setFavItems(prev => prev?.filter(f => f.listingId !== listingId) ?? null)
      const client = await getTrpcClient()
      await client.wishlist.toggle.mutate({ listingId })
    }

    return (
      <ActionPanel title="❤️ Favourites" onClose={closePanel}>
        {favLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', fontFamily: 'var(--font-ui)', fontSize: 12 }}>Loading…</div>
        ) : !favItems || favItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤍</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>No favourites yet</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Tap ❤️ on any listing to save it here.</div>
          </div>
        ) : favItems.map(f => {
          const isSold = f.listing.status === 'sold'
          return (
            <div key={f.listingId} onClick={() => !isSold && openPanel('listing', { id: f.listingId })} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', cursor: isSold ? 'default' : 'pointer', opacity: isSold ? 0.6 : 1 }}>
              <div style={{ width: 52, height: 52, background: '#f5f0e8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0, overflow: 'hidden' }}>
                {f.listing.images[0] ? <img src={f.listing.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{f.listing.title}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 15, fontWeight: 700, color: 'var(--orange)' }}>€{f.listing.price}</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>📍 {f.listing.location}</div>
              </div>
              {isSold ? (
                <span style={{ background: '#f0f0f0', color: '#888', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 50 }}>SOLD</span>
              ) : (
                <button onClick={e => { e.stopPropagation(); handleUnfavourite(f.listingId) }} style={{ background: '#fff', color: '#ef4444', border: '1px solid #f0ebe4', borderRadius: 50, padding: '5px 10px', fontFamily: 'var(--font-ui)', fontSize: 16, cursor: 'pointer' }}>❤️</button>
              )}
            </div>
          )
        })}
      </ActionPanel>
    )
  }

  // ── MY ACTIVITY ───────────────────────────────────────────────────────────────
  if (panel.id === 'myActivity') {
    const ACTIVITY = [
      { icon: '🛒', title: 'Purchased PS5 Console', detail: 'from @gc_gaming_shop', time: '2h ago', color: '#3b82f6' },
      { icon: '💬', title: 'Message sent to María R.', detail: 'Re: Cleaning — Handy Help', time: '4h ago', color: '#8b5cf6' },
      { icon: '💰', title: 'Offer received on Surfboard', detail: 'Dave M. offered €85', time: '6h ago', color: 'var(--orange)' },
      { icon: '⭐', title: 'Review left for @seller_anna', detail: '5★ — Great seller!', time: '1d ago', color: '#eab308' },
      { icon: '📦', title: 'Listed IKEA Sofa', detail: '€180 · Las Palmas', time: '2d ago', color: 'var(--sage)' },
      { icon: '✅', title: 'Handover confirmed', detail: 'iPhone 13 — Released to @seller_mike', time: '3d ago', color: '#16a34a' },
    ]
    return (
      <ActionPanel title="📋 My Activity" onClose={closePanel}>
        {currentUserId ? ACTIVITY.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, background: `${a.color}18`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)', marginBottom: 2 }}>{a.title}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{a.detail}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#bbb', flexShrink: 0 }}>{a.time}</div>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>Log in to see your activity</div>
            <button onClick={() => openPanel('login')} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontFamily: 'var(--font-ui)', fontWeight: 900, cursor: 'pointer' }}>Log in</button>
          </div>
        )}
      </ActionPanel>
    )
  }

  // ── MY RATINGS ────────────────────────────────────────────────────────────────
  if (panel.id === 'myRatings') {
    const RATINGS = [
      { from: 'Anna T.', rating: 5, comment: 'Quick and easy — great condition, exactly as described!', date: '28 Jun', role: 'buyer' },
      { from: 'Carlos M.', rating: 5, comment: 'Super fast payment, would buy from again.', date: '22 Jun', role: 'seller' },
      { from: 'Emma W.', rating: 4, comment: 'Nice item, slight delay but all good in the end.', date: '15 Jun', role: 'buyer' },
      { from: 'Pete L.', rating: 5, comment: 'Excellent seller — recommended!', date: '8 Jun', role: 'buyer' },
    ]
    const avgRating = RATINGS.reduce((s, r) => s + r.rating, 0) / RATINGS.length
    return (
      <ActionPanel title="⭐ My Ratings" onClose={closePanel}>
        <div style={{ background: 'linear-gradient(135deg,var(--orange),#FF8C00)', borderRadius: 14, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 48, fontWeight: 700, color: '#fff' }}>{avgRating.toFixed(1)}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{'⭐'.repeat(Math.round(avgRating))} · {RATINGS.length} reviews</div>
        </div>
        {RATINGS.map((r, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0ebe4', padding: '14px 12px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, background: '#f5f0e8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: 'var(--dark)' }}>{r.from}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>as {r.role} · {r.date}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: '#f59e0b' }}>{'⭐'.repeat(r.rating)}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', lineHeight: 1.5, fontStyle: 'italic' }}>"{r.comment}"</div>
          </div>
        ))}
      </ActionPanel>
    )
  }

  // ── REPORT ────────────────────────────────────────────────────────────────────
  if (panel.id === 'report') {
    const reportTarget = (panel.data?.title as string) || 'this listing'
    const REPORT_REASONS = [
      { id: 'scam', label: '🚨 Suspected scam / fraud', desc: 'Trying to scam or defraud people' },
      { id: 'prohibited', label: '🚫 Prohibited item', desc: 'Item should not be sold on Grabitt' },
      { id: 'fake', label: '📸 Fake photos / misleading', desc: 'Photos or description do not match the item' },
      { id: 'price', label: '💰 Price gouging', desc: 'Abnormally high price for this item' },
      { id: 'duplicate', label: '🔁 Duplicate listing', desc: 'Item has been listed more than once' },
      { id: 'other', label: '❓ Other', desc: 'Other reason not listed above' },
    ]
    const [reportReason, setReportReason] = useState('')
    const [reportNotes, setReportNotes] = useState('')
    const [reportDone, setReportDone] = useState(false)
    const [reportSubmitting, setReportSubmitting] = useState(false)
    if (reportDone) return (
      <ActionPanel title="✅ Report submitted" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🛡️</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Thanks for keeping Grabitt safe</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 20 }}>Our team reviews all reports within 24 hours.</div>
          <button onClick={closePanel} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>Done</button>
        </div>
      </ActionPanel>
    )
    return (
      <ActionPanel title="🚨 Report" onClose={closePanel}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#888', marginBottom: 12 }}>Reporting: <strong>{reportTarget}</strong></div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color: '#555', marginBottom: 8 }}>Reason</div>
        {REPORT_REASONS.map(r => (
          <div key={r.id} onClick={() => setReportReason(r.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, border: `2px solid ${reportReason === r.id ? 'var(--orange)' : '#f0ebe4'}`, background: reportReason === r.id ? '#FFF3EE' : '#fff', marginBottom: 8, cursor: 'pointer' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: reportReason === r.id ? 'var(--orange)' : 'var(--dark)' }}>{r.label}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginTop: 2 }}>{r.desc}</div>
            </div>
            <div style={{ width: 20, height: 20, border: `2px solid ${reportReason === r.id ? 'var(--orange)' : '#e0d8d0'}`, borderRadius: '50%', flexShrink: 0, background: reportReason === r.id ? 'var(--orange)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {reportReason === r.id && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
            </div>
          </div>
        ))}
        <textarea value={reportNotes} onChange={e => setReportNotes(e.target.value)} placeholder="Additional details (optional)…" rows={3} style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical' as const, boxSizing: 'border-box' as const, marginTop: 8, marginBottom: 16 }} />
        <button onClick={async () => { if (!reportReason) return; setReportSubmitting(true); await new Promise(r => setTimeout(r, 800)); setReportSubmitting(false); setReportDone(true) }} disabled={!reportReason || reportSubmitting} style={{ width: '100%', background: !reportReason || reportSubmitting ? '#ccc' : '#ef4444', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: !reportReason ? 'not-allowed' : 'pointer' }}>
          {reportSubmitting ? 'Submitting…' : '🚨 Submit Report'}
        </button>
      </ActionPanel>
    )
  }

  // ── FOLLOWING ─────────────────────────────────────────────────────────────────
  if (panel.id === 'following') {
    const FOLLOWING_LIST = [
      { id: '1', name: 'GC Gaming Shop', handle: '@gcgaming', grade: 'dealer', items: 45, emoji: '🎮' },
      { id: '2', name: 'María Moda', handle: '@mariamoda', grade: 'grabber', items: 12, emoji: '👗' },
      { id: '3', name: 'TechGC', handle: '@techgc', grade: 'trader', items: 89, emoji: '📱' },
    ]
    const GRADE_C: Record<string, string> = { grabber: 'var(--orange)', dealer: '#eab308', trader: '#3b82f6', pro: '#8b5cf6' }
    return (
      <ActionPanel title="👥 Following" onClose={closePanel}>
        {FOLLOWING_LIST.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>Not following anyone yet</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#666' }}>Follow sellers to see their new listings instantly.</div>
          </div>
        ) : FOLLOWING_LIST.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
            <div style={{ width: 50, height: 50, background: '#f5f0e8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{s.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)' }}>{s.name}</span>
                <span style={{ background: `${GRADE_C[s.grade]}22`, color: GRADE_C[s.grade], fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 50 }}>{s.grade}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888' }}>{s.handle} · {s.items} listings</div>
            </div>
            <button style={{ background: '#f5f0e8', color: '#555', border: 'none', borderRadius: 50, padding: '6px 14px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Unfollow</button>
          </div>
        ))}
      </ActionPanel>
    )
  }

  // ── VERIFY ME ─────────────────────────────────────────────────────────────────
  if (panel.id === 'verifyMe') {
    const VERIFY_STEPS = [
      { id: 'email', label: '📧 Email', done: true },
      { id: 'phone', label: '📱 Phone number', done: false },
      { id: 'id', label: '🪪 ID document', done: false },
      { id: 'address', label: '🏠 Address', done: false },
    ]
    return (
      <ActionPanel title="✅ Verify Me" onClose={closePanel}>
        <div style={{ background: '#FFF3EE', borderRadius: 14, padding: 14, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>Build trust with buyers & sellers</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#666' }}>Verified members get 2× more responses</div>
        </div>
        {VERIFY_STEPS.map(step => (
          <div key={step.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>{step.label}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: step.done ? '#16a34a' : '#888', marginTop: 2 }}>{step.done ? '✅ Verified' : 'Not verified'}</div>
            </div>
            {!step.done && (
              <button style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>Verify →</button>
            )}
          </div>
        ))}
      </ActionPanel>
    )
  }

  // ── BUSINESS ACCOUNT ──────────────────────────────────────────────────────────
  if (panel.id === 'business') {
    const [bizStep, setBizStep] = useState<'info'|'type'|'trial'|'done'>('info')
    const [bizName, setBizName] = useState('')
    const [bizType, setBizType] = useState('')
    const BIZ_TYPES = [
      { id: 'shop', label: '🏪 Retail Shop', desc: 'Physical shop selling goods' },
      { id: 'trade', label: '🔧 Trade & Services', desc: 'Plumber, electrician, cleaner…' },
      { id: 'restaurant', label: '🍽️ Restaurant / Bar', desc: 'Food & drink establishment' },
      { id: 'agency', label: '🏠 Estate Agent', desc: 'Property sales or lettings' },
      { id: 'recruiter', label: '💼 Recruitment / HR', desc: 'Job placement or staffing' },
      { id: 'other', label: '📋 Other', desc: 'Other type of business' },
    ]
    if (bizStep === 'done') return (
      <ActionPanel title="🎉 Business Account Activated" onClose={closePanel}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🏪</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 900, color: 'var(--dark)', marginBottom: 8 }}>Welcome, {bizName}!</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>Your 21-day free trial has started.</div>
          <div style={{ background: '#FFF3EE', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            {['Unlimited listings during trial', 'Business storefront page', 'Analytics dashboard', 'Priority support'].map((f, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', padding: '4px 0' }}>✅ {f}</div>
            ))}
          </div>
          <button onClick={closePanel} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 32px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>Start selling →</button>
        </div>
      </ActionPanel>
    )
    return (
      <ActionPanel title="🏪 Business Account" onClose={closePanel}>
        {bizStep === 'info' && (
          <>
            <div style={{ background: 'linear-gradient(135deg,var(--orange),#FF8C00)', borderRadius: 14, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>21-day free trial</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>No credit card required</div>
            </div>
            {['Unlimited listings', 'Business storefront', 'Analytics & insights', 'Reduced seller fees', 'Priority placement'].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontFamily: 'var(--font-ui)', fontSize: 13, color: '#555' }}><span>✅</span><span>{f}</span></div>
            ))}
            <button onClick={() => setBizStep('type')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginTop: 20 }}>Start free trial →</button>
          </>
        )}
        {bizStep === 'type' && (
          <>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 12 }}>What type of business?</div>
            {BIZ_TYPES.map(t => (
              <div key={t.id} onClick={() => setBizType(t.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, border: `2px solid ${bizType === t.id ? 'var(--orange)' : '#f0ebe4'}`, background: bizType === t.id ? '#FFF3EE' : '#fff', marginBottom: 8, cursor: 'pointer' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 800, color: bizType === t.id ? 'var(--orange)' : 'var(--dark)' }}>{t.label}</div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#888', marginTop: 2 }}>{t.desc}</div>
                </div>
              </div>
            ))}
            <input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Business name *" style={{ width: '100%', border: '1.5px solid #e0d8d0', borderRadius: 10, padding: 12, fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' as const, marginTop: 12 }} />
            <button onClick={() => { if (bizType && bizName.trim()) setBizStep('trial') }} disabled={!bizType || !bizName.trim()} style={{ width: '100%', background: !bizType || !bizName.trim() ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: !bizType ? 'not-allowed' : 'pointer', marginTop: 16 }}>Continue →</button>
          </>
        )}
        {bizStep === 'trial' && (
          <>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 900, color: 'var(--dark)', marginBottom: 12 }}>Confirm your 21-day trial</div>
            <div style={{ background: '#f9f6f2', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              {[['Business name', bizName], ['Business type', BIZ_TYPES.find(t => t.id === bizType)?.label ?? ''], ['Trial period', '21 days free'], ['After trial', 'Plans from €19.99/mo']].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#555', borderBottom: '1px solid #f0ebe4' }}>
                  <span>{l}</span><span style={{ fontWeight: 800, color: 'var(--dark)' }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setBizStep('done')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>🚀 Activate Trial — Free for 21 Days</button>
          </>
        )}
      </ActionPanel>
    )
  }

  return null
}
