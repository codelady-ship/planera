'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useRouter } from '@/i18n/navigation'
import { safeNext } from '@/lib/api/client'
import type { Problem, SessionUser } from '@/lib/api/types'
import { setSessionUser } from './use-session'

type Mode = 'login' | 'register'

type Field = {
  name: string
  label: 'email' | 'password' | 'passwordNew' | 'fullName' | 'phone'
  type: string
  autoComplete: string
  optional?: boolean
}

const FIELDS: Record<Mode, Field[]> = {
  login: [
    { name: 'email', label: 'email', type: 'email', autoComplete: 'email' },
    {
      name: 'password',
      label: 'password',
      type: 'password',
      autoComplete: 'current-password',
    },
  ],
  register: [
    { name: 'fullName', label: 'fullName', type: 'text', autoComplete: 'name' },
    { name: 'email', label: 'email', type: 'email', autoComplete: 'email' },
    {
      name: 'phone',
      label: 'phone',
      type: 'tel',
      autoComplete: 'tel',
      optional: true,
    },
    {
      name: 'password',
      label: 'passwordNew',
      type: 'password',
      autoComplete: 'new-password',
    },
  ],
}

/**
 * Login and registration (#27). After success the user returns to the page
 * that sent them here (`?next=`), or to the account page.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations('auth')
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setErrors({})
    setMessage(null)
    const data = Object.fromEntries(new FormData(event.currentTarget))
    if (data.phone === '') delete data.phone
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const problem = body as Problem
        setErrors(problem.errors ?? {})
        setMessage(problem.detail ?? t('failed'))
        return
      }
      const user = (body as { user: SessionUser }).user
      setSessionUser(user)
      router.replace(next ?? (user.role === 'CUSTOMER' ? '/account' : '/panel'))
      router.refresh()
    } catch {
      setMessage(t('offline'))
    } finally {
      setBusy(false)
    }
  }

  const other =
    mode === 'login'
      ? { text: t('noAccount'), link: t('registerLink'), href: '/register' }
      : { text: t('haveAccount'), link: t('loginLink'), href: '/login' }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {FIELDS[mode].map((field) => (
        <div key={field.name} className="flex flex-col gap-2">
          <Label htmlFor={field.name}>
            {t(field.label)}
            {field.optional && (
              <span className="font-normal text-muted-foreground">
                {t('optional')}
              </span>
            )}
          </Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required={!field.optional}
            aria-invalid={errors[field.name] ? true : undefined}
            aria-describedby={
              errors[field.name] ? `${field.name}-error` : undefined
            }
            className="h-11"
          />
          {errors[field.name] && (
            <p id={`${field.name}-error`} className="text-sm text-destructive">
              {errors[field.name]}
            </p>
          )}
        </div>
      ))}

      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-11" disabled={busy}>
        {busy && <LoaderCircle className="animate-spin" aria-hidden />}
        {mode === 'login' ? t('login') : t('createAccount')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {other.text}{' '}
        <Link
          href={
            next ? `${other.href}?next=${encodeURIComponent(next)}` : other.href
          }
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {other.link}
        </Link>
      </p>
    </form>
  )
}
