'use client'

import { useTranslations } from 'next-intl'
import { CircleUser, LayoutDashboard, LogOut } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { logout, useSession } from './use-session'

/** Header actions: login / register, or the account link and logout. */
export function UserMenu({ stacked = false }: { stacked?: boolean }) {
  const t = useTranslations('header')
  const { status, user } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return <Skeleton className={cn('h-10', stacked ? 'w-full' : 'w-40')} />
  }

  const link = stacked
    ? 'rounded-lg px-3 py-2 hover:bg-muted'
    : buttonVariants({ variant: 'ghost', size: 'lg' })

  if (!user) {
    return (
      <div className={cn('flex gap-2', stacked ? 'flex-col' : 'items-center')}>
        <Link href="/login" className={link}>
          {t('login')}
        </Link>
        <Link
          href="/register"
          className={buttonVariants({
            size: 'lg',
            className: stacked ? 'mt-2 h-10' : undefined,
          })}
        >
          {t('register')}
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2', stacked ? 'flex-col' : 'items-center')}>
      {user.role !== 'CUSTOMER' && (
        <Link href="/panel" className={cn(link, 'gap-2')}>
          <LayoutDashboard aria-hidden className="size-4" />
          {t('panel')}
        </Link>
      )}
      <Link href="/account" className={cn(link, 'gap-2')}>
        <CircleUser aria-hidden className="size-4" />
        {user.fullName.split(' ')[0]}
      </Link>
      <Button
        variant="outline"
        size="lg"
        onClick={async () => {
          await logout()
          router.replace('/')
          router.refresh()
        }}
      >
        <LogOut aria-hidden />
        {t('logout')}
      </Button>
    </div>
  )
}
