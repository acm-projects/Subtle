import { notFound } from 'next/navigation'
import ListingDetail from '../../../components/matches/ListingDetail'
import PageFrame from '../../../components/matches/PageFrame'
import { getListing } from '../../../components/matches/listings'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const listing = getListing(id)
  return { title: listing ? `${listing.title} · Subtle` : 'Listing · Subtle' }
}

// TODO(backend): fetch the listing by id (and the user's quiz context) instead of the sample list.
export default async function ListingPage({ params }: Props) {
  const { id } = await params
  const listing = getListing(id)
  if (!listing) notFound()
  return (
    <PageFrame>
      <ListingDetail listing={listing} />
    </PageFrame>
  )
}
