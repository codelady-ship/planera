'use client'

import { useState, useSyncExternalStore } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getVoiceGender,
  isSpeechSupported,
  noteAlarmText,
  setVoiceGender,
  speak,
  type VoiceGender,
} from './speech'
import { cn } from '@/lib/utils'

const OPTIONS: { value: VoiceGender; label: string }[] = [
  { value: 'female', label: 'Qadın' },
  { value: 'male', label: 'Kişi' },
]

/** Which voice reads the alarm (#62): female by default, male if chosen. */
export function VoiceSettings() {
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
            Alarm səsi
          </h2>
          <p className="text-sm text-muted-foreground">
            Qeydin vaxtı çatanda xatırlatma bu səslə oxunur: &quot;Sizin bu gün
            saat 15:00-da qeydiniz var: həkimə getmək&quot;.
          </p>
        </div>
      </div>
      {supported ? (
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Səs" className="flex gap-2">
            {OPTIONS.map((option) => (
              <Button
                key={option.value}
                role="radio"
                aria-checked={gender === option.value}
                variant={gender === option.value ? 'default' : 'outline'}
                className={cn(gender === option.value && 'bg-primary')}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() =>
              speak(noteAlarmText('bu gün', '15:00', 'həkimə getmək'), gender)
            }
          >
            <Volume2 aria-hidden />
            Səsi yoxla
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Bu brauzer mətni səsləndirmir; xatırlatma yalnız bildiriş kimi gəlir.
        </p>
      )}
    </section>
  )
}
