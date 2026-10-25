import type { Metadata } from 'next'
import { AuthPage } from '@/features/auth/auth-page'

export const metadata: Metadata = { title: 'Qeydiyyat' }

export default function RegisterPage() {
  return <AuthPage mode="register" title="Hesab yaradın" />
}
