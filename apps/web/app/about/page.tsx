'use client'
import InfoPage, { Band } from '@/components/marketplace/InfoPage'

// Footer → Grabitt → About Us. Body copy is Steve's, used exactly as written.
export default function AboutPage() {
  return (
    <InfoPage
      title="About Grabitt"
      topbarTitle="About Us"
      intro="Grabitt IS your local, Everything."
      pills={['Local to the Canaries', 'Secure Escrow', 'Buyer Protection', 'No Fees on Jobs & Property']}
    >
      <Band>
        <p style={{ margin: '0 0 14px' }}>We identified a huge need for a few things that would make life easier for residents and visitors on the Canary Islands: buying, selling, property, charity, recruitment, and finding help and services for work or home.</p>
        <p style={{ margin: '0 0 14px' }}>The current offerings are, let&apos;s be honest, scattered and disjointed across social media and a couple of broader marketplaces that don&apos;t focus on the Canary Islands.</p>
        <p style={{ margin: '0 0 14px' }}>It makes it so hard — to find replies, to keep track of what you&apos;re buying or selling, to find a job or the right staff, to move home, or even to set up your own little business selling from home.</p>
        <p style={{ margin: 0 }}>So we decided to create Grabitt, and bring it all together in one easy to use marketplace! Grabitt IS your local, Everything!</p>
      </Band>

      <Band heading="Our Mission" tint reverse>
        <p style={{ margin: 0 }}>Very simple: to make life easier. Businesses finding great staff, people finding jobs and homes, charities raising money and awareness at no cost, and everyone having a little extra cash during tough times.</p>
      </Band>
    </InfoPage>
  )
}
