'use client'

import { useState, useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/routing'
import { dateNames } from '@/lib/dates'
import {
  getVoiceGender,
  isSpeechSupported,
  noteAlarmText,
  setVoiceGender,
  speak,
  type VoiceGender,
} from './speech'
import { cn } from '@/lib/utils'

const OPTIONS: VoiceGender[] = ['female', 'male']

/** Which voice reads the alarm (#62): female by default, male if chosen. */
export function VoiceSettings() {
  const t = useTranslations('voice')
  const locale = useLocale() as Locale
  const supported = useSyncExternalStore(
    () => () => {},
    isSpeechSupported,
    () => false,
  )
  const [gender, setGender] = useState<VoiceGender>(() =>
    typeof window === 'undefined' ? 'female' : getVoiceGender(),
  )

  function choose(next: VoiceGender) {
    setVoiceGender(next)
    setGender(next)
  }

  const sample = noteAlarmText(
    dateNames(locale).today,
    '15:00',
    t('sampleTitle'),
    locale,
  )

  return (
    <section
      aria-labelledby="voice-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Volume2 className="size-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 id="voice-title" className="font-medium">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('text', { sample })}
          </p>
        </div>
      </div>
      {supported ? (
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label={t('voice')} className="flex gap-2">
            {OPTIONS.map((option) => (
              <Button
                key={option}
                role="radio"
                aria-checked={gender === option}
                variant={gender === option ? 'default' : 'outline'}
                className={cn(gender === option && 'bg-primary')}
                onClick={() => choose(option)}
              >
                {t(option)}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => speak(sample, gender, locale)}
          >
            <Volume2 aria-hidden />
            {t('test')}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('unsupported')}</p>
      )}
    </section>
  )
}
