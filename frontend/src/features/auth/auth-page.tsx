import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { AuthForm } from './auth-form'

export function AuthPage({
  mode,
  title,
  hint,
}: {
  mode: 'login' | 'register'
  title: string
  hint?: React.ReactNode
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-start justify-center px-4 py-10 md:py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
            {hint}
          </CardHeader>
          <CardContent>
            {/* The form reads ?next= from the URL, which is request data. */}
            <Suspense fallback={<Skeleton className="h-72 w-full" />}>
              <AuthForm mode={mode} />
            </Suspense>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  )
}
