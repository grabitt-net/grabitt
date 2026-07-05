'use client'
import { useEffect, useState } from 'react'

// Reactive read of the app identity (grabitt_uid). Updates when AuthBootstrap
// dispatches 'grabitt-auth' (login/logout) or another tab writes localStorage —
// so the header reflects auth state without a full page reload.
export function useGrabittUid() {
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    const read = () => setUid(typeof window !== 'undefined' ? localStorage.getItem('grabitt_uid') : null)
    read()
    window.addEventListener('grabitt-auth', read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener('grabitt-auth', read)
      window.removeEventListener('storage', read)
    }
  }, [])
  return uid
}
