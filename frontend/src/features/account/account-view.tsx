'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CalendarX, LoaderCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { setSessionUser, useSession } from '@/features/auth/use-session'
import { ApiError, api } from '@/lib/api/client'
import type { Appointment, SessionUser } from '@/lib/api/types'
import { AgendaView } from '@/features/diary/agenda-view'
import { FavoritesList } from '@/features/favorites/favorites-list'
import { WaitlistList } from '@/features/waitlist/waitlist-list'
import { AppointmentCard } from './appointment-card'
import { NotificationSettings } from './notification-settings'

const SCOPES = [
  { value: 'upcoming', empty: 'emptyUpcoming' },
  { value: 'past', empty: 'emptyPast' },
  { value: 'cancelled', empty: 'emptyCancelled' },
] as const

/** Personal account (#32): appointments by scope and profile details. */
export function AccountView() {
  const t = useTranslations('account')
  const tf = useTranslations('favorites')
  // ?tab=agenda&new=1&text=... comes from a deep link or shortcut (#66).
  const params = useSearchParams()
  const [tab, setTab] = useState<string>(() =>
    params.get('tab') === 'agenda' || params.get('tab') === 'favorites'
      ? (params.get('tab') as string)
      : 'upcoming',
  )
  const openNew = params.get('new') === '1'
  const initialText = params.get('text') ?? undefined
  const { user } = useSession()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {user && <p className="text-muted-foreground">{user.fullName}</p>}
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList className="w-full overflow-x-auto overflow-y-hidden sm:w-auto">
          <TabsTrigger value="agenda">{t('agenda')}</TabsTrigger>
          {SCOPES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {t(s.value)}
            </TabsTrigger>
          ))}
          <TabsTrigger value="favorites">{tf('tab')}</TabsTrigger>
          <TabsTrigger value="profile">{t('profile')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('notifications')}</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda" className="pt-4">
          {tab === 'agenda' && (
            <AgendaView openNew={openNew} initialText={initialText} />
          )}
        </TabsContent>
        {SCOPES.map((s) => (
          <TabsContent key={s.value} value={s.value} className="pt-4">
            {tab === s.value && (
              <div className="flex flex-col gap-4">
                <AppointmentList scope={s.value} empty={t(s.empty)} />
                {s.value === 'upcoming' && <WaitlistList />}
              </div>
            )}
          </TabsContent>
        ))}
        <TabsContent value="favorites" className="pt-4">
          {tab === 'favorites' && <FavoritesList />}
        </TabsContent>
        <TabsContent value="profile" className="pt-4">
          {user ? <ProfileForm user={user} /> : <Skeleton className="h-48" />}
        </TabsContent>
        <TabsContent value="notifications" className="pt-4">
          {tab === 'notifications' && <NotificationSettings />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AppointmentList({ scope, empty }: { scope: string; empty: string }) {
  const t = useTranslations('account')
  const router = useRouter()
  const [items, setItems] = useState<Appointment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api<Appointment[]>(`/me/appointments?scope=${scope}`)
      .then((list) => {
        setItems(list)
        setError(null)
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.problem.status === 401) {
          router.replace('/login?next=/account')
          return
        }
        setError(e instanceof Error ? e.message : t('loadFailed'))
        setItems([])
      })
  }, [scope, router, t])

  useEffect(load, [load])

  if (items === null) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
        <CalendarX className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">{empty}</p>
        {scope === 'upcoming' && (
          <Link href="/search" className={buttonVariants()}>
            {t('findProvider')}
          </Link>
        )}
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((a) => (
        <li key={a.id}>
          <AppointmentCard appointment={a} onChange={load} />
        </li>
      ))}
    </ul>
  )
}

function ProfileForm({ user }: { user: SessionUser }) {
  const t = useTranslations('account')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setErrors({})
    const data = new FormData(event.currentTarget)
    const phone = String(data.get('phone') ?? '').trim()
    try {
      const updated = await api<SessionUser>('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: String(data.get('fullName') ?? '').trim(),
          phone: phone || null,
        }),
      })
      setSessionUser(updated)
      setMessage(t('saved'))
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.problem.errors ?? {})
      setMessage(e instanceof Error ? e.message : t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" value={user.email} disabled className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">{t('fullName')}</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={user.fullName}
          required
          className="h-11"
          aria-invalid={errors.fullName ? true : undefined}
        />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t('phone')}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ''}
          className="h-11"
          aria-invalid={errors.phone ? true : undefined}
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11" disabled={busy}>
        {busy && <LoaderCircle className="animate-spin" aria-hidden />}
        {t('save')}
      </Button>
    </form>
  )
}
