'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from '../quiz/icons'
import type { Listing } from './listings'

// Same score colors as the landing page map. White text stays above 4.5:1 on all of them.
export function scoreColor(score: number) {
  if (score >= 90) return '#2E7D4F'
  if (score >= 80) return '#4F7F2F'
  if (score >= 70) return '#7A6A12'
  return '#A35F33'
}

export function ScoreBadge({ score, size = 48 }: { score: number; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-[0_8px_18px_-8px_rgba(30,43,68,0.6)]"
      style={{ backgroundColor: scoreColor(score), width: size, height: size, fontSize: size * 0.34 }}
      aria-label={`Subtle score ${score} out of 100`}
    >
      {score}
    </span>
  )
}

// Drawn room used when a listing has no photo yet (public/images/listings/<id>.jpg).
const ROOM_TINTS = [
  { wall: '#EAF1F8', floor: '#E6D3BE', accent: '#2F4161', blanket: '#F3C9A0', art: '#C27A4A' },
  { wall: '#FBF3EA', floor: '#D9C3AA', accent: '#C27A4A', blanket: '#A9C7E8', art: '#2F4161' },
  { wall: '#F3E6DA', floor: '#E6D3BE', accent: '#8FA6BF', blanket: '#1E2B44', art: '#F3C9A0' },
  { wall: '#E4EDF6', floor: '#D9C3AA', accent: '#1E2B44', blanket: '#C27A4A', art: '#A9C7E8' },
]

function RoomArt({ seed }: { seed: number }) {
  const t = ROOM_TINTS[seed % ROOM_TINTS.length]
  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ background: t.wall }}>
      <div className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: t.floor }} />
      <div className="absolute left-[12%] top-[14%] h-[44%] w-[26%] rounded-t-[60px] rounded-b-md border-[5px] border-white bg-gradient-to-b from-[#C9DBEA] to-[#F3C9A0]" />
      <div className="absolute left-[25%] top-[14%] h-[44%] w-[4px] -translate-x-1/2 bg-white" />
      <div className="absolute bottom-[20%] right-[8%] h-[30%] w-[11%] rounded-t-lg" style={{ background: t.accent }} />
      <div className="absolute bottom-[20%] right-[8%] h-[13%] w-[46%] rounded-lg bg-white" />
      <div className="absolute bottom-[29%] right-[12%] h-[9%] w-[30%] rounded-lg" style={{ background: t.blanket }} />
      <div className="absolute bottom-[24%] left-[46%] h-[10%] w-[6%] rounded-b-md bg-[#C27A4A]" />
      <div className="absolute bottom-[33%] left-[44%] h-[16%] w-[10%] rounded-[50%_50%_40%_40%] bg-[#8FA6BF]" />
      <div className="absolute right-[12%] top-[14%] h-[20%] w-[14%] rounded border-[3px] border-white" style={{ background: t.art }} />
    </div>
  )
}

export function ListingPhoto({ listing, seed, className = 'min-h-[220px]' }: { listing: Listing; seed: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className={`relative overflow-hidden rounded-[22px] bg-[#EAF1F8] ${className}`}>
      {broken ? (
        <RoomArt seed={seed} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.imageUrl || `/images/listings/${listing.id}.jpg`}
          alt={`${listing.title} in ${listing.neighborhood}`}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      )}
      <span className="absolute left-3 top-3 rounded-full border border-white bg-white/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#1E2B44] backdrop-blur">
        {listing.imageUrl ? 'Verified' : 'Sample'}
      </span>
    </div>
  )
}

export const commuteText = (l: Listing) =>
  l.commuteMode === 'walk'
    ? `${l.commuteMinutes} min walk to your office`
    : l.commuteMode === 'transit'
      ? `${l.commuteMinutes} min by transit`
      : l.commuteMode === 'bike'
        ? `${l.commuteMinutes} min bike ride`
        : `${l.commuteMinutes} min drive`

export const commuteIcon = (l: Listing) =>
  l.commuteMode === 'walk' ? 'walk' : l.commuteMode === 'transit' ? 'train' : l.commuteMode === 'bike' ? 'bike' : 'car'

// Small accessible dialog (Escape closes, focus moves inside).
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button, textarea, input')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-[fadeIn_.2s_ease-out] bg-[#1E2B44]/30 backdrop-blur-sm" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-[popIn_.25s_cubic-bezier(.2,.8,.3,1.1)] rounded-[28px] border border-white bg-white/95 p-7 text-[#1E2B44] shadow-[0_40px_90px_-40px_rgba(30,43,68,0.6)] backdrop-blur-xl"
      >
        <button type="button" onClick={onClose} aria-label="Close dialog" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#EEF3F8]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  )
}

export { Icon }
