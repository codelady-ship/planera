import { describe, expect, test } from 'vitest'
import manifest from './manifest'

describe('manifest', () => {
  test('is installable: name, standalone display and maskable icons', () => {
    const m = manifest()
    expect(m.name).toBe('Randevum')
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.lang).toBe('az')
    const sizes = m.icons?.map((i) => `${i.sizes}:${i.purpose ?? 'any'}`)
    expect(sizes).toEqual(
      expect.arrayContaining([
        '192x192:any',
        '512x512:any',
        '512x512:maskable',
      ]),
    )
  })
})
