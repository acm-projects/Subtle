'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppNavbar from '../../../../components/AppNavbar'
import Icon from '../../../../components/quiz/icons'
import { HOME_TYPES, INCLUDED, ROOM_TYPES, type NewListing } from '../../../../components/post/options'
import { supabase } from '../../../../lib/supabase'

const card = 'rounded-[32px] border border-white bg-white/70 p-6 shadow-[0_30px_70px_-40px_rgba(30,43,68,0.35)] backdrop-blur-xl md:p-8'
const input =
  'min-h-12 w-full rounded-2xl border border-[#D5DFEA] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#5F6E84] focus:border-[#2F4161] focus:shadow-[0_0_0_4px_rgba(169,199,232,0.45)]'
const label = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.1em]'

function Chips({
  name,
  options,
  selected,
  onToggle,
  multi,
}: {
  name: string
  options: string[]
  selected: string[]
  onToggle: (o: string) => void
  multi?: boolean
}) {
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

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = (params?.id as string) ?? ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [firstName, setFirstName] = useState('')

  const [title, setTitle] = useState('')
  const [homeType, setHomeType] = useState('Apartment')
  const [roomType, setRoomType] = useState('Private room')
  const [rent, setRent] = useState('')
  const [address, setAddress] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [included, setIncluded] = useState<string[]>([])
  const [about, setAbout] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      setFirstName(meta?.first_name ?? data.user?.email?.split('@')[0] ?? '')
    })
  }, [])

  useEffect(() => {
    if (!listingId) return
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}`, { headers })
        if (!res.ok) {
          throw new Error(`Listing not found or could not be loaded.`)
        }
        const json = await res.json()
        const l = json.listing || json.matchView
        if (!l) throw new Error('Listing details not found.')

        if (active) {
          setTitle(l.title ?? '')
          setHomeType(l.building_type ?? l.homeType ?? 'Apartment')
          setRoomType(l.room_type ?? l.roomType ?? 'Private room')
          setRent(l.monthly_rent != null ? String(l.monthly_rent) : l.price != null ? String(l.price) : '')
          setAddress(l.address ?? l.neighborhood ?? '')
          setAvailableFrom(l.start_date ?? l.move_in ?? l.availableFrom ?? '')
          setAvailableTo(l.end_date ?? l.availableTo ?? '')
          setIncluded(Array.isArray(l.amenities) ? l.amenities : Array.isArray(l.included) ? l.included : [])
          setAbout(l.about ?? l.description ?? '')
          setIsActive(l.is_active !== false)
          setLoading(false)
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Could not load listing.')
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [listingId])

  const toggleIncluded = (item: string) => {
    setIncluded((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!rent || isNaN(Number(rent))) {
      setError('Please provide a valid monthly rent amount.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const addrParts = address.split(',').map((s) => s.trim()).filter(Boolean)
      const neighborhood = addrParts[0] || null
      const city = addrParts.length > 1 ? addrParts[1] : null

      const patchBody: Record<string, any> = {
        title: title.trim(),
        building_type: homeType,
        room_type: roomType,
        monthly_rent: Number(rent),
        address: address.trim(),
        neighborhood,
        city,
        move_in: availableFrom || null,
        end_date: availableTo || null,
        amenities: included,
        company_tags: [roomType],
        about: about.trim() || null,
        is_active: isActive,
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patchBody),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to update listing.')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/my-listings')
      }, 1200)
    } catch (err: any) {
      setError(err.message || 'Error saving changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return

    setDeleting(true)
    setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to delete listing.')
      }

      router.push('/my-listings')
    } catch (err: any) {
      setError(err.message || 'Error deleting listing.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <AppNavbar firstName={firstName} />
        <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 pt-28">
          <p className="text-[#4A5A75]">Loading listing details…</p>
        </main>
      </>
    )
  }

  return (
    <>
      <AppNavbar firstName={firstName} />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-28">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/my-listings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#4A5A75] hover:text-[#1E2B44]"
            >
              &larr; Back to your listings
            </Link>
            <h1 className="mt-2 font-[family-name:var(--font-serif)] text-4xl font-medium tracking-tight">
              Edit your place
            </h1>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete listing'}
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            ✓ Changes saved! Redirecting to your listings dashboard…
          </div>
        )}

        <form onSubmit={handleSave} className={`${card} space-y-6`}>
          {/* Status Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-[#D5DFEA] bg-white/60 p-4">
            <div>
              <p className="font-semibold text-[#1E2B44]">Listing status</p>
              <p className="text-xs text-[#4A5A75]">
                {isActive ? 'Visible to students searching for housing' : 'Paused and hidden from matches'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`inline-flex min-h-9 items-center rounded-full px-4 text-xs font-bold transition ${
                isActive ? 'bg-[#E3F1E8] text-[#2E6B45]' : 'bg-[#EEF3F8] text-[#4A5A75]'
              }`}
            >
              {isActive ? 'Active (Live)' : 'Paused'}
            </button>
          </div>

          {/* Title */}
          <div>
            <label className={label} htmlFor="title">
              Listing title
            </label>
            <input
              id="title"
              type="text"
              className={input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunny 1BR near Culver City Metro"
            />
          </div>

          {/* Home Type */}
          <div>
            <span className={label}>Home type</span>
            <Chips
              name="Home type"
              options={HOME_TYPES}
              selected={[homeType]}
              onToggle={(t) => setHomeType(t)}
            />
          </div>

          {/* Room Type */}
          <div>
            <span className={label}>Room type</span>
            <Chips
              name="Room type"
              options={ROOM_TYPES}
              selected={[roomType]}
              onToggle={(t) => setRoomType(t)}
            />
          </div>

          {/* Monthly Rent */}
          <div>
            <label className={label} htmlFor="rent">
              Monthly rent ($ USD)
            </label>
            <input
              id="rent"
              type="number"
              className={input}
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="e.g. 1850"
            />
          </div>

          {/* Address */}
          <div>
            <label className={label} htmlFor="address">
              Address / Neighborhood
            </label>
            <input
              id="address"
              type="text"
              className={input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Culver City, CA or 3850 Cardiff Ave"
            />
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="availableFrom">
                Available from
              </label>
              <input
                id="availableFrom"
                type="date"
                className={input}
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="availableTo">
                Available to
              </label>
              <input
                id="availableTo"
                type="date"
                className={input}
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
              />
            </div>
          </div>

          {/* Included Amenities */}
          <div>
            <span className={label}>Included amenities</span>
            <Chips
              name="Included amenities"
              options={INCLUDED}
              selected={included}
              onToggle={toggleIncluded}
              multi
            />
          </div>

          {/* About / Description */}
          <div>
            <label className={label} htmlFor="about">
              About the place
            </label>
            <textarea
              id="about"
              rows={4}
              className={`${input} min-h-28 py-3`}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell prospective interns about the neighborhood, light, vibe, or noise level…"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/my-listings"
              className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#D5DFEA] bg-white text-sm font-semibold transition hover:bg-[#F7F9FB]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#1E2B44] text-sm font-semibold text-white transition hover:bg-[#2F4161] disabled:opacity-50"
            >
              {saving ? 'Saving changes…' : 'Save changes'}
            </button>
          </div>
        </form>
      </main>
    </>
  )
}
