import Link from 'next/link'
import { CalendarCheck, Menu } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const NAV = [
  { href: '/search', label: 'Xidmətlər' },
  { href: '/#necə-işləyir', label: 'Necə işləyir?' },
]

export function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <CalendarCheck className="size-4" aria-hidden />
      </span>
      randevu
    </Link>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <BrandMark />

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Daxil ol
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'lg' })}>
            Qeydiyyat
          </Link>
        </div>

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Menyunu aç"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Menyu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 hover:bg-muted"
              >
                Daxil ol
              </Link>
              <Link
                href="/register"
                className={buttonVariants({
                  size: 'lg',
                  className: 'mt-2 h-10',
                })}
              >
                Qeydiyyat
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
