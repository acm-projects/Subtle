'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Dark glass over the photo; switches to light glass once the photo has faded.
export default function Navbar({ light: alwaysLight = false }: { light?: boolean }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.55)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const light = alwaysLight || scrolled
  const shell = light
    ? 'bg-white/70 border-white text-[#1E2B44] shadow-[0_20px_50px_-30px_rgba(30,43,68,0.45)]'
    : 'bg-[#1E2B44]/40 border-white/25 text-white'
  const link = light ? 'hover:bg-[#1E2B44]/[0.06]' : 'hover:bg-white/15'
  const cta = light ? 'bg-[#1E2B44] text-white hover:bg-[#2F4161]' : 'bg-white text-[#1E2B44] hover:bg-[#FBF3EA]'

  return (
    <div className="fixed inset-x-0 top-4 z-50 px-4 md:px-8">
      <nav
        className={`mx-auto flex max-w-6xl items-center gap-2 rounded-full border py-2 pl-6 pr-2 backdrop-blur-xl transition-colors duration-500 ${shell}`}
      >
        <Link href="/" className="mr-auto font-[family-name:var(--font-serif)] text-[26px] font-medium">
          subtle.
        </Link>
        <a href="/login?mode=login" className={`rounded-full px-4 py-3 text-sm font-medium transition-colors ${link}`}>
          Log in
        </a>
        <a href="/login?mode=signup" className={`rounded-full px-6 py-3 text-sm font-semibold transition-colors ${cta}`}>
          Sign Up
        </a>
      </nav>
    </div>
  )
}
