'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { AppointmentCard } from './appointment-card'

const SCOPES = [
  {
    value: 'upcoming',
    label: 'Qarşıdakı',
    empty: 'Qarşıdakı randevunuz yoxdur.',
  },
  { value: 'past', label: 'Keçmiş', empty: 'Keçmiş randevu yoxdur.' },
  {
    value: 'cancelled',
    label: 'Ləğv edilmiş',
    empty: 'Ləğv edilmiş randevu yoxdur.',
  },
] as const

/** Personal account (#32): appointments by scope and profile details. */
export function AccountView() {
  const [tab, setTab] = useState<string>('upcoming')
  const { user } = useSession()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Kabinetim</h1>
        {user && <p className="text-muted-foreground">{user.fullName}</p>}
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          {SCOPES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="profile">Profil</TabsTrigger>
        </TabsList>
        {SCOPES.map((s) => (
          <TabsContent key={s.value} value={s.value} className="pt-4">
            {tab === s.value && (
              <AppointmentList scope={s.value} empty={s.empty} />
            )}
          </TabsContent>
        ))}
        <TabsContent value="profile" className="pt-4">
          {user ? <ProfileForm user={user} /> : <Skeleton className="h-48" />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AppointmentList({ scope, empty }: { scope: string; empty: string }) {
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
        setError(e instanceof Error ? e.message : 'Yükləmək olmadı')
        setItems([])
      })
  }, [scope, router])

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
            Mütəxəssis tap
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
      setMessage('Yadda saxlanıldı')
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.problem.errors ?? {})
      setMessage(e instanceof Error ? e.message : 'Yadda saxlamaq olmadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-poçt</Label>
        <Input id="email" value={user.email} disabled className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Ad və soyad</Label>
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
        <Label htmlFor="phone">Telefon</Label>
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
        Yadda saxla
      </Button>
    </form>
  )
}
