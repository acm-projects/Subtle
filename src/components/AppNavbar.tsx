'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// Navbar for logged-in pages: logo, the user's initial, and Log out (with a confirm step).
export default function AppNavbar({ firstName }: { firstName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const stayRef = useRef<HTMLButtonElement>(null)

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
        <nav className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-white bg-white/70 py-2 pl-6 pr-2 text-[#1E2B44] shadow-[0_20px_50px_-30px_rgba(30,43,68,0.45)] backdrop-blur-xl">
          <Link href="/home" className="mr-auto font-[family-name:var(--font-serif)] text-[26px] font-medium">
            subtle.
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full px-4 py-3 text-sm font-medium transition-colors hover:bg-[#1E2B44]/[0.06]"
          >
            Log out
          </button>
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
