import { useLocale, useTranslations } from 'next-intl'
import { Clock, MapPin, Phone, Star } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { Link } from '@/i18n/navigation'
import type { ProviderDetail } from '@/lib/api/types'
import { dateNames, formatDuration, formatPrice } from '@/lib/dates'
import { ProviderReviews } from './provider-reviews'

const hhmm = (time: string) => time.slice(0, 5)

/** Provider profile (#30): who, what it costs, when they work, where. */
export function ProviderProfile({ provider }: { provider: ProviderDetail }) {
  const t = useTranslations('provider')
  const tc = useTranslations('catalog')
  const locale = useLocale()
  const { summary } = provider
  // Schedule days are ISO (1 = Monday); the names array starts on Sunday.
  const dayName = (day: number) => {
    const name = dateNames(locale).weekdays[day % 7]
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-6">
        <section className="flex items-start gap-4">
          <div
            aria-hidden
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl font-semibold text-secondary-foreground"
          >
            {summary.initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {summary.name}
              </h1>
              <FavoriteButton slug={summary.slug} />
            </div>
            <p className="text-muted-foreground">
              {summary.title} · {summary.categoryName}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="flex items-center gap-1 font-medium">
                <Star className="size-4 fill-current" aria-hidden />
                {summary.rating}
              </span>
              <span className="text-muted-foreground">
                {tc('reviews', { count: summary.reviewCount })}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                {summary.city}
              </span>
            </div>
          </div>
        </section>

        {provider.bio && <p className="leading-relaxed">{provider.bio}</p>}

        <section aria-labelledby="services" className="flex flex-col gap-3">
          <h2 id="services" className="text-xl font-semibold">
            {t('services')}
          </h2>
          <ul className="flex flex-col gap-3">
            {provider.services.map((service) => (
              <li key={service.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-3 text-sm">
                        <span className="font-medium">
                          {formatPrice(service.price)}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="size-3.5" aria-hidden />
                          {formatDuration(service.durationMinutes, locale)}
                        </span>
                      </p>
                    </div>
                    <Link
                      href={`/book/${summary.slug}?service=${service.id}`}
                      className={buttonVariants({
                        size: 'lg',
                        className: 'h-10 shrink-0',
                      })}
                    >
                      {t('book')}
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="reviews" className="flex flex-col gap-3">
          <h2 id="reviews" className="text-xl font-semibold">
            {t('reviews')}
          </h2>
          <ProviderReviews
            reviews={provider.reviews ?? []}
            reviewCount={summary.reviewCount}
          />
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('schedule')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2 text-sm">
              {provider.schedule.map((day) => (
                <div key={day.day} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{dayName(day.day)}</dt>
                  <dd className="text-right">
                    {day.intervals.length === 0
                      ? t('dayOff')
                      : day.intervals
                          .map((i) => `${hhmm(i.start)}-${hhmm(i.end)}`)
                          .join(', ')}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('contact')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {provider.address && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                {provider.address}, {summary.city}
              </p>
            )}
            {provider.phone && (
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" aria-hidden />
                {provider.phone}
              </p>
            )}
            <p className="text-muted-foreground">
              {t('cancellation', { hours: provider.cancellationHours })}
            </p>
          </CardContent>
        </Card>
        <Link
          href={`/book/${summary.slug}`}
          className={buttonVariants({ size: 'lg', className: 'h-11' })}
        >
          {t('book')}
        </Link>
      </aside>
    </div>
  )
}
