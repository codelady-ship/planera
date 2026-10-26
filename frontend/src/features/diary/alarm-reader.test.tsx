import { render } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { router } from '../../../vitest.setup'
import { AlarmReader } from './alarm-reader'

const speech = vi.hoisted(() => ({ speak: vi.fn() }))
vi.mock('./speech', () => speech)

describe('AlarmReader', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
    vi.clearAllMocks()
  })

  test('reads the sentence from the notification tap and cleans the URL', () => {
    const sentence = 'Sizin bu gün saat 15:00-da qeydiniz var: həkimə getmək'
    window.history.replaceState({}, '', `/?say=${encodeURIComponent(sentence)}`)
    render(<AlarmReader />)

    expect(speech.speak).toHaveBeenCalledWith(sentence)
    expect(router.replace).toHaveBeenCalledWith('/')
  })

  test('stays quiet without the parameter', () => {
    render(<AlarmReader />)
    expect(speech.speak).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
