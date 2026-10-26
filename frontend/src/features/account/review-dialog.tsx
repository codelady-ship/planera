'use client'

import { useState } from 'react'
import { LoaderCircle, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api } from '@/lib/api/client'
import type { Appointment, Review } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const STARS = [1, 2, 3, 4, 5] as const
const STAR_LABELS = ['Çox pis', 'Pis', 'Normal', 'Yaxşı', 'Əla'] as const

/** Rating 1-5 and an optional comment for a completed appointment (#44). */
export function ReviewDialog({
  appointment,
  onClose,
  onDone,
}: {
  appointment: Appointment
  onClose: () => void
  onDone: () => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (rating === 0) return
    setBusy(true)
    setError(null)
    try {
      await api<Review>(`/appointments/${appointment.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      })
      onClose()
      onDone()
    } catch (e) {
      setError(
        e instanceof ApiError
          ? (e.problem.errors?.rating ?? e.message)
          : e instanceof Error
            ? e.message
            : 'Rəyi göndərmək olmadı',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rəy yazın</DialogTitle>
          <DialogDescription>
            {appointment.providerName}, {appointment.serviceName}. Rəy
            mütəxəssisin səhifəsində adınızın qısa forması ilə görünür.
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label="Reytinq"
          className="flex items-center gap-1"
        >
          {STARS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ulduz: ${STAR_LABELS[value - 1]}`}
              onClick={() => setRating(value)}
              className={cn(
                'rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                value <= rating && 'text-foreground',
              )}
            >
              <Star
                className={cn('size-8', value <= rating && 'fill-current')}
                aria-hidden
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 ? STAR_LABELS[rating - 1] : 'Ulduz seçin'}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="review-comment">Şərh (istəyə bağlı)</Label>
          <Textarea
            id="review-comment"
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Təəssüratınızı yazın"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="h-11"
          disabled={rating === 0 || busy}
          onClick={submit}
        >
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          Rəyi göndər
        </Button>
      </DialogContent>
    </Dialog>
  )
}
