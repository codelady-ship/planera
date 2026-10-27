import { useTranslations } from 'next-intl'
import { Bell, CalendarCheck, Mic, type LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; key: 'reminder' | 'voice' | 'diary' }[] = [
  { icon: Bell, key: 'reminder' },
  { icon: Mic, key: 'voice' },
  { icon: CalendarCheck, key: 'diary' },
]

/** Reminders, voice notes and the diary in three cards, right under the hero. */
export function LiveReminders() {
  const t = useTranslations('home.live')
  return (
    <section
      aria-labelledby="live-reminders"
      className="mx-auto max-w-6xl px-4 pb-16"
    >
      <h2 id="live-reminders" className="text-2xl font-semibold tracking-tight">
        {t('title')}
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.key}
            className="flex flex-col gap-3 rounded-xl border bg-card p-5"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-brand-teal text-brand-navy">
              <feature.icon className="size-5" aria-hidden />
            </span>
            <h3 className="font-semibold">{t(`${feature.key}Title`)}</h3>
            <p className="text-sm text-muted-foreground">
              {t(`${feature.key}Text`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
