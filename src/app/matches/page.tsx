import '../globals.css'
import Matches from '../../components/matches/Matches'
import { getListings } from '../../lib/listings'
import { dbListingToMatchListing, SAMPLE_LISTINGS } from '../../components/matches/listings'

// same soft sky as the home page and quiz
const SKY =
  'radial-gradient(ellipse 55% 40% at 10% 15%, rgba(169,199,232,0.55) 0%, rgba(169,199,232,0) 100%), radial-gradient(ellipse 50% 45% at 92% 90%, rgba(243,201,160,0.5) 0%, rgba(243,201,160,0) 100%), linear-gradient(180deg, #D3DEE9 0%, #E5EBF1 45%, #F6EFE6 100%)'

export const metadata = { title: 'Matches · Subtle' }

export default async function MatchesPage() {
  let matchedListings = SAMPLE_LISTINGS
  try {
    const { listings: dbListings } = await getListings({ pageSize: 50 })
    if (dbListings?.length) {
      const converted = dbListings.map(dbListingToMatchListing)
      matchedListings = [...converted, ...SAMPLE_LISTINGS]
    }
  } catch (e) {
    console.error('Error loading listings from DB:', e)
  }

  return (
    <main
      className="min-h-screen font-[family-name:var(--font-body)] text-[#1E2B44]"
      style={{ background: SKY, backgroundAttachment: 'fixed' }}
    >
      <Matches listings={matchedListings} />
    </main>
  )
}
