'use client'

import { useEffect, useState } from 'react'

export default function Hero() {
  const [show, setShow] = useState(false)
  useEffect(() => setShow(true), [])

  const state = show ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'

  return (
    <section className="flex min-h-screen flex-col items-center justify-between px-6 pb-20 pt-36 text-center">
      <h1
        className={`font-[family-name:var(--font-serif)] text-8xl font-bold tracking-tight text-[#7d6d60] transition-all delay-200 duration-1000 ease-out md:text-[10rem] md:leading-none ${state}`}
      >
        subtle.
      </h1>
      <p
className={`font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#D1B89A] drop-shadow-md transition-all delay-700 duration-1000 ease-out md:text-4xl ${state}`}      >
        find your home today with subtle.
      </p>
    </section>
  )
}