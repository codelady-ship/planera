import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'

const CONTACT = 'info@planera.az'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: t('title'), description: t('intro') }
}

/** Required by the app stores (#67); the footer links here from every page. */
export default async function PrivacyPage({
  params,
}: PageProps<'/[locale]/privacy'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <PrivacyText />
      </main>
      <SiteFooter />
    </>
  )
}

const SECTIONS = [
  {
    title: 'collectTitle',
    items: ['collect1', 'collect2', 'collect3', 'collect4', 'collect5'],
  },
  { title: 'useTitle', items: ['use1', 'use2', 'use3'] },
  { title: 'storageTitle', items: ['storage1', 'storage2'] },
  { title: 'permissionsTitle', items: ['perm1', 'perm2', 'perm3'] },
  { title: 'deleteTitle', items: ['delete1', 'delete2'] },
] as const

function PrivacyText() {
  const t = useTranslations('privacy')
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('updated')}</p>
      </div>
      <p className="leading-relaxed">{t('intro')}</p>
      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t(section.title)}</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
            {section.items.map((item) => (
              <li key={item}>{t(item, { email: CONTACT })}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t('contactTitle')}</h2>
        <p className="leading-relaxed">{t('contact', { email: CONTACT })}</p>
      </section>
    </article>
  )
}
