import { Badge } from '@/components/ui/badge'
import type { AppointmentStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

/** Status colors come from the design tokens (docs/DESIGN.md). */
const STATUS: Record<AppointmentStatus, { label: string; className: string }> =
  {
    PENDING: {
      label: 'Gözləyir',
      className: 'bg-secondary text-secondary-foreground',
    },
    CONFIRMED: {
      label: 'Təsdiqlənib',
      className: 'bg-success text-success-foreground',
    },
    COMPLETED: {
      label: 'Tamamlanıb',
      className: 'bg-primary text-primary-foreground',
    },
    CANCELLED: {
      label: 'Ləğv edilib',
      className: 'bg-destructive/10 text-destructive',
    },
    NO_SHOW: {
      label: 'Gəlmədi',
      className: 'bg-muted text-muted-foreground',
    },
  }

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = STATUS[status]
  return <Badge className={cn('h-6 px-2.5', className)}>{label}</Badge>
}
