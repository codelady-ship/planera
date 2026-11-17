import { expect, test } from 'vitest'
import { jsonLd, languageAlternates, publicPageMetadata } from './seo'
import { SITE_URL } from './url'

test('hreflang alternates cover every locale plus x-default', () => {
  expect(languageAlternates('/search')).toEqual({
    az: `${SITE_URL}/search`,
    en: `${SITE_URL}/en/search`,
    ru: `${SITE_URL}/ru/search`,
    'x-default': `${SITE_URL}/search`,
  })
})

test('a public page gets canonical, Open Graph and Twitter fields', () => {
  const meta = publicPageMetadata({
    locale: 'en',
    path: '/search',
    title: 'Find a professional',
    description: 'Search',
    imageAlt: 'Planera logo',
  })
  expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en/search`)
  expect(meta.openGraph).toMatchObject({
    url: `${SITE_URL}/en/search`,
    title: 'Find a professional | Planera',
    locale: 'en_US',
    alternateLocale: ['az_AZ', 'ru_RU'],
  })
  expect(meta.twitter).toMatchObject({ card: 'summary_large_image' })
})

test('the home page title skips the template', () => {
  const meta = publicPageMetadata({
    locale: 'az',
    path: '',
    title: 'Planera',
    description: 'd',
    imageAlt: 'a',
    absoluteTitle: true,
  })
  expect(meta.title).toEqual({ absolute: 'Planera' })
  expect(meta.alternates?.canonical).toBe(SITE_URL)
})

test('JSON-LD cannot close its script tag', () => {
  expect(jsonLd({ name: '</script>' })).not.toContain('</script>')
})
