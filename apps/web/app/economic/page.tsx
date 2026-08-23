'use client'
import InfoPage from '@/components/marketplace/InfoPage'
import EconomicLiving from '@/components/marketplace/EconomicLiving'

// Footer → Help & guides → Economic Living (item 18). Split out of Grabitt Guides
// into its own page on the standard footer-page template. Content is unchanged.
export default function EconomicPage() {
  return (
    <InfoPage
      title="Economic Living"
      topbarTitle="Economic Living"
      intro="Smart ways to save, reuse and live well for less across the Canary Islands. Got a tip? Share it and it could be featured."
      pills={['Save money', 'Reuse & reduce', 'Local know-how', 'Community tips']}
    >
      <EconomicLiving />
    </InfoPage>
  )
}
