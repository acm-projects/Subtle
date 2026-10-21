import { Suspense } from 'react'
import PageFrame from '../../components/matches/PageFrame'
import Messages from '../../components/messages/Messages'

export const metadata = { title: 'Messages · Subtle' }

// TODO(backend): only logged-in users should reach this page (same check as /home).
export default function MessagesPage() {
  return (
    <PageFrame>
      <Suspense>
        <Messages />
      </Suspense>
    </PageFrame>
  )
}
