'use client'

import { useTranslations } from 'next-intl'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { toggleFavorite, useFavorites } from './use-favorites'

/**
 * Heart on a provider card or profile (#46). A visitor without a session
 * is sent to the login page and comes back to the same provider.
 */
export function FavoriteButton({
  slug,
  className,
}: {
  slug: string
  className?: string
}) {
  const t = useTranslations('favorites')
  const router = useRouter()
  const { isFavorite, signedIn } = useFavorites()
  const active = isFavorite(slug)

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-pressed={active}
      aria-label={active ? t('remove') : t('add')}
      title={active ? t('remove') : t('add')}
      className={cn('shrink-0', active && 'text-destructive', className)}
      onClick={() => {
        if (!signedIn) {
          router.push(`/login?next=/providers/${slug}`)
          return
        }
        void toggleFavorite(slug)
      }}
    >
      <Heart className={cn('size-4', active && 'fill-current')} aria-hidden />
    </Button>
  )
}
