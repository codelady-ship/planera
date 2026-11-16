import { describe, expect, test } from 'vitest'
import robots from './robots'

describe('robots', () => {
  test('allows the site, hides private pages in every language and links the sitemap', () => {
    const r = robots()
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules
    expect(rules.allow).toBe('/')
    expect(rules.disallow).toEqual(
      expect.arrayContaining(['/api/', '/panel', '/en/account', '/ru/login']),
    )
    expect(r.sitemap).toBe('https://planera-az.vercel.app/sitemap.xml')
  })
})
