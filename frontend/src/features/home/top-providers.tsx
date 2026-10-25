import Link from 'next/link'
import { Clock, MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { formatNextSlot, formatPrice } from './format'
import type { ProviderSummary } from './mock-data'

export function ProviderCard({
  provider,
  today,
}: {
  provider: ProviderSummary
  today: string
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-center gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary font-semibold"
          aria-hidden
        >
          {provider.initials}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-medium">{provider.name}</h3>
          <p className="text-sm text-muted-foreground">{provider.title}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <Star className="size-4 fill-current" aria-hidden />
            {provider.rating.toFixed(1)}
          </span>
          <span className="text-muted-foreground">
            {provider.reviewCount} rəy
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {provider.city}
          </span>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">Qiymət: </span>
          {formatPrice(provider.priceFrom)}-dan
        </p>
        <Badge
          variant="secondary"
          className="h-auto min-h-6 max-w-full gap-1.5 px-2.5 py-1 text-left whitespace-normal"
        >
          <Clock aria-hidden />
          <span>
            Növbəti boş vaxt: {formatNextSlot(provider.nextSlot, today)}
          </span>
        </Badge>
      </CardContent>
      <CardFooter className="mt-auto">
        <Link
          href={`/providers/${provider.slug}`}
          className={buttonVariants({
            className: 'h-10 w-full bg-cta text-cta-foreground hover:bg-cta/90',
          })}
        >
          Randevu götür
        </Link>
      </CardFooter>
    </Card>
  )
}

export function TopProviders({
  providers,
  today,
}: {
  providers: ProviderSummary[]
  today: string
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Yüksək reytinqli mütəxəssislər
        </h2>
        <Link
          href="/search?sort=rating"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Hamısına bax
        </Link>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((provider) => (
          <li key={provider.slug}>
            <ProviderCard provider={provider} today={today} />
          </li>
        ))}
      </ul>
    </section>
  )
}
