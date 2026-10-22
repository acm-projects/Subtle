'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppNavbar from '../AppNavbar'
import Icon from '../quiz/icons'
import PhotoPicker, { type Photo } from './PhotoPicker'
import { EMPTY_LISTING, HOME_TYPES, INCLUDED, missingFields, ROOM_TYPES, shortDate, type NewListing } from './options'

import { supabase } from '../../lib/supabase'
import { createListing, type Listing as DbListing } from '../../lib/listings'
import type { User } from '@supabase/supabase-js'

const DRAFT_KEY = 'subtle-post-draft'
const card = 'rounded-[32px] border border-white bg-white/65 p-6 shadow-[0_30px_70px_-40px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-8'
const input =
  'min-h-12 w-full rounded-2xl border border-[#D5DFEA] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#5F6E84] focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]'
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.1em]'

function Chips({ name, options, selected, onToggle, multi }: { name: string; options: string[]; selected: string[]; onToggle: (o: string) => void; multi?: boolean }) {
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <button
            key={o}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            onClick={() => onToggle(o)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition hover:-translate-y-0.5 ${
              on ? 'border-[#1E2B44] bg-[#1E2B44] text-white' : 'border-[#D5DFEA] bg-white hover:border-[#A9C7E8]'
            }`}
          >
            {on && multi && <Icon name="check" size={14} />}
            {o}
          </button>
        )
      })}
    </div>
  )
}

export default function PostListing() {
  const [listing, setListing] = useState<NewListing>(EMPTY_LISTING)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tried, setTried] = useState(false)
  const [status, setStatus] = useState<'idle' | 'posting' | 'posted'>('idle')
  const [toast, setToast] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [firstName, setFirstName] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [backendError, setBackendError] = useState('')
  const [createdListing, setCreatedListing] = useState<DbListing | null>(null)

  const set = <K extends keyof NewListing>(key: K, value: NewListing[K]) => setListing((l) => ({ ...l, [key]: value }))
  const missing = missingFields(listing, photos.length)

  // Listen for user auth session
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setCheckingAuth(false)
      if (user) {
        const meta = user.user_metadata ?? {}
        const name = (meta.first_name ?? meta.firstName ?? '') as string
        setFirstName(name.trim())
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const meta = session.user.user_metadata ?? {}
        const name = (meta.first_name ?? meta.firstName ?? '') as string
        setFirstName(name.trim())
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // restore a saved draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) setListing({ ...EMPTY_LISTING, ...JSON.parse(raw) })
    } catch {}
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(listing))
      setToast('Draft saved. Photos are not saved in drafts yet.')
    } catch {
      setToast("Couldn't save the draft in this browser.")
    }
  }

  // Upload photos and insert listing into Supabase listing_table
  const postListing = async () => {
    setTried(true)
    setBackendError('')

    if (missing.length) {
      requestAnimationFrame(() => document.getElementById('post-errors')?.focus())
      return
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      // Save draft so student doesn't lose inputs
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(listing))
      } catch {}
      setBackendError('You must be logged in to post a listing. Your draft has been saved.')
      requestAnimationFrame(() => document.getElementById('post-errors')?.focus())
      return
    }

    setStatus('posting')

    try {
      // Parse city & neighborhood from address if formatted with commas
      const addrParts = listing.address.split(',').map((s) => s.trim()).filter(Boolean)
      const neighborhood = addrParts[0] || null
      const city = addrParts.length > 1 ? addrParts[1] : null

      const files = photos.map((p) => p.file)
      const payload = {
        title: listing.title.trim(),
        building_type: listing.homeType || 'Apartment',
        beds: 1, // standard 1-bedroom default for student sublets
        baths: 1,
        monthly_rent: listing.rent ? Number(listing.rent) : null,
        address: listing.address.trim(),
        neighborhood,
        city,
        start_date: listing.availableFrom || null,
        end_date: listing.availableTo || null,
        room_type: listing.roomType,
        amenities: listing.included,
        company_tags: [listing.roomType],
        about: listing.about.trim() || null,
      }

      const created = await createListing(payload, files)
      setCreatedListing(created)
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {}
      setStatus('posted')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      console.error('Failed to post listing:', err)
      setBackendError(err.message || 'Something went wrong while posting your place.')
      setStatus('idle')
      requestAnimationFrame(() => document.getElementById('post-errors')?.focus())
    }
  }

  const subtitle = `${listing.roomType} in ${/^[AEIOU]/i.test(listing.homeType) ? 'an' : 'a'} ${listing.homeType.toLowerCase()}`
  const cover = photos[0]?.url

  const preview = (
    <div className="rounded-[28px] border border-white bg-white/80 p-3 shadow-[0_30px_60px_-36px_rgba(30,43,68,0.45)] backdrop-blur-xl">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-gradient-to-b from-[#C9DBEA] to-[#F3E6DA]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="Cover photo preview" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute right-[18%] top-[14%] h-14 w-14 rounded-full bg-[#F3C9A0]/80 animate-glow" />
            <div className="absolute bottom-0 left-[10%] h-[48%] w-[24%] rounded-t-lg bg-[#A9C7E8]" />
            <div className="absolute bottom-0 left-[36%] h-[70%] w-[26%] rounded-t-lg bg-[#2F4161]">
              <div className="mx-auto mt-[18%] grid w-[60%] grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((k) => (
                  <span key={k} className="aspect-square rounded-sm bg-[#FBF3EA]/90" />
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 right-[10%] h-[40%] w-[24%] rounded-t-lg bg-[#E4EAF1]" />
            <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-[#1E2B44]">Your cover photo shows here</p>
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-[#1E2B44] px-3 py-1 text-xs font-bold text-white">New</span>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-serif)] text-2xl font-medium">{listing.title.trim() || 'Your place'}</p>
            <p className="text-sm text-[#4A5A75]">{subtitle}</p>
          </div>
          <p className="shrink-0 font-[family-name:var(--font-serif)] text-2xl">
            {listing.rent ? `$${Number(listing.rent).toLocaleString()}` : '$—'}
            <span className="font-[family-name:var(--font-body)] text-sm text-[#4A5A75]">/mo</span>
          </p>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
          {[listing.availableFrom && `From ${shortDate(listing.availableFrom)}`, listing.address.trim() && listing.address.split(',')[0], ...listing.included.slice(0, 3)]
            .filter(Boolean)
            .map((t) => (
              <li key={t as string} className="rounded-full border border-[#D5DFEA] bg-white px-2.5 py-1">
                {t}
              </li>
            ))}
        </ul>
      </div>
    </div>
  )

  if (status === 'posted') {
    return (
      <>
        <AppNavbar firstName={firstName} />
        <section className="flex min-h-screen items-center justify-center px-4 pb-16 pt-28">
          <div className={`${card} w-full max-w-2xl animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] text-center`} role="status">
            <span aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1E2B44] text-white">
              <Icon name="check" size={28} />
            </span>
            <h1 className="mt-5 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em]">Your place is posted.</h1>
            <p className="mt-3 text-[17px] text-[#4A5A75]">Your listing has been saved to Subtle! Interns whose preferences match your home will see it.</p>
            <div className="mx-auto mt-6 max-w-sm text-left">{preview}</div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/home" className="flex min-h-12 items-center justify-center rounded-full border border-[#D5DFEA] bg-white font-semibold transition hover:-translate-y-0.5">
                Back to home
              </Link>
              <Link href="/matches" className="flex min-h-12 items-center justify-center rounded-full bg-[#1E2B44] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161]">
                Browse matches
              </Link>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  photos.forEach((p) => URL.revokeObjectURL(p.url))
                  setPhotos([])
                  setListing(EMPTY_LISTING)
                  setTried(false)
                  setStatus('idle')
                  setBackendError('')
                  setCreatedListing(null)
                }}
                className="text-sm font-semibold text-[#4A5A75] underline underline-offset-4 hover:text-[#1E2B44]"
              >
                + Post another place
              </button>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <AppNavbar firstName={firstName} />
      <section className="px-4 pb-16 pt-32 md:px-8">
        <div className="mx-auto w-full max-w-[1240px]">
          <header className="animate-[fadeIn_.5s_ease-out]">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">For sub-leasers</p>
            <h1 className="mt-2 font-[family-name:var(--font-serif)] text-5xl font-medium tracking-[-0.02em] md:text-7xl">Post your place.</h1>
            <p className="mt-2 font-[family-name:var(--font-serif)] text-2xl italic text-[#2F4161]">Find a subletter who actually fits.</p>

            {!user && !checkingAuth && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white bg-white/70 px-5 py-3 text-sm shadow-sm backdrop-blur-md">
                <span className="text-[#4A5A75]">
                  You are browsing as a guest. Your work is saved as a draft, but you&apos;ll need to log in to publish.
                </span>
                <div className="flex gap-2">
                  <Link href="/login?mode=login" className="rounded-full bg-[#1E2B44] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2F4161]">
                    Log in
                  </Link>
                  <Link href="/login?mode=signup" className="rounded-full border border-[#D5DFEA] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1E2B44] hover:border-[#1E2B44]">
                    Sign up
                  </Link>
                </div>
              </div>
            )}
          </header>

          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* form */}
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                postListing()
              }}
              className="flex flex-col gap-6"
            >
              <section aria-labelledby="basics" className={`${card} animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both]`}>
                <h2 id="basics" className="font-[family-name:var(--font-serif)] text-3xl font-medium">The basics</h2>
                <label htmlFor="post-title" className={`${label} mt-5`}>
                  Title
                </label>
                <input id="post-title" className={input} value={listing.title} onChange={(e) => set('title', e.target.value)} placeholder="Sunny private room near the office" maxLength={70} />
                <p className={`${label} mt-6`}>Photos</p>
                <PhotoPicker photos={photos} onChange={setPhotos} />
              </section>

              <section aria-labelledby="where" className={`${card} animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] [animation-delay:80ms]`}>
                <h2 id="where" className="font-[family-name:var(--font-serif)] text-3xl font-medium">Where and when</h2>
                <label htmlFor="post-address" className={`${label} mt-5`}>
                  Address
                </label>
                <input id="post-address" className={input} value={listing.address} onChange={(e) => set('address', e.target.value)} placeholder="123 Sunset Blvd, Los Angeles, CA" autoComplete="street-address" />
                <p className="mt-1.5 text-xs text-[#4A5A75]">Only the neighborhood is shown until you accept a request.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="post-rent" className={label}>
                      Monthly rent
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-[#4A5A75]">$</span>
                      <input
                        id="post-rent"
                        inputMode="numeric"
                        className={`${input} pl-8`}
                        value={listing.rent}
                        onChange={(e) => set('rent', e.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="950"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="post-from" className={label}>
                      Move-in
                    </label>
                    <input id="post-from" type="date" className={input} value={listing.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="post-to" className={label}>
                      Move-out <span className="font-medium normal-case tracking-normal text-[#4A5A75]">(optional)</span>
                    </label>
                    <input id="post-to" type="date" min={listing.availableFrom || undefined} className={input} value={listing.availableTo} onChange={(e) => set('availableTo', e.target.value)} />
                  </div>
                </div>
              </section>

              <section aria-labelledby="home" className={`${card} animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] [animation-delay:160ms]`}>
                <h2 id="home" className="font-[family-name:var(--font-serif)] text-3xl font-medium">The home</h2>
                <p className={`${label} mt-5`}>Home type</p>
                <Chips name="Home type" options={HOME_TYPES} selected={[listing.homeType]} onToggle={(o) => set('homeType', o)} />
                <p className={`${label} mt-5`}>Private or shared</p>
                <Chips name="Private or shared" options={ROOM_TYPES} selected={[listing.roomType]} onToggle={(o) => set('roomType', o)} />
                <p className={`${label} mt-5`}>What&apos;s included</p>
                <Chips
                  name="What's included"
                  multi
                  options={INCLUDED}
                  selected={listing.included}
                  onToggle={(o) => set('included', listing.included.includes(o) ? listing.included.filter((x) => x !== o) : [...listing.included, o])}
                />
              </section>

              <section aria-labelledby="about" className={`${card} animate-[popIn_.45s_cubic-bezier(.2,.8,.3,1.05)_both] [animation-delay:240ms]`}>
                <h2 id="about" className="font-[family-name:var(--font-serif)] text-3xl font-medium">About</h2>
                <label htmlFor="post-about" className="sr-only">
                  About your place
                </label>
                <textarea
                  id="post-about"
                  rows={5}
                  maxLength={800}
                  value={listing.about}
                  onChange={(e) => set('about', e.target.value)}
                  placeholder="Describe the room, the vibe, and who you are looking for."
                  className="mt-5 w-full resize-none rounded-2xl border border-[#D5DFEA] bg-white p-4 text-[15px] leading-relaxed outline-none placeholder:text-[#5F6E84] focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]"
                />
                <p className="mt-1 text-right text-xs text-[#4A5A75]">{listing.about.length} / 800</p>
              </section>

              {tried && (missing.length > 0 || backendError) && (
                <div id="post-errors" tabIndex={-1} role="alert" className="rounded-[24px] border border-[#E9C4A6] bg-[#FBF3EA] p-5 text-[15px] outline-none">
                  {missing.length > 0 && (
                    <p className="font-semibold">Almost there. Please add {missing.join(', ')}.</p>
                  )}
                  {backendError && (
                    <div className={missing.length > 0 ? 'mt-3 border-t border-[#E9C4A6]/60 pt-3' : ''}>
                      <p className="font-semibold text-[#9B2C1F]">{backendError}</p>
                      {!user && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href="/login?mode=login" className="inline-flex items-center rounded-full bg-[#1E2B44] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2F4161]">
                            Log in to subtle.
                          </Link>
                          <Link href="/login?mode=signup" className="inline-flex items-center rounded-full border border-[#1E2B44] bg-white px-4 py-2 text-xs font-semibold text-[#1E2B44] transition hover:bg-[#FBF3EA]">
                            Sign up with .edu
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={saveDraft} className="min-h-12 rounded-full border border-[#D5DFEA] bg-white px-7 font-semibold transition hover:-translate-y-0.5">
                  Save draft
                </button>
                <button
                  type="submit"
                  disabled={status === 'posting'}
                  className="min-h-12 rounded-full bg-[#1E2B44] px-8 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2F4161] disabled:opacity-60"
                >
                  {status === 'posting' ? 'Posting…' : 'Post listing'}
                </button>
              </div>
            </form>

            {/* live preview */}
            <aside aria-label="Live preview" className="lg:sticky lg:top-28">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#4A5A75]">Live preview</p>
              {preview}
              <p className="mt-3 text-sm text-[#4A5A75]">This is how interns will see your place in their matches.</p>
            </aside>
          </div>
        </div>
        <p className="mt-12 text-center text-[13px] text-[#4A5A75]">&copy; 2026 Subtle Technologies, Inc. All rights reserved.</p>
      </section>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <p role="status" className="animate-[popIn_.25s_ease-out] rounded-full bg-[#1E2B44] px-5 py-3 text-sm font-semibold text-white shadow-lg">
            {toast}
          </p>
        </div>
      )}
    </>
  )
}
