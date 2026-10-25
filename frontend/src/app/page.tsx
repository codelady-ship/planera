import { ScrollScene } from '@/components/motion/scroll-scene'
import { CategoryGrid } from '@/features/home/category-grid'
import { HeroSearch } from '@/features/home/hero-search'
import { HowItWorks } from '@/features/home/how-it-works'
import { TOP_PROVIDERS } from '@/features/home/mock-data'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { TopProviders } from '@/features/home/top-providers'

// The mock slots are fixed dates, so "today" is pinned to keep the prerendered
// page stable. It becomes the real Baku date once slots come from the API.
const MOCK_TODAY = '2026-10-25'

export default function Home() {
  return (
    <>
      <ScrollScene />
      <SiteHeader />
      <main className="flex-1">
        <HeroSearch />
        <CategoryGrid />
        <TopProviders providers={TOP_PROVIDERS} today={MOCK_TODAY} />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  )
}
