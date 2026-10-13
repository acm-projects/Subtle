// Simple stroke icons used across the questionnaire.
const paths: Record<string, React.ReactNode> = {
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  check: <path d="M5 12l5 5 9-10" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.8" />
      <path d="M10 21l2-6 3 3v3M8 12l2-4 4 1 2 4M12 15l-1-6" />
    </>
  ),
  train: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4" />
      <circle cx="9" cy="14" r=".6" fill="currentColor" />
      <circle cx="15" cy="14" r=".6" fill="currentColor" />
    </>
  ),
  car: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <rect x="3" y="11" width="18" height="6" rx="2" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16l4-7h5l3 7M10 9l2 7h-6M14 6h2" />
    </>
  ),
  nav: <path d="M3 11l18-8-8 18-2-8z" />,
  dollar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.3c0 3 6 1.7 6 4.9 0 1.3-1.3 2.3-3 2.3s-3-1.1-3-2.5M12 5.5v13" />
    </>
  ),
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  apartment: (
    <>
      <rect x="3" y="7" width="8" height="14" rx="1" />
      <rect x="11" y="3" width="10" height="18" rx="1" />
      <path d="M6 11h2M6 15h2M14 7h1M17 7h1M14 11h1M17 11h1M14 15h1M17 15h1" />
    </>
  ),
  paw: (
    <>
      <circle cx="7" cy="9" r="1.8" />
      <circle cx="11" cy="6" r="1.8" />
      <circle cx="15" cy="6" r="1.8" />
      <circle cx="18.5" cy="9.5" r="1.8" />
      <path d="M8 16c0-2.5 2-5 4.5-5s4.5 2.5 4.5 5c0 2-1.5 3-3 3h-3C9.5 19 8 18 8 16z" />
    </>
  ),
  access: (
    <>
      <circle cx="11" cy="4.5" r="1.8" />
      <path d="M11 8v6h5l2 5M8 11a6 6 0 1 0 7.5 7.5" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="8" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  sunset: (
    <>
      <path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M2 18h2M20 18h2M18.4 11.6l1.4-1.4M23 22H1M16 5l-4 4-4-4" />
    </>
  ),
  flex: (
    <>
      <path d="M4 7h11l-3-3M20 17H9l3 3" />
    </>
  ),
  pot: (
    <>
      <path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M2 10h20M9 6c0-1 1-2 3-2s3 1 3 2" />
    </>
  ),
  run: (
    <>
      <circle cx="15" cy="4.5" r="1.8" />
      <path d="M5 20l4-5 3 2 2-5 4 3M9 11l3-3 3 1" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  tree: (
    <>
      <path d="M12 3a5 5 0 0 1 5 5 4 4 0 0 1-1 7H8a4 4 0 0 1-1-7 5 5 0 0 1 5-5z" />
      <path d="M12 15v6M9 21h6" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  book: (
    <>
      <path d="M3 5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H3zM21 5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v16a2 2 0 0 1 2-2h7z" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  map: (
    <>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  arrowL: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowR: <path d="M5 12h14M13 6l6 6-6 6" />,
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
}

export default function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name] ?? paths.circle}
    </svg>
  )
}
