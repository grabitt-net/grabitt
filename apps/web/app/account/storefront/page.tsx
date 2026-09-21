'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StorefrontEditor from '@/components/marketplace/StorefrontEditor'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'

// Full-page "My storefront" setup. First-login business accounts are sent here
// (see /account) so they set up their shop properly — logo, banner, about,
// template — with everything saved via business.upsertStorefront. Closing marks
// onboarding complete so they aren't sent back here on the next visit.
export default function StorefrontSetupPage() {
  const router = useRouter()

  useEffect(() => {
    (async () => {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) router.push('/auth?next=/account/storefront')
    })()
  }, [router])

  const finish = () => {
    // Don't force the setup again if they leave — saving already marks onboarding
    // complete, and this covers the "finish later" case.
    trpcAuthed().business.markOnboarded.mutate().catch(() => {})
    router.push('/account')
  }

  return <StorefrontEditor onClose={finish} />
}
