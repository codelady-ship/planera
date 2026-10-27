import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import type { AppointmentStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

/** Status colors come from the design tokens (docs/DESIGN.md). */
const STATUS_CLASS: Record<AppointmentStatus, string> = {
  PENDING: 'bg-secondary text-secondary-foreground',
  CONFIRMED: 'bg-success text-success-foreground',
  COMPLETED: 'bg-primary text-primary-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive',
  NO_SHOW: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const t = useTranslations('status')
  return (
    <Badge className={cn('h-6 px-2.5', STATUS_CLASS[status])}>
      {t(status)}
    </Badge>
  )
}
