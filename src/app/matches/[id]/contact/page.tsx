import { notFound } from 'next/navigation'
import ContactHost from '../../../../components/matches/ContactHost'
import PageFrame from '../../../../components/matches/PageFrame'
import { getListing } from '../../../../components/matches/listings'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const listing = getListing(id)
  return { title: listing ? `Contact · ${listing.title} · Subtle` : 'Contact · Subtle' }
}

// TODO(backend): fetch the listing by id (and the user's quiz context) instead of the sample list.
export default async function Page({ params }: Props) {
  const { id } = await params
  const listing = getListing(id)
  if (!listing) notFound()
  return (
    <PageFrame>
      <ContactHost listing={listing} />
    </PageFrame>
  )
}
