'use client'
import { PanelProvider } from '@/context/PanelContext'
import Topbar from './Topbar'
import PanelHost from './PanelHost'

// The site header for standalone pages (messages, community, forms). It is the
// same Topbar the homepage uses — search, panels, notifications — so every page
// carries identical chrome.
//
// Topbar opens panels, so it needs a PanelProvider and a PanelHost to render
// them. Bundling all three here lets a page drop in <SiteHeader /> without
// restructuring, and it works from server components too (this file is the
// client boundary). Pages that already have their own PanelProvider should
// render <Topbar /> directly instead, so a second context isn't nested.
export default function SiteHeader() {
  return (
    <PanelProvider>
      <Topbar />
      <PanelHost />
    </PanelProvider>
  )
}
