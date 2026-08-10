'use client'
import dynamic from 'next/dynamic'

// PanelHost is a very large client component (cart, checkout, login, business
// signup, notifications, … — thousands of lines + Stripe + maps). It renders
// nothing until the user opens a panel, so loading it eagerly just bloats every
// page's initial JS bundle and delays hydration + first data fetch. Load it on
// demand instead: the chunk arrives the moment a panel is actually opened.
const PanelHostLazy = dynamic(() => import('./PanelHost'), { ssr: false })
export default PanelHostLazy
