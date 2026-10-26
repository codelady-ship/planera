'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  CalendarDays,
  Clock,
  House,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { logout, useSession } from '@/features/auth/use-session'
import { BrandMark } from '@/features/home/site-header'
import type { UserRole } from '@/lib/api/types'
import { ThemeToggle } from '@/features/theme/theme-toggle'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
}

/** Admins see every provider's bookings; services and hours are a provider's own (#38). */
export const PANEL_NAV: NavItem[] = [
  {
    href: '/panel',
    label: 'Ümumi baxış',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'PROVIDER'],
  },
  {
    href: '/panel/appointments',
    label: 'Randevular',
    icon: CalendarDays,
    roles: ['ADMIN', 'PROVIDER'],
  },
  {
    href: '/panel/services',
    label: 'Xidmətlər',
    icon: ListChecks,
    roles: ['PROVIDER'],
  },
  {
    href: '/panel/schedule',
    label: 'İş qrafiki',
    icon: Clock,
    roles: ['PROVIDER'],
  },
]

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Admin',
  PROVIDER: 'Mütəxəssis',
  CUSTOMER: 'Müştəri',
}

export function PanelShell({ children }: { children: ReactNode }) {
  const { status, user } = useSession()

  if (status === 'loading') {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!user || user.role === 'CUSTOMER') {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
        <ShieldAlert aria-hidden className="size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">
          Bu bölmə mütəxəssis və admin üçündür
        </h1>
        <p className="text-muted-foreground">
          Randevularınızı kabinetinizdən idarə edə bilərsiniz.
        </p>
        <Link
          href={user ? '/account' : '/login?next=/panel'}
          className={buttonVariants()}
        >
          {user ? 'Kabinetə keç' : 'Daxil ol'}
        </Link>
      </main>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <PanelSidebar role={user.role} name={user.fullName} />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <span className="text-sm text-muted-foreground">
              {ROLE_LABEL[user.role]} paneli
            </span>
            <ThemeToggle className="ml-auto" />
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function PanelSidebar({ role, name }: { role: UserRole; name: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpenMobile } = useSidebar()
  const items = PANEL_NAV.filter((item) => item.roles.includes(role))

  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center border-b px-4">
        <BrandMark />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    render={
                      <Link
                        href={item.href}
                        onClick={() => setOpenMobile(false)}
                      />
                    }
                  >
                    <item.icon aria-hidden />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="px-2 py-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/" />}>
              <House aria-hidden />
              <span>Sayta qayıt</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await logout()
                router.replace('/')
                router.refresh()
              }}
            >
              <LogOut aria-hidden />
              <span>Çıxış</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

/** Page heading used by every panel section. */
export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Services and hours belong to a provider; an admin gets a pointer instead. */
export function ProviderOnly({ children }: { children: ReactNode }) {
  const { user } = useSession()
  if (user?.role === 'PROVIDER') return children
  return (
    <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
      Bu bölmə mütəxəssisin öz xidmət və qrafiki üçündür.
    </p>
  )
}
