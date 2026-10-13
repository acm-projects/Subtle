// Questionnaire data: answer shape, options and step order.

export type QuizAnswers = {
  company: string
  address: string
  maxCommute: number // minutes, one way
  commuteMode: string | null
  budget: string | null
  roommates: 'yes' | 'no' | null
  roommatePrefs: Record<string, string>
  housingType: string | null
  accommodations: string[]
  car: string | null
  moveIn: string | null
  transitImportance: number // 0 = not important, 1 = nice to have, 2 = very important
  interests: string[]
}

export const EMPTY: QuizAnswers = {
  company: '',
  address: '',
  maxCommute: 20,
  commuteMode: null,
  budget: null,
  roommates: null,
  roommatePrefs: {},
  housingType: null,
  accommodations: [],
  car: null,
  moveIn: null,
  transitImportance: 1,
  interests: [],
}

export const COMMUTE_MODES = [
  { id: 'walking', title: 'Walking', body: 'On foot', icon: 'walk' },
  { id: 'transit', title: 'Public transit', body: 'Subway or bus', icon: 'train' },
  { id: 'driving', title: 'Driving', body: 'Personal car', icon: 'car' },
  { id: 'biking', title: 'Biking or scooter', body: 'Micro-mobility', icon: 'bike' },
  { id: 'rideshare', title: 'Rideshare', body: 'Uber or Lyft', icon: 'nav' },
]
export const BUDGETS = [
  { id: 'under-1500', title: 'Under $1,500', body: 'A tighter monthly budget.', range: 'under $1,500' },
  { id: '1500-2000', title: '$1,500 to $2,000', body: 'A typical summer sublet.', range: 'from $1,500 to $2,000' },
  { id: '2000-2500', title: '$2,000 to $2,500', body: 'More room in the budget.', range: 'from $2,000 to $2,500' },
  { id: '2500-plus', title: '$2,500+', body: 'The widest set of homes.', range: 'from $2,500 and up' },
]
export const HOUSING_TYPES = [
  { id: 'house', title: 'House', body: 'A full home with more space.', icon: 'home' },
  { id: 'apartment', title: 'Apartment', body: 'Smaller, usually closer in.', icon: 'apartment' },
  { id: 'any', title: 'No preference', body: 'Show me the best matches.', icon: 'sparkle' },
]
export const ACCOMMODATIONS = [
  { id: 'pets', title: 'Pets allowed', body: 'Dogs, cats, or other pets.', icon: 'paw' },
  { id: 'accessible', title: 'Wheelchair accessible', body: 'Step-free entry and wide doorways.', icon: 'access' },
  { id: 'none', title: 'No specific needs', body: 'Show me every verified sublet.', icon: 'check' },
]
export const CAR = [
  { id: 'car', title: 'Yes, I have a car.', body: 'Parking matters.', icon: 'car' },
  { id: 'transit', title: "No, I'll use public transit.", body: 'Stations and bus lines matter.', icon: 'train' },
  { id: 'either', title: 'I can do either.', body: 'Keep the matches flexible.', icon: 'flex' },
]
export const MOVE_IN = [
  { id: 'may', title: 'May', body: 'Early summer start.', icon: 'sun' },
  { id: 'june', title: 'June', body: 'When most internships begin.', icon: 'calendar' },
  { id: 'july', title: 'July', body: 'A later start.', icon: 'sunset' },
  { id: 'flexible', title: "I'm flexible.", body: 'Show the whole summer.', icon: 'flex' },
]
export const INTERESTS = [
  { id: 'cooking', title: 'Cooking', body: 'Home meals', icon: 'pot' },
  { id: 'fitness', title: 'Fitness', body: 'Gym or runs', icon: 'run' },
  { id: 'music', title: 'Music', body: 'Shows and playlists', icon: 'music' },
  { id: 'outdoors', title: 'Outdoors', body: 'Parks and hikes', icon: 'tree' },
  { id: 'nightlife', title: 'Nightlife', body: 'Going out', icon: 'moon' },
  { id: 'reading', title: 'Reading', body: 'Quiet nights in', icon: 'book' },
]
export const ROOMMATE_GROUPS = [
  { id: 'gender', label: 'Preferred gender', options: ['Women', 'Men', 'Nonbinary', 'No preference'] },
  { id: 'noise', label: 'Noise level', options: ['Quiet', 'Moderate', 'Lively'] },
  { id: 'age', label: 'Age group', options: ['18 to 22', '23 to 26', '27+', 'No preference'] },
  { id: 'cleanliness', label: 'Cleanliness', options: ['Very tidy', 'Average', 'Relaxed'] },
  { id: 'count', label: 'How many roommates', options: ['1', '2', '3+'] },
  { id: 'guests', label: 'Guests', options: ['Rarely', 'Sometimes', 'Often'] },
  { id: 'temperature', label: 'Sleep temperature', options: ['Cool', 'Comfortable', 'Warm'] },
  { id: 'schedule', label: 'Sleep schedule', options: ['Early nights', 'Night owl', 'Flexible'] },
]
export const TRANSIT_LEVELS = ['Not important', 'Nice to have', 'Very important']

export const SECTIONS: Record<number, string> = { 1: 'Work & location', 2: 'Housing', 3: 'Priorities', 4: 'Interests' }

export const label = (list: { id: string; title: string }[], id: string | null) => list.find((o) => o.id === id)?.title ?? ''

export type StepId =
  | 'work'
  | 'commute'
  | 'budget'
  | 'roommates'
  | 'roommatePrefs'
  | 'housingType'
  | 'accommodations'
  | 'car'
  | 'moveIn'
  | 'transit'
  | 'interests'
  | 'done'

export type Step = { id: StepId; section: number; extra?: boolean }

// Roommate preferences only show up if they said yes to roommates.
export function buildSteps(a: QuizAnswers): Step[] {
  return [
    { id: 'work', section: 1 },
    { id: 'commute', section: 1 },
    { id: 'budget', section: 2 },
    { id: 'roommates', section: 2 },
    ...(a.roommates === 'yes' ? [{ id: 'roommatePrefs' as const, section: 2, extra: true }] : []),
    { id: 'housingType', section: 2 },
    { id: 'accommodations', section: 2 },
    { id: 'car', section: 2 },
    { id: 'moveIn', section: 2 },
    { id: 'transit', section: 3 },
    { id: 'interests', section: 4 },
    { id: 'done', section: 5 },
  ]
}
