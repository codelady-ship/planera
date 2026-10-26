import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { UserMenu } from '@/features/auth/user-menu'
import { ThemeChoice, ThemeToggle } from '@/features/theme/theme-toggle'

const NAV = [
  { href: '/search', label: 'Xidmətlər' },
  { href: '/#necə-işləyir', label: 'Necə işləyir?' },
]

export function BrandMark() {
  return (
    <Link
      href="/"
      className="flex items-center"
      aria-label="Planera ana səhifə"
    >
      <Image
        src="/brand/planera-wordmark.png"
        alt="Planera"
        width={1408}
        height={293}
        priority
        className="h-8 w-auto md:h-9"
      />
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

        <div className="hidden items-center gap-1 md:flex">
          <ThemeToggle />
          <UserMenu />
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
              <UserMenu stacked />
              <ThemeChoice className="mt-2" />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
