import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { CTAButtons } from '@/components/cta-buttons'
import { EventInfo } from '@/components/event-info'
import { Activities } from '@/components/activities'
import { DisguiseNote } from '@/components/disguise-note'
import { BingoTeaser } from '@/components/bingo-teaser'
import { Footer } from '@/components/footer'

export default function KermingoLanding() {
  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <Header />
      <Hero />

      <main className="pb-10">
        <CTAButtons />
        <EventInfo />
        <Activities />
        <DisguiseNote />
        <BingoTeaser />
      </main>

      <Footer />
    </div>
  )
}
