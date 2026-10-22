// What a sub-leaser fills in on /post. Backend: save this shape (plus the photo files).
export type NewListing = {
  title: string
  address: string
  rent: string // dollars per month, digits only
  availableFrom: string // yyyy-mm-dd from the date input
  availableTo: string // yyyy-mm-dd, optional
  homeType: string
  roomType: string
  included: string[]
  about: string
}

export const EMPTY_LISTING: NewListing = {
  title: '',
  address: '',
  rent: '',
  availableFrom: '',
  availableTo: '',
  homeType: 'Apartment',
  roomType: 'Private room',
  included: [],
  about: '',
}

export const HOME_TYPES = ['Apartment', 'Studio', 'House', 'Attached house']
export const ROOM_TYPES = ['Private room', 'Shared room', 'Entire place']
export const INCLUDED = ['Pets allowed', 'Furnished', 'Washer', 'Dryer', 'Utilities', 'Wi-Fi', 'Air conditioning', 'Parking', 'Dishwasher', 'Gym access']

export const MAX_PHOTOS = 10

// "2026-06-01" -> "Jun 1" (no year, parsed as a local date)
export function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Fields that must be filled before posting
export function missingFields(l: NewListing, photoCount: number) {
  const missing: string[] = []
  if (!l.title.trim()) missing.push('a title')
  if (photoCount === 0) missing.push('at least one photo')
  if (!l.address.trim()) missing.push('the address')
  if (!l.rent || Number(l.rent) <= 0) missing.push('the monthly rent')
  if (!l.availableFrom) missing.push('a move-in date')
  if (l.availableTo && l.availableFrom && l.availableTo <= l.availableFrom) missing.push('a move-out date after move-in')
  return missing
}
