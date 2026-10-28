'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// Navbar for logged-in pages: logo (back to the dashboard), Messages, Post a listing, Your listings, and Log out (with a confirm step).
export default function AppNavbar({ firstName }: { firstName: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const viewingProfile = pathname?.startsWith('/profile')
  const matching = pathname?.startsWith('/internMatches')  
  const messaging = pathname?.startsWith('/messages')
  const hosting = pathname?.startsWith('/my-listings')
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const stayRef = useRef<HTMLButtonElement>(null)

  // load the signed-in user's profile picture; refresh when they change it on the profile page
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', auth.user.id).single()
      if (active) setAvatarUrl(data?.avatar_url ?? null)
    }
    load()
    window.addEventListener('avatar-updated', load)
    return () => {
      active = false
      window.removeEventListener('avatar-updated', load)
    }
  }, [pathname])

  // focus "Stay signed in" when the dialog opens, close on Escape
  useEffect(() => {
    if (!confirming) return
    stayRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirming(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming])

  const logOut = async () => {
    setLeaving(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <div className="fixed inset-x-0 top-4 z-50 px-4 md:px-8">
        <nav className="mx-auto flex max-w-6xl items-center gap-1.5 rounded-full border border-white bg-white/70 py-2 pl-6 pr-2 text-[#1E2B44] shadow-[0_20px_50px_-30px_rgba(30,43,68,0.45)] backdrop-blur-xl">
          <Link href="/home" className="mr-auto font-[family-name:var(--font-serif)] text-[26px] font-medium">
            subtle.
          </Link>
          <Link
            href="/messages"
            aria-current={messaging ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold transition-colors md:px-4 md:py-3 ${
              messaging ? 'bg-[#1E2B44] text-white' : 'hover:bg-[#1E2B44]/[0.06]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16v11H9l-5 4z" />
            </svg>
            <span className="hidden sm:inline">Messages</span>
            <span className="sr-only sm:hidden">Messages</span>
          </Link>
          <Link
            href="/internMatches"
            aria-current={matching ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold transition-colors md:px-4 md:py-3 ${
              matching ? 'bg-[#1E2B44] text-white' : 'hover:bg-[#1E2B44]/[0.06]'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
              <path d="M16 5a3.5 3.5 0 0 1 0 6M18 14c2 .7 3.5 2.6 3.5 6" />
            </svg>
            <span className="hidden md:inline">Intern Matches</span>
            <span className="md:hidden">Matches</span>
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-[#1E2B44]/[0.06] md:px-4 md:py-3"
          >
            Log out
          </button>
          <Link
            href="/profile"
            aria-label="View profile"
            aria-current={viewingProfile ? 'page' : undefined}
            className={`ml-1 inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-1.5 text-sm font-semibold transition-colors sm:pr-4 ${
              viewingProfile ? 'bg-[#1E2B44] text-white' : 'hover:bg-[#1E2B44]/[0.06]'
            }`}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                  viewingProfile ? 'bg-white text-[#1E2B44]' : 'bg-[#1E2B44] text-white'
                }`}
              >
                {firstName?.[0]?.toUpperCase() ?? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                )}
              </span>
            )}
            <span className="hidden sm:inline">View profile</span>
          </Link>
        </nav>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setConfirming(false)}
            className="absolute inset-0 animate-[fadeIn_.2s_ease-out] bg-[#1E2B44]/30 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="relative w-full max-w-sm animate-[popIn_.25s_cubic-bezier(.2,.8,.3,1.1)] rounded-[28px] border border-white bg-white/90 p-7 text-center text-[#1E2B44] shadow-[0_40px_90px_-40px_rgba(30,43,68,0.6)] backdrop-blur-xl"
          >
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF3F8]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <h2 id="logout-title" className="mt-4 font-[family-name:var(--font-serif)] text-3xl font-medium">
              Log out?
            </h2>
            <p className="mt-2 text-[15px] text-[#4A5A75]">You can stay signed in so your matches are ready next time.</p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                ref={stayRef}
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-12 rounded-full bg-[#1E2B44] px-6 text-[15px] font-semibold text-white transition hover:bg-[#2F4161]"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={logOut}
                disabled={leaving}
                className="min-h-12 rounded-full border border-[#D5DFEA] bg-white px-6 text-[15px] font-semibold text-[#1E2B44] transition hover:bg-[#F7F9FB] disabled:opacity-60"
              >
                {leaving ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}