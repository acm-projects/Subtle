import PageFrame from '../../components/matches/PageFrame'
import RenterDashboard from '../../components/renter/RenterDashboard'

export const metadata = { title: 'Listings · Subtle' }

export default function MyListingsPage() {
  return (
    <PageFrame>
      <RenterDashboard />
    </PageFrame>
  )
}
