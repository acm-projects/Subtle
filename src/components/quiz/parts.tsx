'use client'

import { useState } from 'react'
import Icon from './icons'

const card = (selected: boolean) =>
  selected ? 'border-[#1E2B44] bg-white shadow-[0_14px_30px_-20px_rgba(30,43,68,0.6)]' : 'border-[#D5DFEA] bg-white/60 hover:bg-white'
const dot = (selected: boolean) => (selected ? 'bg-[#1E2B44] text-white' : 'bg-[#EEF3F8] text-[#2F4161]')

export function OptionRow({
  selected,
  onClick,
  icon,
  title,
  body,
  multi,
}: {
  selected: boolean
  onClick: () => void
  icon?: string
  title: string
  body: string
  multi?: boolean
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-[20px] border px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${card(selected)}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${dot(selected)}`}>
        {selected ? <Icon name="check" size={18} /> : <Icon name={icon ?? 'circle'} size={20} />}
      </span>
      <span className="leading-snug">
        <strong className="block text-[17px] font-semibold">{title}</strong>
        <span className="text-sm text-[#4A5A75]">{body}</span>
      </span>
    </button>
  )
}

export function OptionTile({
  selected,
  onClick,
  icon,
  title,
  body,
  multi,
  compact,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  title: string
  body: string
  multi?: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      className={`flex rounded-[22px] border transition-all duration-200 hover:-translate-y-1 ${
        compact ? 'flex-row items-center gap-3 p-3.5 text-left' : 'flex-col items-center p-5 text-center'
      } ${card(selected)}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${compact ? 'h-10 w-10' : 'h-12 w-12'} ${dot(selected)}`}>
        <Icon name={icon} size={compact ? 18 : 22} />
      </span>
      <span className={compact ? 'leading-tight' : 'mt-3 leading-snug'}>
        <strong className={`block font-semibold ${compact ? 'text-[15px]' : 'text-[17px]'}`}>{title}</strong>
        <span className={`text-[#4A5A75] ${compact ? 'text-xs' : 'text-[13px]'}`}>{body}</span>
      </span>
    </button>
  )
}

export function Field({
  id,
  label,
  icon,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  icon: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-[0.1em]">
          {label}
        </label>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A35F33]">Required</span>
      </div>
      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#D5DFEA] bg-white px-4 transition focus-within:border-[#2F4161] focus-within:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]">
        <span className="text-[#4A5A75]">
          <Icon name={icon} size={18} />
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8A97AB]"
        />
      </div>
    </div>
  )
}

// Right-side visual. Tries /images/quiz/<step>.jpg; if missing, shows a soft illustrated panel.
export function SidePanel({ step, tag, icon, title, caption }: { step: string; tag: string; icon: string; title: string; caption: string }) {
  const [broken, setBroken] = useState<Record<string, boolean>>({})
  const hasPhoto = !broken[step]

  return (
    <div className="relative hidden min-h-[600px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#A9C7E8] via-[#C9DBEA] to-[#F3E3D2] md:block">
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={step}
          src={`/images/quiz/${step}.jpg`}
          alt=""
          onError={() => setBroken((b) => ({ ...b, [step]: true }))}
          className="absolute inset-0 h-full w-full animate-[fadeIn_.6s_ease-out] object-cover"
        />
      ) : (
        <div key={step} aria-hidden="true" className="absolute inset-0 animate-[fadeIn_.6s_ease-out]">
          <div className="absolute right-12 top-16 h-16 w-16 rounded-full bg-[#FBF3EA] shadow-[0_0_60px_rgba(251,243,234,0.9)]" />
          <div className="absolute -left-8 top-28 h-10 w-44 rounded-full bg-white/60 blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-[#8FA6BF]/50 [clip-path:ellipse(70%_60%_at_25%_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[#2F4161]/20 [clip-path:ellipse(60%_70%_at_85%_100%)]" />
          <div className="absolute left-1/2 top-[44%] flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white/60 text-[#1E2B44] shadow-[0_30px_60px_-30px_rgba(30,43,68,0.6)] backdrop-blur-xl">
            <Icon name={icon} size={44} />
          </div>
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1E2B44]/35 to-transparent" />

      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#1E2B44] backdrop-blur">
        <Icon name={icon} size={13} />
        {tag}
      </span>
      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-[18px] border border-white bg-white/85 px-4 py-3.5 text-[#1E2B44] backdrop-blur-xl">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1E2B44] text-white">
          <Icon name={icon} size={18} />
        </span>
        <span key={title + caption} className="animate-[fadeIn_.4s_ease-out] leading-snug">
          <strong className="block text-[15px]">{title}</strong>
          <span className="text-[13px] text-[#4A5A75]">{caption}</span>
        </span>
      </div>
    </div>
  )
}
