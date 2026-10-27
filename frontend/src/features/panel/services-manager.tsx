'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Clock, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, api } from '@/lib/api/client'
import type { ServiceView } from '@/lib/api/types'
import { formatDuration, formatPrice } from '@/lib/dates'
import { PanelHeading } from './panel-shell'
import { useApi } from './use-api'

export interface ServiceForm {
  name: string
  description: string
  price: string
  durationMinutes: string
}

/** Message keys (namespace "services") for the form rules. */
export type ServiceError =
  | 'nameRequired'
  | 'nameMax'
  | 'descriptionMax'
  | 'priceMin'
  | 'priceDecimals'
  | 'durationMin'
  | 'durationMax'

/** The same limits as ProviderDtos.ServiceRequest on the API (#40). */
export function validateService(
  form: ServiceForm,
): Partial<Record<keyof ServiceForm, ServiceError>> {
  const errors: Partial<Record<keyof ServiceForm, ServiceError>> = {}
  const name = form.name.trim()
  if (!name) errors.name = 'nameRequired'
  else if (name.length > 120) errors.name = 'nameMax'
  if (form.description.length > 500) errors.description = 'descriptionMax'
  const price = Number(form.price)
  if (form.price.trim() === '' || Number.isNaN(price) || price < 0) {
    errors.price = 'priceMin'
  } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(form.price.trim())) {
    errors.price = 'priceDecimals'
  }
  const duration = Number(form.durationMinutes)
  if (!Number.isInteger(duration) || duration < 5) {
    errors.durationMinutes = 'durationMin'
  } else if (duration > 600) {
    errors.durationMinutes = 'durationMax'
  }
  return errors
}

const EMPTY: ServiceForm = {
  name: '',
  description: '',
  price: '',
  durationMinutes: '30',
}

export function ServicesManager() {
  const t = useTranslations('services')
  const tc = useTranslations('common')
  const locale = useLocale()
  const { data, error, reload } = useApi<ServiceView[]>('/provider/services')
  const [editing, setEditing] = useState<ServiceView | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ServiceView | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function remove(service: ServiceView) {
    setDeleteError(null)
    try {
      await api(`/provider/services/${service.id}`, { method: 'DELETE' })
      reload()
    } catch (e) {
      setDeleteError((e as Error).message)
    }
  }

  return (
    <>
      <PanelHeading
        title={t('title')}
        description={t('description')}
        action={
          <Button size="lg" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('new')}
          </Button>
        }
      />
      {deleteError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {deleteError}
        </p>
      )}
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : !data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((service) => (
            <li
              key={service.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-3 text-sm">
                  <span className="font-semibold">
                    {formatPrice(service.price)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock aria-hidden className="size-3.5" />
                    {formatDuration(service.durationMinutes, locale)}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon-lg"
                  aria-label={t('edit', { name: service.name })}
                  onClick={() => setEditing(service)}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-lg"
                  aria-label={t('remove', { name: service.name })}
                  onClick={() => setDeleting(service)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ServiceDialog
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && t('deleteText', { name: deleting.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('dismiss')}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) void remove(deleting)
                setDeleting(null)
              }}
            >
              {t('delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ServiceDialog({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceView | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('services')
  const [form, setForm] = useState<ServiceForm>(
    service
      ? {
          name: service.name,
          description: service.description ?? '',
          price: String(service.price),
          durationMinutes: String(service.durationMinutes),
        }
      : EMPTY,
  )
  // Local rules give a message key; the API answers with a ready sentence.
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const field = (key: keyof ServiceForm) => ({
    id: `s-${key}`,
    value: form[key],
    'aria-invalid': errors[key] ? true : undefined,
    onChange: (e: { target: { value: string } }) =>
      setForm({ ...form, [key]: e.target.value }),
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateService(form)
    setErrors(
      Object.fromEntries(
        Object.entries(found).map(([key, code]) => [key, t(code)]),
      ),
    )
    setFormError(null)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await api(
        service ? `/provider/services/${service.id}` : '/provider/services',
        {
          method: service ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: Number(form.price),
            durationMinutes: Number(form.durationMinutes),
          }),
        },
      )
      onClose()
      onSaved()
    } catch (e) {
      if (e instanceof ApiError && e.problem.errors) {
        setErrors(e.problem.errors)
      }
      setFormError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? t('editTitle') : t('new')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label={t('name')} id="s-name" error={errors.name}>
            <Input {...field('name')} maxLength={120} autoFocus />
          </Field>
          <Field
            label={t('descriptionLabel')}
            id="s-description"
            error={errors.description}
          >
            <Input {...field('description')} maxLength={500} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('price')} id="s-price" error={errors.price}>
              <Input {...field('price')} inputMode="decimal" placeholder="20" />
            </Field>
            <Field
              label={t('duration')}
              id="s-durationMinutes"
              error={errors.durationMinutes}
            >
              <Input
                {...field('durationMinutes')}
                type="number"
                inputMode="numeric"
                min={5}
                max={600}
                step={5}
              />
            </Field>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" size="lg" className="h-11" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" aria-hidden />}
            {t('save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Field({
  label,
  id,
  error,
  children,
}: {
  label: string
  id: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
