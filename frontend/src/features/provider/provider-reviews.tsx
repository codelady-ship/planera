import { MessageSquareText, Star } from 'lucide-react'
import type { Review } from '@/lib/api/types'
import { formatDateShort } from '@/lib/dates'
import { cn } from '@/lib/utils'

/** Five stars, {@code rating} of them filled. */
export function Stars({
  rating,
  className,
}: {
  rating: number
  className?: string
}) {
  return (
    <span
      className={cn('flex items-center gap-0.5', className)}
      role="img"
      aria-label={`${rating} / 5 ulduz`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            'size-4',
            value <= rating ? 'fill-current' : 'text-muted-foreground/40',
          )}
          aria-hidden
        />
      ))}
    </span>
  )
}

/** The newest reviews on the provider page (#44). */
export function ProviderReviews({
  reviews,
  reviewCount,
}: {
  reviews: Review[]
  reviewCount: number
}) {
  if (reviews.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <MessageSquareText className="size-5 shrink-0" aria-hidden />
        Hələ rəy yoxdur. Randevudan sonra kabinetinizdən ilk rəyi siz yaza
        bilərsiniz.
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="flex flex-col gap-2 rounded-xl border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Stars rating={review.rating} />
              <span className="text-sm font-medium">{review.customerName}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDateShort(review.createdAt.slice(0, 10))}
            </span>
          </div>
          {review.comment && (
            <p className="text-sm leading-relaxed">{review.comment}</p>
          )}
        </li>
      ))}
      {reviewCount > reviews.length && (
        <li className="text-sm text-muted-foreground">
          Son {reviews.length} rəy göstərilir, cəmi {reviewCount}.
        </li>
      )}
    </ul>
  )
}
