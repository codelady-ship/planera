// Voice in the browser (#61, #62): speech-to-text for dictating a note and
// text-to-speech for the alarm. Both are optional: without them the diary
// still works with text and notifications.

export type VoiceGender = 'female' | 'male'

const GENDER_KEY = 'rv_voice_gender'

export function getVoiceGender(): VoiceGender {
  try {
    return window.localStorage.getItem(GENDER_KEY) === 'male'
      ? 'male'
      : 'female'
  } catch {
    return 'female'
  }
}

export function setVoiceGender(gender: VoiceGender) {
  try {
    window.localStorage.setItem(GENDER_KEY, gender)
  } catch {
    // Private mode: the default voice is used.
  }
}

export function isSpeechSupported() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

const MALE = /male|man\b|kişi|david|george|daniel|james|mark|tom|arthur|ryan/i
const FEMALE = /female|woman|qadın|zira|hazel|samantha|susan|emma|aria|jenny/i

/**
 * The best voice for the gender: an Azerbaijani voice first, Turkish as the
 * closest fallback, otherwise whatever the device has. Gender is matched by
 * the voice name, which is all browsers expose.
 */
export function pickVoice(
  gender: VoiceGender,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const byLang = (prefix: string) =>
    voices.filter((v) => v.lang.toLowerCase().startsWith(prefix))
  const pool = [byLang('az'), byLang('tr'), voices].find((p) => p.length > 0)
  if (!pool) return null
  // "Female" contains "male", so the female check comes first.
  const genderOf = (v: SpeechSynthesisVoice) =>
    FEMALE.test(v.name) ? 'female' : MALE.test(v.name) ? 'male' : null
  return (
    pool.find((v) => genderOf(v) === gender) ??
    pool.find((v) => genderOf(v) === null) ??
    pool[0]
  )
}

/** Reads the alarm sentence aloud; false when the browser cannot speak. */
export function speak(text: string, gender: VoiceGender = getVoiceGender()) {
  if (!isSpeechSupported()) return false
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'az-AZ'
  const voice = pickVoice(gender, window.speechSynthesis.getVoices())
  if (voice) utterance.voice = voice
  // Even a voice without a gendered name sounds different per setting.
  utterance.pitch = gender === 'male' ? 0.8 : 1.1
  utterance.rate = 0.95
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}

/** "Sizin bu gün saat 15:00-da qeydiniz var: həkimə getmək" (#62). */
export function noteAlarmText(when: string, time: string, title: string) {
  return `Sizin ${when} saat ${time}-da qeydiniz var: ${title}`
}

// Speech recognition is still prefixed in Chromium and absent from lib.dom.
export interface RecognitionResultEvent {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

export interface Recognizer {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: RecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognizerConstructor = new () => Recognizer

function recognizerConstructor(): RecognizerConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognizerConstructor
    webkitSpeechRecognition?: RecognizerConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isRecognitionSupported() {
  return recognizerConstructor() !== null
}

/** A recognizer for Azerbaijani; null when the browser has none. */
export function createRecognizer(): Recognizer | null {
  const Ctor = recognizerConstructor()
  if (!Ctor) return null
  const recognizer = new Ctor()
  recognizer.lang = 'az-AZ'
  recognizer.interimResults = true
  recognizer.continuous = false
  return recognizer
}
