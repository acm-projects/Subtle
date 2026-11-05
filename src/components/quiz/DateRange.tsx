'use client'

import { useMemo, useState } from 'react'
import Icon from './icons'
import { prettyDate } from './options'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Pick move-in and move-out days on a calendar: first tap = move-in, second tap = move-out.
export default function DateRange({
  start,
  end,
  onChange,
}: {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}) {
  const today = useMemo(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }, [])
  // open on the chosen month, otherwise on next summer's May
  const [view, setView] = useState(() => {
    if (start) {
      const [y, m] = start.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    const y = today.getMonth() >= 7 ? today.getFullYear() + 1 : today.getFullYear()
    return new Date(y, 4, 1)
  })

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    return [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))]
  }, [view])

  const pick = (d: Date) => {
    const v = iso(d)
    if (!start || (start && end) || v < start) onChange(v, '')
    else if (v === start) onChange('', '')
    else onChange(start, v)
  }

  const step = (n: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1))
  const title = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-[22px] border border-white bg-white/70 p-5">
      <div className="mb-4 grid grid-cols-2 gap-3">
        {[
          ['Move-In', start],
          ['Move-Out', end],
        ].map(([label, value]) => (
          <div key={label} className={`rounded-2xl border px-4 py-3 ${value ? 'border-[#1E2B44] bg-white' : 'border-[#D5DFEA] bg-white/60'}`}>
            <span className="block text-sm font-semibold">{label}</span>
            <span className="text-lg">{value ? prettyDate(value) : 'Pick a day'}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white">
          <Icon name="arrowL" size={18} />
        </button>
        <p className="font-[family-name:var(--font-serif)] text-xl font-medium" aria-live="polite">
          {title}
        </p>
        <button type="button" onClick={() => step(1)} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white">
          <Icon name="arrowR" size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center" role="grid" aria-label={title}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-sm font-semibold text-[#4A5A75]">
            {w}
          </span>
        ))}
        {days.map((d, i) => {
          if (!d) return <span key={`b${i}`} />
          const v = iso(d)
          const past = d < today
          const isStart = v === start
          const isEnd = v === end
          const between = start && end && v > start && v < end
          return (
            <button
              key={v}
              type="button"
              disabled={past}
              onClick={() => pick(d)}
              aria-pressed={isStart || isEnd}
              aria-label={`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${isStart ? ', move-in' : isEnd ? ', move-out' : ''}`}
              className={`h-11 rounded-xl text-[15px] font-medium transition ${
                isStart || isEnd
                  ? 'bg-[#1E2B44] text-white'
                  : between
                    ? 'bg-[#C9DBEA] text-[#1E2B44]'
                    : past
                      ? 'cursor-not-allowed text-[#4A5A75]/40'
                      : 'hover:bg-white'
              }`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      {(start || end) && (
        <button type="button" onClick={() => onChange('', '')} className="mt-3 text-sm font-semibold underline underline-offset-2 hover:text-[#A35F33]">
          Clear Dates
        </button>
      )}
    </div>
  )
}
