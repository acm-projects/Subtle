import { notFound } from 'next/navigation'
import ContactHost from '../../../../components/matches/ContactHost'
import PageFrame from '../../../../components/matches/PageFrame'
import { getListing, dbListingToMatchListing } from '../../../../components/matches/listings'
import { getListing as getDbListing } from '../../../../lib/listings'

type Props = { params: Promise<{ id: string }> }

async function findListing(id: string) {
  try {
    const db = await getDbListing(id)
    if (db) return dbListingToMatchListing(db)
  } catch (e) {
    console.error('Error fetching listing from DB:', e)
  }
  return getListing(id)
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const listing = await findListing(id)
  return { title: listing ? `Contact · ${listing.title} · Subtle` : 'Contact · Subtle' }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const listing = await findListing(id)
  if (!listing) notFound()
  return (
    <PageFrame>
      <ContactHost listing={listing} />
    </PageFrame>
  )
}
