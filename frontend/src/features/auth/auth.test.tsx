import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../../vitest.setup'
import { safeNext } from '@/lib/api/client'
import { AuthForm } from './auth-form'

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.mocked(router.replace).mockClear()
    window.history.replaceState(null, '', '/login?next=/book/elvin-barber')
  })

  it('logs in and returns to the page that asked for it', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        user: { id: 2, fullName: 'Aynur Qasımova', role: 'CUSTOMER' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<AuthForm mode="login" />)

    fill('E-poçt', 'musteri@planera.az')
    fill('Şifrə', 'Planera123')
    fireEvent.click(screen.getByRole('button', { name: 'Daxil ol' }))

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/book/elvin-barber'),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'musteri@planera.az',
          password: 'Planera123',
        }),
      }),
    )
  })

  it('signs in as the read-only demo admin with one click', async () => {
    window.history.replaceState(null, '', '/login')
    const fetchMock = vi.fn(async () =>
      Response.json({
        user: { id: 3, fullName: 'Demo Admin', role: 'ADMIN', demo: true },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<AuthForm mode="login" />)

    expect(
      screen.getByText(
        'Admin paneli yalnız baxış üçün: demo@planera.az / demo1234',
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Demo admin kimi bax' }))

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/panel'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'demo@planera.az',
          password: 'demo1234',
        }),
      }),
    )
  })

  it('shows the API field errors next to the fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            status: 400,
            detail: 'Məlumatlar düzgün deyil',
            errors: { password: 'Şifrə 8-72 simvol olmalıdır' },
          },
          { status: 400 },
        ),
      ),
    )
    render(<AuthForm mode="register" />)

    fireEvent.click(screen.getByRole('button', { name: 'Hesab yarat' }))

    expect(
      await screen.findByText('Şifrə 8-72 simvol olmalıdır'),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Məlumatlar düzgün deyil',
    )
    expect(router.replace).not.toHaveBeenCalled()
  })
})

describe('safeNext', () => {
  it('keeps same-site paths and drops anything else', () => {
    expect(safeNext('/account?tab=past')).toBe('/account?tab=past')
    expect(safeNext('//evil.example')).toBeNull()
    expect(safeNext('https://evil.example')).toBeNull()
    expect(safeNext(null)).toBeNull()
  })
})
