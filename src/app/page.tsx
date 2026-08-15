import { Hero } from '@/components/layout/hero'
import { Features } from '@/components/layout/features'
import { Methodology } from '@/components/layout/methodology'
import { Footer } from '@/components/layout/footer'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <main className="flex-1">
        <Features />
        <Methodology />
      </main>
      <Footer />
    </div>
  )
}