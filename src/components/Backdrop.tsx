'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

// The one LA photo: fixed behind the hero and section 2.
// It fades out as you scroll, revealing the page's dusk-to-cream background.
export default function Backdrop() {
  const [fade, setFade] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight
      setFade(Math.min(Math.max((window.scrollY - vh * 0.08) / (vh * 0.55), 0), 1))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-screen overflow-hidden rounded-b-[44px] shadow-[0_40px_80px_-30px_rgba(30,43,68,0.45)]"
      style={{ opacity: 1 - fade }}
    >
      <Image src="/images/hero-la.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[center_42%]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#8fa4cf]/60 via-[#8fa4cf]/40 to-[#8fa4cf]/60" />
    </div>
  )
}
