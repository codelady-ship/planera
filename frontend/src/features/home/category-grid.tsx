import Link from 'next/link'
import {
  Dumbbell,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  Scissors,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORIES, type CategorySlug } from './mock-data'

const ICONS: Record<CategorySlug, LucideIcon> = {
  gozellik: Scissors,
  saglamliq: Stethoscope,
  tehsil: GraduationCap,
  konsultasiya: MessagesSquare,
  idman: Dumbbell,
  diger: LayoutGrid,
}

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-semibold tracking-tight">
        Populyar kateqoriyalar
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((category) => {
          const Icon = ICONS[category.slug]
          return (
            <li key={category.slug}>
              <Link
                href={`/search?category=${category.slug}`}
                className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30"
              >
                <Icon className="size-5" aria-hidden />
                <span className="font-medium">{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  {category.description}
                </span>
                <span className="mt-auto text-xs text-muted-foreground">
                  {category.providerCount} mütəxəssis
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
