import { Bell, CalendarCheck, Mic, type LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Bell,
    title: 'Canlı xatırlatma',
    text: 'Randevudan 1 gün, 1 saat və 15 dəqiqə əvvəl telefonunuza bildiriş gəlir; tətbiqdə alarm səslə oxuyur.',
  },
  {
    icon: Mic,
    title: 'Səslə qeyd',
    text: 'Təqvimdən tarix və saat seçin, qeydi deyin: danışıq mətnə çevrilir, vaxtı siz seçirsiniz.',
  },
  {
    icon: CalendarCheck,
    title: 'Vahid gündəlik',
    text: 'Randevular və şəxsi qeydlər bir siyahıda, redaktə və silmə ilə.',
  },
]

/** Reminders, voice notes and the diary in three cards, right under the hero. */
export function LiveReminders() {
  return (
    <section
      aria-labelledby="live-reminders"
      className="mx-auto max-w-6xl px-4 pb-16"
    >
      <h2 id="live-reminders" className="text-2xl font-semibold tracking-tight">
        Canlı bildiriş, heç nəyi unutmayın
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex flex-col gap-3 rounded-xl border bg-card p-5"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-brand-teal text-brand-navy">
              <feature.icon className="size-5" aria-hidden />
            </span>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
