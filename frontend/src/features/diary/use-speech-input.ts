'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import {
  createRecognizer,
  isRecognitionSupported,
  type Recognizer,
} from './speech'

/**
 * Dictation for the note field (#61). The microphone is only touched from
 * start(), so the permission prompt appears on the button press, never on
 * page load. Speech becomes text only; nothing is interpreted.
 */
export function useSpeechInput(onText: (text: string, final: boolean) => void) {
  const t = useTranslations('diary')
  const locale = useLocale() as Locale
  const supported = useSyncExternalStore(
    () => () => {},
    isRecognitionSupported,
    () => false,
  )
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognizer = useRef<Recognizer | null>(null)
  const handler = useRef(onText)

  useEffect(() => {
    handler.current = onText
  })

  useEffect(() => () => recognizer.current?.abort(), [])

  function start() {
    const r = createRecognizer(locale)
    if (!r) return
    recognizer.current = r
    r.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) final += result[0].transcript
        else interim += result[0].transcript
      }
      if (final) handler.current(final.trim(), true)
      else if (interim) handler.current(interim.trim(), false)
    }
    r.onend = () => setListening(false)
    r.onerror = (event) => {
      setError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? t('micDenied')
          : event.error === 'no-speech'
            ? t('noSpeech')
            : t('notRecognized'),
      )
      setListening(false)
    }
    setError(null)
    setListening(true)
    r.start()
  }

  function stop() {
    recognizer.current?.stop()
  }

  return { supported, listening, error, start, stop }
}
