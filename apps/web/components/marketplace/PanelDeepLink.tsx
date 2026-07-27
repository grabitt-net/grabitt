'use client'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePanel, type PanelId } from '@/context/PanelContext'

// Opens a panel from a URL query, so links like /?help=1 (from the Grabitt Team
// channel, emails, etc.) actually open the Help Centre instead of just landing
// on the home page. Add more param → panel mappings here as needed.
const PARAM_TO_PANEL: Record<string, PanelId> = {
  help: 'help',
  sell: 'sell',
  invite: 'invite',
  business: 'business',   // /?business=1 → business upgrade (used after a Business signup)
}

function Inner() {
  const params = useSearchParams()
  const { openPanel } = usePanel()

  useEffect(() => {
    for (const [param, panel] of Object.entries(PARAM_TO_PANEL)) {
      if (params.get(param)) { openPanel(panel); break }
    }
    // Run once per query change.
  }, [params, openPanel])

  return null
}

export default function PanelDeepLink() {
  // useSearchParams must sit inside a Suspense boundary.
  return <Suspense fallback={null}><Inner /></Suspense>
}
