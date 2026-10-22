// app/api/listings/route.ts
import { NextResponse } from 'next/server'
import { getAuthedClient } from '../../../lib/supabase-server'

const MAX_PHOTOS = 10

// '' (unanswered) -> null so integer and date columns don't reject it
const orNull = (v: unknown) =>
    typeof v === 'string' && v.trim() !== '' ? v.trim() : null

const toInt = (v: unknown) => {
    if (typeof v === 'number') return Math.round(v)
    const m = typeof v === 'string' ? v.replace(/,/g, '').match(/\d+/) : null
    return m ? parseInt(m[0], 10) : null
}

const toStringArray = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []

// GET /api/listings?city=Austin&maxRent=1500
export async function GET(request: Request) {
    const auth = await getAuthedClient(request)
    if (!auth) {
        return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }
    const { supabase } = auth

    const { searchParams } = new URL(request.url)

    let query = supabase
        .from('listing_table')
        .select('*')
        .order('created_at', { ascending: false })

    const city = searchParams.get('city')
    if (city) query = query.eq('city', city)

    const maxRent = toInt(searchParams.get('maxRent'))
    if (maxRent !== null) query = query.lte('monthly_rent', maxRent)

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
}

// POST /api/listings
export async function POST(request: Request) {
    const auth = await getAuthedClient(request)
    if (!auth) {
        return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }
    const { supabase } = auth

    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!body.title || !body.address || !body.rent || !body.availableFrom || !body.homeType) {
        return NextResponse.json(
            { error: 'Title, address, rent, move-in date, and home type required' },
            { status: 400 }
        )
    }

    const monthlyRent = toInt(body.rent)
    if (monthlyRent === null || monthlyRent <= 0) {
        return NextResponse.json({ error: 'Invalid monthly rent' }, { status: 400 })
    }

    const startDate = orNull(body.availableFrom)
    const endDate = orNull(body.availableTo)
    if (startDate && endDate && endDate <= startDate) {
        return NextResponse.json(
            { error: 'Move-out date must be after move-in date' },
            { status: 400 }
        )
    }

    const imageUrls = toStringArray(body.imageUrls)
    if (imageUrls.length === 0) {
        return NextResponse.json({ error: 'At least one photo required' }, { status: 400 })
    }
    if (imageUrls.length > MAX_PHOTOS) {
        return NextResponse.json(
            { error: `No more than ${MAX_PHOTOS} photos` },
            { status: 400 }
        )
    }

    // user_id is left out on purpose: the column default (auth.uid()) fills it in
    const row = {
        title: orNull(body.title),
        address: orNull(body.address),
        city: orNull(body.city),
        neighborhood: orNull(body.neighborhood),
        building_type: orNull(body.homeType),
        room_type: orNull(body.roomType),
        monthly_rent: monthlyRent,
        move_in: startDate,
        end_date: endDate,
        amenities: toStringArray(body.included),
        about: orNull(body.about),
        image_urls: imageUrls,
    }

    const { data, error } = await supabase
        .from('listing_table')
        .insert(row)
        .select()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
}