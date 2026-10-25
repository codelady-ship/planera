// Static data for the home page until the catalog API (#13, #14) is wired in
// (#34). Shapes mirror the planned API responses.

export type CategorySlug =
  'gozellik' | 'saglamliq' | 'tehsil' | 'konsultasiya' | 'idman' | 'diger'

export interface Category {
  slug: CategorySlug
  name: string
  description: string
  providerCount: number
}

export interface ProviderSummary {
  slug: string
  name: string
  title: string
  category: CategorySlug
  city: string
  rating: number
  reviewCount: number
  priceFrom: number
  /** ISO local date-time in Asia/Baku of the next free slot. */
  nextSlot: string
  initials: string
}

export const CITIES = ['Bakı', 'Sumqayıt', 'Gəncə', 'Lənkəran', 'Şəki']

export const CATEGORIES: Category[] = [
  {
    slug: 'gozellik',
    name: 'Gözəllik və baxım',
    description: 'Bərbər, salon, manikür',
    providerCount: 128,
  },
  {
    slug: 'saglamliq',
    name: 'Həkim və klinika',
    description: 'Stomatoloq, terapevt',
    providerCount: 64,
  },
  {
    slug: 'tehsil',
    name: 'Müəllim və dərslər',
    description: 'Dil, riyaziyyat, musiqi',
    providerCount: 92,
  },
  {
    slug: 'konsultasiya',
    name: 'Biznes və məsləhət',
    description: 'Konsultant, hüquq, maliyyə',
    providerCount: 37,
  },
  {
    slug: 'idman',
    name: 'İdman və məşq',
    description: 'Fərdi məşqçi, yoqa',
    providerCount: 45,
  },
  {
    slug: 'diger',
    name: 'Digər xidmətlər',
    description: 'Foto, təmir, avto',
    providerCount: 51,
  },
]

export const TOP_PROVIDERS: ProviderSummary[] = [
  {
    slug: 'elvin-barber',
    name: 'Elvin Məmmədov',
    title: 'Bərbər',
    category: 'gozellik',
    city: 'Bakı',
    rating: 4.9,
    reviewCount: 214,
    priceFrom: 15,
    nextSlot: '2026-10-26T11:30',
    initials: 'EM',
  },
  {
    slug: 'dr-leyla-hesenova',
    name: 'Dr. Leyla Həsənova',
    title: 'Stomatoloq',
    category: 'saglamliq',
    city: 'Bakı',
    rating: 4.8,
    reviewCount: 168,
    priceFrom: 30,
    nextSlot: '2026-10-26T15:00',
    initials: 'LH',
  },
  {
    slug: 'nigar-english',
    name: 'Nigar Quliyeva',
    title: 'İngilis dili müəllimi',
    category: 'tehsil',
    city: 'Sumqayıt',
    rating: 4.9,
    reviewCount: 97,
    priceFrom: 25,
    nextSlot: '2026-10-27T10:00',
    initials: 'NQ',
  },
  {
    slug: 'rauf-fitness',
    name: 'Rauf Əliyev',
    title: 'Fərdi məşqçi',
    category: 'idman',
    city: 'Gəncə',
    rating: 4.7,
    reviewCount: 82,
    priceFrom: 20,
    nextSlot: '2026-10-26T18:30',
    initials: 'RƏ',
  },
]
