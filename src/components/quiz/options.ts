// Questionnaire data: answer shape, options and step order.

export type QuizAnswers = {
  university: string
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
  moveIn: string | null // month id (may/june/july/flexible), kept for older pages
  moveInDate: string // 'YYYY-MM-DD' from the calendar
  moveOutDate: string // 'YYYY-MM-DD' from the calendar
  transitImportance: number // 0 = not important, 1 = nice to have, 2 = very important
  interests: string[]
  hangouts: string[] // how they like to spend free time with other interns
  otherInterests: string // anything else, typed in
}

export const EMPTY: QuizAnswers = {
  university: '',
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
  moveInDate: '',
  moveOutDate: '',
  transitImportance: 1,
  interests: [],
  hangouts: [],
  otherInterests: '',
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
// ids are the labels we store and match on (same words other interns pick)
export const INTERESTS = [
  { id: 'Cooking', title: 'Cooking', body: 'Home meals', icon: 'pot' },
  { id: 'Fitness', title: 'Fitness', body: 'Gym or classes', icon: 'run' },
  { id: 'Live music', title: 'Live music', body: 'Shows and concerts', icon: 'music' },
  { id: 'Hiking', title: 'Hiking', body: 'Trails and parks', icon: 'tree' },
  { id: 'Nightlife', title: 'Nightlife', body: 'Going out', icon: 'moon' },
  { id: 'Reading', title: 'Reading', body: 'Quiet nights in', icon: 'book' },
  { id: 'Film', title: 'Film', body: 'Movies and shows', icon: 'sparkle' },
  { id: 'Photography', title: 'Photography', body: 'Photo walks', icon: 'map' },
  { id: 'Basketball', title: 'Basketball', body: 'Pickup games', icon: 'run' },
  { id: 'Soccer', title: 'Soccer', body: 'Leagues or pickup', icon: 'run' },
  { id: 'Yoga', title: 'Yoga', body: 'Slow mornings', icon: 'sun' },
  { id: 'Gaming', title: 'Gaming', body: 'Console or PC', icon: 'sparkle' },
  { id: 'Coffee', title: 'Coffee', body: 'Cafe hopping', icon: 'pot' },
  { id: 'Travel', title: 'Travel', body: 'Weekend trips', icon: 'map' },
  { id: 'Art', title: 'Art', body: 'Museums and making', icon: 'sparkle' },
  { id: 'Volunteering', title: 'Volunteering', body: 'Giving back', icon: 'people' },
]
export const MIN_INTERESTS = 3

export const HANGOUTS = [
  { id: 'Exploring the city', title: 'Exploring the city', body: 'New neighborhoods every weekend', icon: 'map' },
  { id: 'Trying food spots', title: 'Trying food spots', body: 'Brunch, food trucks, hidden gems', icon: 'pot' },
  { id: 'Concerts and shows', title: 'Concerts and shows', body: 'Live music, comedy, theater', icon: 'music' },
  { id: 'Game nights', title: 'Game nights', body: 'Board games or video games in', icon: 'people' },
  { id: 'Pickup sports', title: 'Pickup sports', body: 'Basketball, soccer, volleyball', icon: 'run' },
  { id: 'Outdoor trips', title: 'Outdoor trips', body: 'Hikes, beaches, day trips', icon: 'tree' },
  { id: 'Co-working', title: 'Coffee and co-working', body: 'Side projects together', icon: 'building' },
  { id: 'Quiet nights', title: 'Quiet nights', body: 'Movies, reading, cooking in', icon: 'moon' },
]

export const SCHOOLS = [
  'UT Dallas', 'UT Austin', 'Texas A&M', 'Rice', 'SMU', 'UCLA', 'USC', 'UC Berkeley', 'Stanford', 'UCSD',
  'University of Washington', 'NYU', 'Columbia', 'MIT', 'Harvard', 'Georgia Tech', 'Michigan', 'Northwestern',
  'Duke', 'Carnegie Mellon', 'UIUC', 'Purdue', 'Cornell', 'Howard', 'Brown', 'Yale',
]

// Everything they told us they're into, as one list (what we save and match on)
export function allInterests(a: QuizAnswers) {
  const typed = a.otherInterests
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  return Array.from(new Set([...a.interests, ...a.hangouts, ...typed]))
}
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

export const SECTIONS: Record<number, string> = { 1: 'School & Work', 2: 'Housing', 3: 'Interests' }

export const label = (list: { id: string; title: string }[], id: string | null) => list.find((o) => o.id === id)?.title ?? ''

export type StepId =
  | 'school'
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
  | 'hangouts'
  | 'done'

export type Step = { id: StepId; section: number; extra?: boolean }

// Roommate preferences only show up if they said yes to roommates.
// Short version: no roommate, housing type, transportation, transit or free-time questions.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildSteps(_a?: QuizAnswers): Step[] {
  return [
    { id: 'school', section: 1 },
    { id: 'work', section: 1 },
    { id: 'commute', section: 1 },
    { id: 'budget', section: 2 },
    { id: 'accommodations', section: 2 },
    { id: 'moveIn', section: 2 },
    { id: 'interests', section: 3 },
    { id: 'done', section: 4 },
  ]
}

// month id for older pages that still read a.moveIn
export function monthIdFor(iso: string): string | null {
  const m = Number(iso.split('-')[1])
  if (!m) return null
  return m === 5 ? 'may' : m === 6 ? 'june' : m === 7 ? 'july' : 'flexible'
}

// "2026-06-01" -> "Jun 1"
export function prettyDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
