'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleUser, LogOut } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { logout, useSession } from './use-session'

/** Header actions: login / register, or the account link and logout. */
export function UserMenu({ stacked = false }: { stacked?: boolean }) {
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
          Daxil ol
        </Link>
        <Link
          href="/register"
          className={buttonVariants({
            size: 'lg',
            className: stacked ? 'mt-2 h-10' : undefined,
          })}
        >
          Qeydiyyat
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2', stacked ? 'flex-col' : 'items-center')}>
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
        Çıxış
      </Button>
    </div>
  )
}
