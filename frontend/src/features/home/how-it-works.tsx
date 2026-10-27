import { useTranslations } from 'next-intl'
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  Clock,
  Search,
  type LucideIcon,
} from 'lucide-react'

const STEPS: { icon: LucideIcon; key: 'find' | 'slot' | 'confirm' }[] = [
  { icon: Search, key: 'find' },
  { icon: Clock, key: 'slot' },
  { icon: CalendarCheck, key: 'confirm' },
]

export function HowItWorks() {
  const t = useTranslations('home.how')
  return (
    <section
      id="necə-işləyir"
      className="scroll-mt-16 bg-primary text-primary-foreground"
    >
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
        <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.key} className="flex flex-col gap-3">
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-teal text-brand-navy">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm text-primary-foreground/60">
                  {t('step', { n: i + 1 })}
                </span>
                {i < STEPS.length - 1 && (
                  <ArrowRight
                    aria-hidden
                    className="ml-auto hidden size-6 text-brand-teal md:block"
                  />
                )}
              </span>
              <h3 className="text-lg font-medium">{t(`${step.key}Title`)}</h3>
              <p className="text-primary-foreground/70">
                {t(`${step.key}Text`)}
              </p>
              {i < STEPS.length - 1 && (
                <ArrowDown
                  aria-hidden
                  className="ml-2 size-6 text-brand-teal md:hidden"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
