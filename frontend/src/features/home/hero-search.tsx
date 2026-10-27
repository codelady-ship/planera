import { useTranslations } from 'next-intl'
import { CalendarDays, MapPin, NotebookPen, Search } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const CITIES = ['Bakı', 'Sumqayıt', 'Gəncə', 'Lənkəran', 'Şəki']

// A plain GET form: the search page (#29) reads the same query parameters, so
// the hero works without client-side JavaScript.
export function HeroSearch() {
  const t = useTranslations('home')
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-20 md:pb-24">
      <div className="max-w-2xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-medium text-primary ring-1 ring-border">
          <span className="size-2 rounded-full bg-brand-teal" aria-hidden />
          {t('slogan')}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('lead')}</p>
        <p className="mt-2 text-sm font-medium text-primary">{t('tagline')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/search"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-11 bg-cta px-6 text-base text-cta-foreground hover:bg-cta/90',
            )}
          >
            <CalendarDays aria-hidden />
            {t('book')}
          </Link>
          <Link
            href="/account?tab=agenda&new=1"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-11 px-6 text-base',
            )}
          >
            <NotebookPen aria-hidden />
            {t('note')}
          </Link>
        </div>
      </div>

      <form
        action="/search"
        role="search"
        className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border bg-card p-3 shadow-sm md:grid-cols-[1.4fr_1fr_1fr_auto]"
      >
        <label className="flex items-center gap-2 rounded-lg px-2">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">{t('searchPlaceholder')}</span>
          <Input
            name="q"
            placeholder={t('searchPlaceholder')}
            className="h-11 border-0 shadow-none focus-visible:ring-0"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg px-2 md:border-l">
          <MapPin className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">{t('city')}</span>
          <select
            name="city"
            defaultValue="Bakı"
            className="h-11 w-full bg-transparent text-sm outline-none"
          >
            {CITIES.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg px-2 md:border-l">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">{t('date')}</span>
          <Input
            type="date"
            name="date"
            className="h-11 border-0 shadow-none focus-visible:ring-0"
          />
        </label>
        <Button
          type="submit"
          className="h-11 bg-cta px-6 text-base text-cta-foreground hover:bg-cta/90"
        >
          {t('search')}
        </Button>
      </form>
    </section>
  )
}
