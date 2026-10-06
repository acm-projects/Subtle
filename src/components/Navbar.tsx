import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 z-20 grid h-20 w-full grid-cols-[1fr_auto_1fr] items-center bg-[#342923] px-8 shadow-md">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          aria-label="Home"
          className="flex h-10 w-10 items-center justify-center rounded-md bg-[#3d312a] text-[#f1e6d6]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
          </svg>
        </Link>
        <Link href="/" className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#f1e6d6]">
          subtle.
        </Link>
      </div>

      <div className="hidden gap-12 text-base font-medium text-[#f1e6d6] md:flex">
        <a href="#" className="hover:text-[#c49a6c]">How It Works</a>
        <a href="#" className="hover:text-[#c49a6c]">Browse Cities</a>
      </div>

      <div className="flex items-center justify-end gap-5">
        <a href="/login?mode=signup" className="rounded-full bg-[#b89168] px-8 py-3 text-base font-medium text-[#f9f1e6] hover:bg-[#c49a6c]">
          Sign Up
        </a>
        <a href="/login?mode=login" className="text-base text-[#e8dccb] hover:text-[#c49a6c]">Log in</a>
      </div>
    </nav>
  )
}