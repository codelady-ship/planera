import Link from 'next/link'
import { BrandMark } from './site-header'

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <BrandMark />
        <nav className="flex flex-wrap gap-4">
          <Link href="/search" className="hover:text-foreground">
            Xidmətlər
          </Link>
          <Link
            href="/register?role=provider"
            className="hover:text-foreground"
          >
            Mütəxəssis kimi qoşul
          </Link>
          <a
            href="https://github.com/codelady-ship/randevu"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
        <p>Bütün qiymətlər AZN, vaxt Bakı vaxtı ilədir.</p>
      </div>
    </footer>
  )
}
