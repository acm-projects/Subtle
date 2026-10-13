import PageFrame from '../../components/matches/PageFrame'
import PostListing from '../../components/post/PostListing'

export const metadata = { title: 'Post your place · Subtle' }

// TODO(backend): only logged-in users should reach this page (same check as /home).
export default function PostPage() {
  return (
    <PageFrame>
      <PostListing />
    </PageFrame>
  )
}
