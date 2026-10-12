// Shape of a matched listing. Backend: return this shape (sorted or not) and the page handles the rest.
export type Listing = {
  id: string
  title: string
  neighborhood: string
  price: number // per month, USD
  score: number // Subtle score, 0 to 100
  commuteMinutes: number
  commuteMode: 'walk' | 'transit' | 'bike' | 'drive'
  homeType: 'Apartment' | 'House' | 'Studio'
  roomType: 'Private room' | 'Shared room' | 'Entire place'
  tags: string[]
  availableFrom: string // e.g. "June 1"
  availableTo: string // e.g. "Aug 20"
  description: string
  amenities: string[]
  hostName: string
}

export type MatchContext = {
  city: string
  company: string
  office: string
}

// SAMPLE DATA ONLY (made up). Swap for the real matches from the backend.
export const SAMPLE_CONTEXT: MatchContext = {
  city: 'San Francisco',
  company: 'Stripe',
  office: '500 Howard St',
}

export const SAMPLE_LISTINGS: Listing[] = [
  {
    id: 'soma-loft',
    title: 'SoMa loft',
    neighborhood: 'SoMa',
    price: 1840,
    score: 96,
    commuteMinutes: 11,
    commuteMode: 'walk',
    homeType: 'Apartment',
    roomType: 'Private room',
    tags: ['Pets allowed'],
    availableFrom: 'June 1',
    availableTo: 'Aug 22',
    description: 'Bright loft with tall windows, a shared kitchen, and a quiet workspace corner.',
    amenities: ['In-unit laundry', 'Wi-Fi', 'Desk', 'Furnished'],
    hostName: 'Maya',
  },
  {
    id: 'hayes-valley-studio',
    title: 'Hayes Valley studio',
    neighborhood: 'Hayes Valley',
    price: 1690,
    score: 87,
    commuteMinutes: 16,
    commuteMode: 'transit',
    homeType: 'Studio',
    roomType: 'Entire place',
    tags: ['No roommates', 'Furnished'],
    availableFrom: 'June 1',
    availableTo: 'Aug 31',
    description: 'A cozy studio a block from the park, close to the Muni line.',
    amenities: ['Wi-Fi', 'Kitchenette', 'Furnished'],
    hostName: 'Daniel',
  },
  {
    id: 'mission-apartment',
    title: 'Mission apartment',
    neighborhood: 'Mission',
    price: 1520,
    score: 73,
    commuteMinutes: 22,
    commuteMode: 'transit',
    homeType: 'Apartment',
    roomType: 'Shared room',
    tags: ['2 roommates'],
    availableFrom: 'May 28',
    availableTo: 'Aug 15',
    description: 'Sunny shared apartment with two other interns and a big living room.',
    amenities: ['Wi-Fi', 'Shared kitchen', 'Bike storage'],
    hostName: 'Priya',
  },
  {
    id: 'nob-hill-room',
    title: 'Nob Hill room',
    neighborhood: 'Nob Hill',
    price: 1950,
    score: 84,
    commuteMinutes: 14,
    commuteMode: 'transit',
    homeType: 'Apartment',
    roomType: 'Private room',
    tags: ['Furnished', 'Doorman'],
    availableFrom: 'June 8',
    availableTo: 'Aug 30',
    description: 'Private room in a classic building with city views and a quiet street.',
    amenities: ['Elevator', 'Wi-Fi', 'Desk'],
    hostName: 'Leo',
  },
  {
    id: 'potrero-house',
    title: 'Potrero Hill house',
    neighborhood: 'Potrero Hill',
    price: 1420,
    score: 69,
    commuteMinutes: 25,
    commuteMode: 'bike',
    homeType: 'House',
    roomType: 'Private room',
    tags: ['Backyard', '3 roommates'],
    availableFrom: 'June 1',
    availableTo: 'Aug 20',
    description: 'A shared house with a backyard and an easy bike ride downtown.',
    amenities: ['Backyard', 'Washer and dryer', 'Wi-Fi'],
    hostName: 'Sam',
  },
]
