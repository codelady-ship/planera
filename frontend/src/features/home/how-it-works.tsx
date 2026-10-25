import { CalendarCheck, Clock, Search, type LucideIcon } from 'lucide-react'

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Search,
    title: 'Xidməti tapın',
    text: 'Kateqoriya, şəhər, qiymət və reytinqə görə mütəxəssis seçin.',
  },
  {
    icon: Clock,
    title: 'Boş saatı seçin',
    text: 'Yalnız həqiqətən boş olan saatlar göstərilir, xidmətin müddəti nəzərə alınır.',
  },
  {
    icon: CalendarCheck,
    title: 'Təsdiqləyin',
    text: 'Randevu nömrəsini alın, kabinetdən vaxtı dəyişin və ya ləğv edin.',
  },
]

export function HowItWorks() {
  return (
    <section
      id="necə-işləyir"
      className="scroll-mt-16 bg-primary text-primary-foreground"
    >
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Necə işləyir?</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-cta text-cta-foreground">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm text-primary-foreground/60">
                  Addım {i + 1}
                </span>
              </span>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="text-primary-foreground/70">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
