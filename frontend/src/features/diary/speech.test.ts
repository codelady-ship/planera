import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  getVoiceGender,
  noteAlarmText,
  pickVoice,
  setVoiceGender,
  speak,
} from './speech'

function voice(name: string, lang: string) {
  return { name, lang } as SpeechSynthesisVoice
}

describe('speech', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('the voice gender is remembered and defaults to female', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    })
    expect(getVoiceGender()).toBe('female')
    setVoiceGender('male')
    expect(getVoiceGender()).toBe('male')
  })

  test('prefers an Azerbaijani voice of the chosen gender, then Turkish', () => {
    const voices = [
      voice('Microsoft David', 'en-US'),
      voice('Google Türkçe Female', 'tr-TR'),
      voice('Azerbaijani Male', 'az-AZ'),
      voice('Azerbaijani Female', 'az-AZ'),
    ]
    expect(pickVoice('female', voices)?.name).toBe('Azerbaijani Female')
    expect(pickVoice('male', voices)?.name).toBe('Azerbaijani Male')
    expect(pickVoice('female', voices.slice(0, 2))?.name).toBe(
      'Google Türkçe Female',
    )
    expect(pickVoice('male', [])).toBeNull()
  })

  test('speaking is a no-op without speech synthesis', () => {
    expect(speak('Salam')).toBe(false)
    expect(noteAlarmText('bu gün', '15:00', 'həkimə getmək')).toBe(
      'Sizin bu gün saat 15:00-da qeydiniz var: həkimə getmək',
    )
  })
})
