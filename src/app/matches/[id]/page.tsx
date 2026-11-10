import { notFound } from 'next/navigation'
import ListingDetail from '../../../components/matches/ListingDetail'
import PageFrame from '../../../components/matches/PageFrame'
import { dbListingToMatchListing } from '../../../components/matches/listings'
import { getListingById as getDbListing } from '../../../lib/listings-server'
import { withHost } from '../../../lib/hosts'

type Props = { params: Promise<{ id: string }> }

async function findListing(id: string) {
  try {
    const db = await getDbListing(id)
    if (db) return await withHost(dbListingToMatchListing(db), db.user_id)
  } catch (e) {
    console.error('Error fetching listing from DB:', e)
  }
  return null
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const listing = await findListing(id)
  return { title: listing ? `${listing.title} · Subtle` : 'Listing · Subtle' }
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params
  const listing = await findListing(id)
  if (!listing) notFound()
  return (
    <PageFrame>
      <ListingDetail listing={listing} />
    </PageFrame>
  )
}
