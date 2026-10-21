'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'

/*
  Subtle's house mascot (design from the team's Framer component).
  Same shapes and timing, rebuilt with plain CSS animation so it needs no extra packages.
  - bobs, sways and swings its arms on a loop (speed 1 = one bob every 1.6s)
  - pauses while it's off screen, and stays still for people who turn on "reduce motion"
*/
type Props = {
  gradientStart?: string
  gradientEnd?: string
  faceColor?: string
  shadowColor?: string
  animate?: boolean
  speed?: number
  label?: string
  className?: string
  style?: CSSProperties
}

export default function HouseMascot({
  gradientStart = '#B9D6F0',
  gradientEnd = '#F4E2CD',
  faceColor = '#405367',
  shadowColor = '#7D91A3',
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
  const fill = `url(#${gradientId})`

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
    <div ref={ref} role="img" aria-label={label} className={`house-mascot relative flex items-center justify-center ${className}`} style={style}>
      <svg width="100%" height="100%" viewBox="0 0 420 470" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>

        <ellipse cx="210" cy="436" rx="118" ry="24" fill={shadowColor} opacity={0.22} style={{ transformOrigin: '210px 436px', ...loop('houseShadow') }} />

        <g style={{ transformOrigin: '210px 216px', ...loop('houseBob') }}>
          <g style={{ transformOrigin: '93px 220px', transform: 'rotate(10deg)', ...loop('houseArmL') }}>
            <rect x="66" y="212" width="28" height="116" rx="14" fill={fill} />
          </g>
          <g style={{ transformOrigin: '327px 220px', transform: 'rotate(-8deg)', ...loop('houseArmR') }}>
            <rect x="326" y="212" width="28" height="116" rx="14" fill={fill} />
          </g>

          {/* chimney */}
          <rect x="302" y="58" width="32" height="66" rx="8" fill={faceColor} />
          <rect x="296" y="52" width="44" height="18" rx="9" fill={faceColor} />

          {/* roof + body */}
          <path d="M55 155 Q210 8 365 155 L365 172 L55 172 Z" fill={fill} />
          <rect x="90" y="140" width="240" height="184" rx="52" fill={fill} />

          {/* face */}
          <ellipse cx="124" cy="196" rx="12" ry="15" fill={faceColor} />
          <ellipse cx="238" cy="196" rx="12" ry="15" fill={faceColor} />
          <circle cx="127" cy="191" r="3.1" fill="#FFFFFF" />
          <circle cx="241" cy="191" r="3.1" fill="#FFFFFF" />
          <ellipse cx="154" cy="241" rx="17" ry="11" fill="#F2E6D6" />
          <ellipse cx="266" cy="241" rx="17" ry="11" fill="#F2E6D6" />
          <path d="M160 232 Q210 276 260 232" fill="none" stroke={faceColor} strokeWidth="6" strokeLinecap="round" />

          {/* legs + feet */}
          <rect x="154" y="316" width="30" height="80" rx="15" fill={fill} />
          <rect x="236" y="316" width="30" height="80" rx="15" fill={fill} />
          <ellipse cx="168" cy="395" rx="34" ry="16" fill="#80A9D6" />
          <ellipse cx="252" cy="395" rx="34" ry="16" fill="#80A9D6" />
        </g>
      </svg>
    </div>
  )
}
