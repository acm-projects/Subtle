'use client'

import { useRef, useState } from 'react'
import { MAX_PHOTOS } from './options'

export type Photo = { id: string; file: File; url: string }

// Drag-and-drop photo picker. First photo is the cover; drag tiles (or use "Make cover") to reorder.
export default function PhotoPicker({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const add = (files: FileList | null) => {
    if (!files) return
    const images = Array.from(files).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type))
    const room = MAX_PHOTOS - photos.length
    const next = images.slice(0, room).map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url: URL.createObjectURL(file) }))
    setNote(images.length > room ? `Only ${MAX_PHOTOS} photos fit, so we kept the first ${room}.` : images.length < files.length ? 'Some files were skipped. Use JPG, PNG or WebP.' : '')
    onChange([...photos, ...next])
  }

  const remove = (id: string) => {
    const p = photos.find((x) => x.id === id)
    if (p) URL.revokeObjectURL(p.url)
    onChange(photos.filter((x) => x.id !== id))
  }

  const move = (id: string, to: number) => {
    const from = photos.findIndex((x) => x.id === id)
    if (from < 0 || from === to) return
    const next = [...photos]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (dragId) return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (dragId) return
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
        className={`flex flex-col items-center rounded-[24px] border-2 border-dashed px-6 py-10 text-center transition ${
          over ? 'border-[#2F4161] bg-[#EEF3F8]' : 'border-[#C9DBEA] bg-white/50'
        }`}
      >
        <span aria-hidden="true" className="flex h-14 w-14 animate-bob items-center justify-center rounded-full bg-[#EEF3F8]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
          </svg>
        </span>
        <p className="mt-4 font-[family-name:var(--font-serif)] text-2xl font-medium">Drag photos here</p>
        <p className="mt-1 text-sm text-[#4A5A75]">or pick them from a device. JPG or PNG, up to {MAX_PHOTOS} photos.</p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
          className="mt-5 min-h-11 rounded-full bg-[#1E2B44] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] disabled:opacity-40"
        >
          Browse photos
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          aria-label="Choose photos"
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {note && (
        <p role="status" className="mt-2 text-sm text-[#A35F33]">
          {note}
        </p>
      )}

      {photos.length > 0 && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p, i) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => setDragId(p.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragId) move(dragId, i)
                  setDragId(null)
                }}
                className={`group relative aspect-square animate-[popIn_.3s_ease-out] cursor-grab overflow-hidden rounded-[20px] bg-[#EAF1F8] ${dragId === p.id ? 'opacity-50' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo ${i + 1}${i === 0 ? ' (cover)' : ''}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#1E2B44] px-2.5 py-1 text-[11px] font-bold text-white">Cover</span>}
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1E2B44] shadow transition hover:bg-white"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => move(p.id, 0)}
                    className="absolute inset-x-2 bottom-2 min-h-9 rounded-full bg-white/90 text-xs font-semibold text-[#1E2B44] opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                  >
                    Make cover
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-[#4A5A75]">
            {photos.length} of {MAX_PHOTOS} · The first photo is the cover. Drag to reorder.
          </p>
        </>
      )}
    </div>
  )
}
