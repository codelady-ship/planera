import type { Metadata } from 'next'
import { routing, type Locale } from '@/i18n/routing'
import { SITE_URL } from '@/lib/site/url'

/** Shared preview image (1200x630, plain background, logo only). */
export const OG_IMAGE = {
  url: `${SITE_URL}/brand/planera-og.png`,
  width: 1200,
  height: 630,
  type: 'image/png',
}

const OG_LOCALE: Record<Locale, string> = {
  az: 'az_AZ',
  en: 'en_US',
  ru: 'ru_RU',
}

/** Absolute URL of a path in one language ('as-needed': Azerbaijani has no prefix). */
export function localizedUrl(path: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
  return `${SITE_URL}${prefix}${path}`
}

/** hreflang map for one path: every locale plus x-default (Azerbaijani). */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(
      routing.locales.map((locale) => [locale, localizedUrl(path, locale)]),
    ),
    'x-default': localizedUrl(path, routing.defaultLocale),
  }
}

/** Open Graph and Twitter fields every page inherits (no URL: it is per page). */
export function baseSocial(
  locale: Locale,
  imageAlt: string,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      type: 'website',
      siteName: 'Planera',
      locale: OG_LOCALE[locale],
      images: [{ ...OG_IMAGE, alt: imageAlt }],
    },
    twitter: { card: 'summary_large_image', images: [OG_IMAGE.url] },
  }
}

/**
 * Metadata of a public, indexable page: canonical, hreflang alternates and
 * Open Graph / Twitter cards with the same title and description.
 */
export function publicPageMetadata({
  locale,
  path,
  title,
  description,
  imageAlt,
  absoluteTitle = false,
}: {
  locale: Locale
  /** Path without the locale prefix: '' for home, '/search', ... */
  path: string
  title: string
  description: string
  imageAlt: string
  /** Home page: skip the "%s | Planera" template. */
  absoluteTitle?: boolean
}): Metadata {
  const url = localizedUrl(path, locale)
  const social = baseSocial(locale, imageAlt)
  const fullTitle = absoluteTitle ? title : `${title} | Planera`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      ...social.openGraph,
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l]),
      url,
      title: fullTitle,
      description,
    },
    twitter: { ...social.twitter, title: fullTitle, description },
  }
}

/** JSON for a <script type="application/ld+json">; "<" is escaped so the data cannot close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
