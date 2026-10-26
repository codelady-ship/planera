import type { Metadata } from 'next'
import { AuthPage } from '@/features/auth/auth-page'

export const metadata: Metadata = { title: 'Daxil ol' }

export default function LoginPage() {
  return (
    <AuthPage
      mode="login"
      title="Daxil ol"
      hint={
        <p className="text-sm text-muted-foreground">
          Demo: musteri@planera.az, şifrə Planera123
        </p>
      }
    />
  )
}
