import { CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Placeholder until the home page (#4) lands.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <CalendarCheck className="size-10" aria-hidden />
      <h1 className="text-3xl font-semibold tracking-tight">randevu</h1>
      <p className="max-w-md text-muted-foreground">
        Universal onlayn randevu platforması hazırlanır.
      </p>
      <Button className="bg-cta text-cta-foreground hover:bg-cta/90">
        Tezliklə
      </Button>
    </main>
  )
}
