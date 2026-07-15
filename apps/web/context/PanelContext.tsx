'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type PanelId =
  | 'alerts' | 'saved' | 'rewards' | 'login' | 'messages' | 'sell' | 'help'
  | 'shield' | 'affiliate' | 'dept' | 'near' | 'grabit' | 'sponsors'
  | 'employers' | 'business' | 'footer' | 'menu' | 'justlisted'
  | 'listing' | 'search' | 'savesearch' | 'savedSearches'
  | 'offers' | 'purchases' | 'mylistings' | 'wishlist'
  | 'invite' | 'recentviewed' | 'favourites' | 'soldprices' | 'advertise'
  | 'checkout' | 'makeOffer' | 'offerReceived' | 'handover' | 'reviewTx' | 'dispute' | 'mySales'
  | 'createListing' | 'chatThread'
  | 'jobs' | 'property' | 'handy' | 'grabItNow' | 'profile' | 'featureListing'
  | 'myActivity' | 'myRatings' | 'report' | 'verifyMe' | 'following'
  | 'cart' | 'buyCredits' | 'transaction' | 'myDisputes' | 'storefront' | 'storefrontEdit' | 'applications'
  | 'findStaff'

interface PanelState {
  id: PanelId | null
  data?: Record<string, unknown>
}

interface PanelContextValue {
  panel: PanelState
  openPanel: (id: PanelId, data?: Record<string, unknown>) => void
  closePanel: () => void
}

const PanelContext = createContext<PanelContextValue>({
  panel: { id: null },
  openPanel: () => {},
  closePanel: () => {},
})

// Panels that require an authenticated user. Selling/creating a listing must
// never be reachable while logged out — attempting it redirects to the login
// panel, which resumes the original action once the user is signed in.
const AUTH_REQUIRED: ReadonlySet<PanelId> = new Set(['sell', 'createListing'])

function isLoggedIn() {
  return typeof window !== 'undefined' && !!localStorage.getItem('grabitt_uid')
}

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelState>({ id: null })

  const openPanel = useCallback((id: PanelId, data?: Record<string, unknown>) => {
    if (AUTH_REQUIRED.has(id) && !isLoggedIn()) {
      // Force login/registration first, remembering where they were headed.
      setPanel({ id: 'login', data: { next: id, nextData: data } })
      return
    }
    setPanel({ id, data })
  }, [])

  const closePanel = useCallback(() => {
    setPanel({ id: null })
  }, [])

  return (
    <PanelContext.Provider value={{ panel, openPanel, closePanel }}>
      {children}
    </PanelContext.Provider>
  )
}

export function usePanel() {
  return useContext(PanelContext)
}
