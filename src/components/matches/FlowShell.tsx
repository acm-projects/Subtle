'use client'

import AppNavbar from '../AppNavbar'
import { SAMPLE_CONTEXT, type Listing, type MatchContext } from './listings'
import { Icon, ListingPhoto, ScoreBadge } from './parts'

// Two-column glass layout shared by the Book and Contact pages: content on the left, the home on the right.
export default function FlowShell({
  listing,
  context = SAMPLE_CONTEXT,
  caption,
  children,
}: {
  listing: Listing
  context?: MatchContext
  caption: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <AppNavbar firstName="" />
      <section className="px-4 pb-16 pt-28 md:px-8">
        <article className="mx-auto w-full max-w-[1240px] animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] rounded-[36px] border border-white bg-white/60 p-5 shadow-[0_30px_70px_-36px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-9">
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 text-sm font-semibold">
              <Icon name="pin" size={15} /> {context.city} · {context.company}
            </span>
          </div>
          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="flex flex-col">{children}</div>
            <div className="group relative">
              <ListingPhoto listing={listing} seed={0} className="h-full min-h-[300px] md:min-h-[460px]" />
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-4 rounded-[22px] border border-white bg-white/85 p-4 shadow-[0_16px_40px_-20px_rgba(30,43,68,0.55)] backdrop-blur-xl">
                <ScoreBadge score={listing.score} size={46} />
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-serif)] text-2xl font-medium leading-tight">{listing.title}</p>
                  <p className="mt-0.5 text-sm text-[#4A5A75]">{caption}</p>
                </div>
              </div>
            </div>
          </div>
        </article>
        <p className="mt-8 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>
    </>
  )
}
