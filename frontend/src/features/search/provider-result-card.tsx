import Link from 'next/link'
import { Clock, MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import type { ProviderSummary } from '@/lib/api/types'
import { formatPrice } from '@/lib/dates'

/** One search result: avatar, name, rating, price and the next free time. */
export function ProviderResultCard({
  provider,
}: {
  provider: ProviderSummary
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-semibold text-secondary-foreground"
          >
            {provider.initials}
          </div>
          <div className="min-w-0">
            <Link
              href={`/providers/${provider.slug}`}
              className="block truncate font-medium hover:underline"
            >
              {provider.name}
            </Link>
            <p className="truncate text-sm text-muted-foreground">
              {provider.title} · {provider.categoryName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <Star className="size-4 fill-current" aria-hidden />
            {provider.rating}
          </span>
          <span className="text-muted-foreground">
            {provider.reviewCount} rəy
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {provider.city}
          </span>
        </div>
        {provider.priceFrom !== null && (
          <p className="text-sm">
            <span className="text-muted-foreground">Qiymət: </span>
            {formatPrice(provider.priceFrom)}-dan
          </p>
        )}
        {provider.nextSlot && (
          <Badge
            variant="secondary"
            className="h-auto min-h-6 max-w-full gap-1.5 px-2.5 py-1 text-left whitespace-normal"
          >
            <Clock aria-hidden />
            <span>Növbəti boş vaxt: {provider.nextSlot}</span>
          </Badge>
        )}
      </CardContent>
      <CardFooter className="mt-auto">
        <Link
          href={`/book/${provider.slug}`}
          className={buttonVariants({ size: 'lg', className: 'h-10 w-full' })}
        >
          Randevu götür
        </Link>
      </CardFooter>
    </Card>
  )
}
