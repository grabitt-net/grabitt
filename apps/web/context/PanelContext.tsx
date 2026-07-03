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
  | 'cart' | 'buyCredits' | 'transaction' | 'myDisputes' | 'storefront' | 'applications'

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

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelState>({ id: null })

  const openPanel = useCallback((id: PanelId, data?: Record<string, unknown>) => {
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
