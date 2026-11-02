import { EMPTY, type QuizAnswers } from '../components/quiz/options'

/**
 * Converts a database row from public.users_table into the frontend QuizAnswers shape.
 */
export function userRowToQuizAnswers(row: Record<string, any> | null | undefined): QuizAnswers {
  if (!row) return EMPTY

  // 1. Budget mapping
  let budget: string | null = null
  const b = (row.monthly_budget ?? '').toLowerCase()
  if (b.includes('under') && b.includes('1,500')) budget = 'under-1500'
  else if (b.includes('1,500') && b.includes('2,000')) budget = '1500-2000'
  else if (b.includes('2,000') && b.includes('2,500')) budget = '2000-2500'
  else if (b.includes('2,500+')) budget = '2500-plus'

  // 2. Commute mode mapping
  let commuteMode: string | null = null
  const t = (row.user_transportation ?? '').toLowerCase()
  if (t.includes('walk')) commuteMode = 'walking'
  else if (t.includes('transit')) commuteMode = 'transit'
  else if (t.includes('car')) commuteMode = 'driving'
  else if (t.includes('bike')) commuteMode = 'biking'
  else if (t.includes('rideshare')) commuteMode = 'rideshare'

  // 3. Housing type mapping
  let housingType: string | null = null
  const h = (row.housing_style ?? '').toLowerCase()
  if (h.includes('house')) housingType = 'house'
  else if (h.includes('apartment')) housingType = 'apartment'
  else if (h.includes('any') || h.includes('no preference')) housingType = 'any'

  // 4. Accommodations mapping
  const accommodations: string[] = []
  const accs: string[] = Array.isArray(row.user_accommodations) ? row.user_accommodations : []
  for (const a of accs) {
    const lower = a.toLowerCase()
    if (lower.includes('pet')) accommodations.push('pets')
    if (lower.includes('wheelchair') || lower.includes('accessible')) accommodations.push('accessible')
  }
  if (!accommodations.length) accommodations.push('none')

  // 5. Car mapping
  let car: string | null = null
  if (row.has_car === true) car = 'car'
  else if (row.has_car === false) car = 'transit'

  // 6. Move-in mapping
  let moveIn: string | null = null
  const mDate = row.move_in_date ?? ''
  if (mDate.includes('-05-') || mDate.includes('May')) moveIn = 'may'
  else if (mDate.includes('-06-') || mDate.includes('June')) moveIn = 'june'
  else if (mDate.includes('-07-') || mDate.includes('July')) moveIn = 'july'
  else if (mDate) moveIn = 'flexible'

  // 7. Roommates mapping
  let roommates: 'yes' | 'no' | null = null
  if (row.wants_roommates === true) roommates = 'yes'
  else if (row.wants_roommates === false) roommates = 'no'

  // 8. Roommate preferences
  const roommatePrefs: Record<string, string> = {}
  if (row.preferred_roommate_gender) roommatePrefs['gender'] = row.preferred_roommate_gender
  if (row.noise_level) roommatePrefs['noise'] = row.noise_level
  if (row.cleanliness) roommatePrefs['cleanliness'] = row.cleanliness
  if (row.age_group) roommatePrefs['age'] = row.age_group
  if (row.has_guests) roommatePrefs['guests'] = row.has_guests
  if (row.sleep_schedule) roommatePrefs['schedule'] = row.sleep_schedule
  if (row.number_of_roommates) roommatePrefs['count'] = String(row.number_of_roommates)

  // 9. Interests
  const rawInterests = Array.isArray(row.user_interests) ? row.user_interests : []

  return {
    university: '',
    company: row.company_name ?? '',
    address: row.office_address ?? '',
    maxCommute: typeof row.commute_time === 'number' ? row.commute_time : 20,
    commuteMode,
    budget,
    roommates,
    roommatePrefs,
    housingType,
    accommodations,
    car,
    moveIn,
    transitImportance: typeof row.public_transit_importance === 'number' ? row.public_transit_importance : 1,
    interests: rawInterests,
    hangouts: [],
    otherInterests: '',
  }
}

