import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AuthPage } from '@/features/auth/auth-page'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('loginTitle') }
}

export default async function LoginPage({
  params,
}: PageProps<'/[locale]/login'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'auth' })
  return (
    <AuthPage
      mode="login"
      title={t('loginTitle')}
      hint={
        <p className="text-sm text-muted-foreground">
          {t('demoHint', {
            email: 'musteri@planera.az',
            password: 'Planera123',
          })}
        </p>
      }
    />
  )
}
