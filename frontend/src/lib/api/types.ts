// Shapes of the Randevum API responses (backend/src/main/java/az/randevum).

export type UserRole = 'ADMIN' | 'PROVIDER' | 'CUSTOMER'

export interface SessionUser {
  id: number
  email: string
  fullName: string
  phone: string | null
  role: UserRole
  providerSlug: string | null
}

export interface TokenResponse {
  accessToken: string
  expiresIn: number
  refreshToken: string
  user: SessionUser
}

/** RFC 9457 problem details, plus Randevum's extra fields. */
export interface Problem {
  status: number
  detail?: string
  errors?: Record<string, string>
  alternatives?: string[]
}

export interface Category {
  slug: string
  name: string
  icon: string | null
  providerCount: number
}

export interface ProviderSummary {
  slug: string
  name: string
  title: string
  category: string
  categoryName: string
  city: string
  rating: number
  reviewCount: number
  priceFrom: number | null
  initials: string
  nextSlot: string | null
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ServiceView {
  id: number
  name: string
  description: string | null
  price: number
  durationMinutes: number
}

export interface DaySchedule {
  day: number
  intervals: { start: string; end: string }[]
}

export interface ProviderDetail {
  summary: ProviderSummary
  bio: string | null
  address: string | null
  phone: string | null
  cancellationHours: number
  services: ServiceView[]
  schedule: DaySchedule[]
}

export interface SlotsView {
  date: string
  serviceId: number
  durationMinutes: number
  slots: string[]
}

export interface AvailableDatesView {
  month: string
  serviceId: number
  dates: string[]
}

export type AppointmentStatus =
  'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export interface Appointment {
  id: number
  code: string
  providerSlug: string
  providerName: string
  serviceId: number
  serviceName: string
  date: string
  time: string
  durationMinutes: number
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  price: number
  note: string | null
  cancellable: boolean
}
