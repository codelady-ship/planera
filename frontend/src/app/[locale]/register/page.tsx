import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AuthPage } from '@/features/auth/auth-page'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/register'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('registerTitle') }
}

export default async function RegisterPage({
  params,
}: PageProps<'/[locale]/register'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'auth' })
  return <AuthPage mode="register" title={t('registerTitle')} />
}
