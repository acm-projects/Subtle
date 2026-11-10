'use client'

import { useEffect, useState } from 'react'

// Light / dark mode setting for the Profile page. The choice is kept in this browser
// ('subtle-theme') and applied before the page paints by the script in app/layout.tsx.
export default function ThemeSetting() {
  const [dark, setDark] = useState(false)

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])

  const choose = (next: boolean) => {
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('subtle-theme', next ? 'dark' : 'light')
    } catch {}
  }

  const option = (isDark: boolean, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={dark === isDark}
      onClick={() => choose(isDark)}
      className={`h-11 flex-1 rounded-full px-5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-[#1f2a44] ${
        dark === isDark ? 'bg-[#1f2a44] text-white' : 'text-[#1f2a44] hover:bg-white'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div role="radiogroup" aria-label="Appearance" className="flex max-w-xs gap-1 rounded-full bg-[#EEF3F8] p-1">
      {option(false, 'Light')}
      {option(true, 'Dark')}
    </div>
  )
}
