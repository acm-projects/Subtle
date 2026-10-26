'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'

/*
  Subtle's house mascot (design from the team's Framer component).
  Matches the Framer render (pointed roof, open smile, waving arm), rebuilt with plain CSS animation so it needs no extra packages.
  - bobs, sways and swings its arms on a loop (speed 1 = one bob every 1.6s)
  - pauses while it's off screen, and stays still for people who turn on "reduce motion"
*/
export type Mood = 'happy' | 'wink' | 'proud' | 'excited'

type Props = {
  gradientStart?: string
  gradientEnd?: string
  faceColor?: string
  shadowColor?: string
  legColor?: string
  footColor?: string
  blushColor?: string
  mood?: Mood // face: happy (default), wink, proud, excited
  jump?: boolean // hop up and down instead of the gentle bob
  flip?: boolean // face the other way
  animate?: boolean
  speed?: number
  label?: string
  className?: string
  style?: CSSProperties
}

export default function HouseMascot({
  gradientStart = '#B9D6F0',
  gradientEnd = '#F4E2CD',
  faceColor = '#3E5068',
  shadowColor = '#9FB2C4',
  legColor = '#7E97AD',
  footColor = '#B9D6F0',
  blushColor = '#F4DCC6',
  mood = 'happy',
  jump = false,
  flip = false,
  animate = true,
  speed = 1,
  label = 'Subtle house mascot',
  className = '',
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(false)
  const gradientId = `house-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const duration = `${Math.max(0.2, 1.6 / Math.max(0.1, speed))}s`

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const playing = animate && onScreen
  const loop = (name: string): CSSProperties => ({
    animation: animate ? `${name} ${duration} ease-in-out infinite` : 'none',
    animationPlayState: playing ? 'running' : 'paused',
  })

  return (
    <div ref={ref} role="img" aria-label={label} className={`house-mascot relative flex items-center justify-center ${className}`} style={{ ...(flip ? { transform: 'scaleX(-1)' } : {}), ...style }}>
      <svg width="100%" height="100%" viewBox="190 80 470 490" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id={`${gradientId}-roof`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor="#D6DDE3" />
          </linearGradient>
          <linearGradient id={`${gradientId}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="55%" stopColor="#D8DEE3" />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
          <linearGradient id={`${gradientId}-armL`} gradientUnits="userSpaceOnUse" x1="262" y1="333" x2="224" y2="410">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
          <linearGradient id={`${gradientId}-armR`} gradientUnits="userSpaceOnUse" x1="627" y1="215" x2="566" y2="272">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
          <filter id={`${gradientId}-blur`} x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* soft shadow */}
        <ellipse cx="425" cy="532" rx="122" ry="18" fill={shadowColor} opacity={0.35} filter={`url(#${gradientId}-blur)`} style={{ transformOrigin: '425px 532px', ...loop('houseShadow') }} />

        <g style={{ transformOrigin: '415px 470px', ...loop(jump ? 'houseJump' : 'houseBob') }}>
          {/* arms */}
          <g style={{ transformOrigin: '262px 333px', ...loop('houseArmL') }}>
            <line x1="262" y1="333" x2="224" y2="410" stroke={`url(#${gradientId}-armL)`} strokeWidth="24" strokeLinecap="round" />
          </g>
          <g style={{ transformOrigin: '566px 272px', ...loop('houseArmR') }}>
            <line x1="566" y1="272" x2="627" y2="215" stroke={`url(#${gradientId}-armR)`} strokeWidth="24" strokeLinecap="round" />
          </g>

          {/* legs + feet */}
          <path d="M356 452 L349 492" stroke={legColor} strokeWidth="14" strokeLinecap="round" />
          <path d="M482 448 L490 484" stroke={legColor} strokeWidth="14" strokeLinecap="round" />
          <rect x="318" y="486" width="62" height="28" rx="11" fill={footColor} />
          <rect x="466" y="478" width="64" height="28" rx="11" fill={footColor} />

          {/* chimney (behind the roof) */}
          <rect x="470" y="155" width="36" height="84" rx="7" fill={gradientEnd} />

          {/* body */}
          <path d="M283 268 L546 262 L550 418 Q551 446 523 447 L313 456 Q288 457 287 430 Z" fill={`url(#${gradientId}-body)`} />

          {/* roof */}
          <path d="M252 270 L398 112 Q404 105 410 112 L571 255 Q576 262 568 263 L256 278 Q245 279 252 270 Z" fill={`url(#${gradientId}-roof)`} />

          {/* face */}
          {mood === 'excited' ? (
            <>
              <path d="M340 334 q12 -15 24 0" fill="none" stroke={faceColor} strokeWidth="7" strokeLinecap="round" />
              <path d="M466 327 q12 -15 24 0" fill="none" stroke={faceColor} strokeWidth="7" strokeLinecap="round" />
            </>
          ) : mood === 'wink' ? (
            <>
              <ellipse cx="352" cy="333" rx="12" ry="16" fill={faceColor} />
              <circle cx="348.5" cy="324" r="3.4" fill="#FFFFFF" />
              <path d="M466 330 q12 -12 24 0" fill="none" stroke={faceColor} strokeWidth="7" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse cx="352" cy="333" rx="12" ry="16" fill={faceColor} />
              <ellipse cx="478" cy="326" rx="12" ry="16" fill={faceColor} />
              <circle cx="348.5" cy="324" r="3.4" fill="#FFFFFF" />
              <circle cx="474.5" cy="317" r="3.4" fill="#FFFFFF" />
            </>
          )}
          <ellipse cx="334" cy="367" rx={mood === 'proud' ? 19 : 16} ry={mood === 'proud' ? 9 : 7.5} fill={blushColor} />
          <ellipse cx="502" cy="358" rx={mood === 'proud' ? 19 : 16} ry={mood === 'proud' ? 9 : 7.5} fill={blushColor} />
          {mood === 'excited' ? (
            <path d="M393 352 Q392 348 397 348 L437 347 Q442 347 441 351 Q438 388 417 388 Q396 388 393 352 Z" fill={faceColor} />
          ) : mood === 'proud' || mood === 'wink' ? (
            <path d="M398 357 Q417 378 437 355" fill="none" stroke={faceColor} strokeWidth="7" strokeLinecap="round" />
          ) : (
            <path d="M396 355 Q395 352 399 352 L435 351 Q439 351 438 354 Q436 378 417 378 Q398 378 396 355 Z" fill={faceColor} />
          )}
        </g>
      </svg>
    </div>
  )
}
