import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { setSessionUser } from '@/features/auth/use-session'
import type { PanelAppointment, SessionUser } from '@/lib/api/types'
import { addDays, todayInBaku, weekStart } from '@/lib/dates'
import { AppointmentsBoard } from './appointments-board'
import { PanelShell } from './panel-shell'
import { validateWeek } from './schedule-editor'
import { validateService } from './services-manager'

const user = (role: SessionUser['role']): SessionUser => ({
  id: 1,
  email: 'elvin-barber@randevum.az',
  fullName: 'Elvin Məmmədov',
  phone: null,
  role,
  providerSlug: role === 'PROVIDER' ? 'elvin-barber' : null,
})

const today = todayInBaku()

const ITEM: PanelAppointment = {
  appointment: {
    id: 7,
    code: 'RV-2026-000007',
    providerSlug: 'elvin-barber',
    providerName: 'Elvin Məmmədov',
    serviceId: 1,
    serviceName: 'Saç kəsimi',
    date: today,
    time: '10:00',
    durationMinutes: 30,
    startsAt: '',
    endsAt: '',
    status: 'CONFIRMED',
    price: 15,
    note: null,
    cancellable: true,
  },
  customerName: 'Aynur Qasımova',
  customerPhone: '+994501112233',
}

beforeAll(() => {
  // The sidebar asks for the viewport width; jsdom has no matchMedia.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

afterEach(() => setSessionUser(null))

describe('dates', () => {
  it('finds the Monday of a week', () => {
    expect(weekStart('2026-10-28')).toBe('2026-10-26')
    expect(weekStart('2026-11-01')).toBe('2026-10-26')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })
})

describe('form rules match the API', () => {
  it('checks a service like ServiceRequest', () => {
    const ok = {
      name: 'Saç kəsimi',
      description: '',
      price: '15.50',
      durationMinutes: '30',
    }
    expect(validateService(ok)).toEqual({})
    expect(
      validateService({
        ...ok,
        name: ' ',
        price: '1.555',
        durationMinutes: '4',
      }),
    ).toEqual({
      name: 'Ad mütləqdir',
      price: 'Ən çox 2 onluq rəqəm',
      durationMinutes: 'Ən azı 5 dəqiqə',
    })
    expect(validateService({ ...ok, durationMinutes: '601' })).toHaveProperty(
      'durationMinutes',
    )
  })

  it('rejects reversed and overlapping working hours', () => {
    const week = Array.from(
      { length: 7 },
      () => [] as { start: string; end: string }[],
    )
    week[0] = [
      { start: '09:00', end: '13:00' },
      { start: '13:00', end: '18:00' },
    ]
    expect(validateWeek(week)).toEqual({})
    week[1] = [{ start: '18:00', end: '09:00' }]
    week[2] = [
      { start: '09:00', end: '13:00' },
      { start: '12:00', end: '18:00' },
    ]
    expect(validateWeek(week)).toEqual({
      1: 'Başlama vaxtı bitmə vaxtından əvvəl olmalıdır',
      2: 'İş saatları kəsişir',
    })
  })
})

describe('PanelShell', () => {
  it('keeps customers out', () => {
    setSessionUser(user('CUSTOMER'))
    render(<PanelShell>gizli</PanelShell>)

    expect(screen.queryByText('gizli')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kabinetə keç' })).toHaveAttribute(
      'href',
      '/account',
    )
  })

  it('shows admins only the shared sections', () => {
    setSessionUser(user('ADMIN'))
    render(<PanelShell>məzmun</PanelShell>)

    expect(screen.getByText('məzmun')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Randevular' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Xidmətlər' }),
    ).not.toBeInTheDocument()
  })
})

describe('AppointmentsBoard', () => {
  it('shows a new status at once and sends it to the API', async () => {
    setSessionUser(user('PROVIDER'))
    const fetch = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === 'PATCH'
        ? Response.json({ ...ITEM.appointment, status: 'COMPLETED' })
        : Response.json([ITEM]),
    )
    vi.stubGlobal('fetch', fetch)
    render(<AppointmentsBoard />)

    const card = (await screen.findByText('Aynur Qasımova')).closest('li')!
    fireEvent.click(within(card).getByRole('button', { name: 'Tamamlandı' }))

    expect(within(card).getByText('Tamamlanıb')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/backend/provider/appointments/7/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      }),
    )
    expect(fetch).toHaveBeenCalledWith(
      `/api/backend/provider/appointments?from=${today}&to=${today}`,
      expect.anything(),
    )
  })

  it('puts the old status back when the API refuses', async () => {
    setSessionUser(user('ADMIN'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'PATCH'
          ? Response.json(
              { status: 422, detail: 'Bu keçidə icazə yoxdur' },
              { status: 422 },
            )
          : Response.json([ITEM]),
      ),
    )
    render(<AppointmentsBoard />)

    const card = (await screen.findByText(/Aynur Qasımova/)).closest('li')!
    fireEvent.click(within(card).getByRole('button', { name: 'Gəlmədi' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bu keçidə icazə yoxdur',
    )
    expect(within(card).getByText('Təsdiqlənib')).toBeInTheDocument()
  })
})
