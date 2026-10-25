import PageFrame from '../../components/matches/PageFrame'
import RenterDashboard from '../../components/renter/RenterDashboard'

export const metadata = { title: 'Your listings · Subtle' }

export default function MyListingsPage() {
  return (
    <PageFrame>
      <RenterDashboard />
    </PageFrame>
  )
}
